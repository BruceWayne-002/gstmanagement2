
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

type TaxBreakdown = { igst: number; cgst: number; sgst: number; cess: number };

const defaultTax: TaxBreakdown = { igst: 0, cgst: 0, sgst: 0, cess: 0 };

const CurrencyInput = ({ 
  value, 
  onChange, 
  disabled = false,
  className = ""
}: { 
  value: number; 
  onChange?: (val: number) => void; 
  disabled?: boolean;
  className?: string;
}) => {

  const [localValue, setLocalValue] = useState(value === 0 ? "" : value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {

      if (value === 0) {
        setLocalValue(""); 
        setLocalValue("0");
      } else {
       
        setLocalValue(new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value));
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    

    if (/^\d*\.?\d{0,2}$/.test(rawValue) || rawValue === "") {
      setLocalValue(rawValue);
     
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
 
    if (value === 0) {
      setLocalValue("");
    } else {
      setLocalValue(value.toString());
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (onChange) {
     
      const num = parseFloat(localValue) || 0;
      
      
      onChange(num);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur(); 
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={`w-full text-right p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${
        disabled ? 'bg-[#f0f0f0] text-gray-500 cursor-not-allowed pointer-events-none' : 'bg-white'
      } ${className}`}
    />
  );
};

const Gstr3bPaymentOfTaxPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  
  const [col6, setCol6] = useState<TaxBreakdown>(defaultTax); // Reverse Charge
  const [col7, setCol7] = useState<TaxBreakdown>(defaultTax); // Other than Rev Charge
  const [col8, setCol8] = useState<TaxBreakdown>(defaultTax); // IGST ITC
  const [col9, setCol9] = useState<TaxBreakdown>(defaultTax); // CGST ITC
  const [col10, setCol10] = useState<TaxBreakdown>(defaultTax); // SGST ITC
  const [col11, setCol11] = useState<TaxBreakdown>(defaultTax); // CESS ITC (Always 0)
  const [col18, setCol18] = useState<TaxBreakdown>(defaultTax); 

  
  const [col12, setCol12] = useState<TaxBreakdown>(defaultTax); 
  const [col13, setCol13] = useState<TaxBreakdown>(defaultTax); 
  const [col19, setCol19] = useState<TaxBreakdown>(defaultTax); 

  useEffect(() => {
    fetchData();
  }, [user, fy, q, p]);

  // Recalculate formulas whenever inputs change
  useEffect(() => {
    const newCol12 = {
      igst: Math.max(0, col7.igst - (col8.igst + col9.igst + col10.igst + col11.igst)),
      cgst: Math.max(0, col7.cgst - (col8.cgst + col9.cgst + col10.cgst + col11.cgst)),
      sgst: Math.max(0, col7.sgst - (col8.sgst + col9.sgst + col10.sgst + col11.sgst)),
      cess: Math.max(0, col7.cess - (col8.cess + col9.cess + col10.cess + col11.cess)),
    };
    setCol12(newCol12);

    const newCol13 = {
      igst: col6.igst,
      cgst: col6.cgst,
      sgst: col6.sgst,
      cess: col6.cess,
    };
    setCol13(newCol13);

    const newCol19 = {
      igst: Math.max(0, (newCol12.igst + newCol13.igst) - col18.igst),
      cgst: Math.max(0, (newCol12.cgst + newCol13.cgst) - col18.cgst),
      sgst: Math.max(0, (newCol12.sgst + newCol13.sgst) - col18.sgst),
      cess: Math.max(0, (newCol12.cess + newCol13.cess) - col18.cess),
    };
    setCol19(newCol19);

  }, [col6, col7, col8, col9, col10, col11, col18]);

  const fetchData = async () => {
    if (!user || !fy || !p) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. Fetch 3.1 data for auto-population
      const { data: s31Data, error } = await supabase
        .from('gstr3b_section_3_1')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('period', p)
        .in('row_code', ['a', 'd']);

      if (error) throw error;

      let rowA = { ...defaultTax };
      let rowD = { ...defaultTax };

      s31Data?.forEach(row => {
        if (row.row_code === 'a') {
          rowA = { igst: row.igst || 0, cgst: row.cgst || 0, sgst: row.sgst || 0, cess: row.cess || 0 };
        }
        if (row.row_code === 'd') {
          rowD = { igst: row.igst || 0, cgst: row.cgst || 0, sgst: row.sgst || 0, cess: row.cess || 0 };
        }
      });

      // 2. Fetch existing Payment data
      const { data: payData } = await supabase
        .from('gstr3b_payment_tax')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .single();

      // Rule: Col 6 and 7 are ALWAYS read-only from 3.1
      setCol6(rowD);
      setCol7(rowA);

      if (payData) {
        // Load editable columns if they exist, otherwise default to 0
        setCol8(payData.col_8 || defaultTax);
        setCol9(payData.col_9 || defaultTax);
        setCol10(payData.col_10 || defaultTax);
        setCol18(payData.col_18 || defaultTax);
        // Col 11 is always 0
      } 
      // If no payData, col8/9/10/18 stay at default 0
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (showToast = true) => {
    try {
      const { error } = await supabase
        .from('gstr3b_payment_tax')
        .upsert({
          user_id: user.id,
          gstin: user?.email,
          filing_year: fy,
          quarter: q,
          period: p,
          col_6: col6,
          col_7: col7,
          col_8: col8,
          col_9: col9,
          col_10: col10,
          col_11: col11,
          col_12: col12,
          col_13: col13,
          col_18: col18,
          col_19: col19,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,filing_year,quarter,period' });

      if (error) throw error;

      // Update summary table with MERGE strategy
      const { data: existingSummary } = await supabase
        .from('gstr3b_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .maybeSingle();

      const summaryPayload = {
        user_id: user.id,
        filing_year: fy,
        quarter: q,
        period: p,
        // Preserve existing sections
        sec_3_1: existingSummary?.sec_3_1 ?? null,
         sec_3_1_1: existingSummary?.sec_3_1_1 ?? null,
         sec_3_2: existingSummary?.sec_3_2 ?? null,
        sec_4: existingSummary?.sec_4 ?? null,
        sec_5: existingSummary?.sec_5 ?? null,
        sec_5_1: existingSummary?.sec_5_1 ?? null,
        // Update only 6.1
        sec_6_1: {
          igst: col19.igst,
          cgst: col19.cgst,
          sgst: col19.sgst,
          cess: col19.cess
        },
        updated_at: new Date().toISOString()
      };

      const { error: sumErr } = await supabase.from('gstr3b_summary').upsert(summaryPayload, { onConflict: 'user_id,filing_year,quarter,period' });

      if (sumErr) console.error("Summary update failed", sumErr);

      if (showToast) toast.success("Saved successfully");
      return true;
    } catch (err: any) {
      toast.error("Error saving: " + err.message);
      return false;
    }
  };

  const handleProceed = async () => {
    // Validation: Col 18 cannot exceed (12 + 13)
    const heads: (keyof TaxBreakdown)[] = ['igst', 'cgst', 'sgst', 'cess'];
    for (const h of heads) {
      if (col18[h] > (col12[h] + col13[h])) {
         toast.error(`Utilizable Cash Balance for ${h.toUpperCase()} cannot exceed Tax Liability`);
         return;
      }
    }

    const saved = await handleSave(false);
    if (saved) {
      navigate(`/returns/gstr3b/filing?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
    }
  };

  const updateTax = (setter: React.Dispatch<React.SetStateAction<TaxBreakdown>>, field: keyof TaxBreakdown, val: number) => {
    setter(prev => ({ ...prev, [field]: val }));
  };

  // Helper to render a cell
  const RenderCell = ({ 
    val, 
    setter, 
    field, 
    disabled = false, 
    bgGray = false 
  }: { 
    val: number, 
    setter?: React.Dispatch<React.SetStateAction<TaxBreakdown>>, 
    field: keyof TaxBreakdown, 
    disabled?: boolean, 
    bgGray?: boolean 
  }) => (
    <td className={`p-2 border min-w-[120px] ${bgGray ? 'bg-[#f0f0f0]' : ''}`}>
      <CurrencyInput 
        value={val} 
        onChange={setter ? (v) => updateTax(setter, field, v) : undefined} 
        disabled={disabled} 
      />
    </td>
  );

  const handleBack = async () => {
    const saved = await handleSave(false);
    if (saved) {
      navigate(`/returns/gstr3b/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <main className="max-w-[1800px] mx-auto px-4 py-6 w-full">
         <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">6.1 Payment of Tax</h1>
         </div>

         <div className="bg-white dark:bg-gray-800 rounded-lg shadow border overflow-hidden">
            <div className="overflow-x-auto">
               <table className="border-collapse text-sm w-full">
                  <thead className="bg-blue-50 dark:bg-gray-700 text-center">
                     <tr>
                        <th className="border p-2 min-w-[200px] text-left sticky left-0 bg-blue-50 z-10">Description</th>
                        <th className="border p-2 min-w-[140px]">Tax payable<br/>(Reverse charge)<br/>(6)</th>
                        <th className="border p-2 min-w-[140px]">Tax payable<br/>(Other than reverse charge)<br/>(7)</th>
                        <th className="border p-2 min-w-[140px]">Paid through ITC<br/>(Integrated Tax)<br/>(8)</th>
                        <th className="border p-2 min-w-[140px]">Paid through ITC<br/>(Central Tax)<br/>(9)</th>
                        <th className="border p-2 min-w-[140px]">Paid through ITC<br/>(State/UT Tax)<br/>(10)</th>
                        <th className="border p-2 min-w-[140px] bg-[#f0f0f0]">Paid through ITC<br/>(CESS)<br/>(11)</th>
                        <th className="border p-2 min-w-[140px]">Tax paid in Cash<br/>(Other than reverse charge)<br/>(12)</th>
                        <th className="border p-2 min-w-[140px]">Tax paid in Cash<br/>(Reverse charge)<br/>(13)</th>
                        <th className="border p-2 min-w-[140px] bg-[#f0f0f0]">Interest payable<br/>(14)</th>
                        <th className="border p-2 min-w-[140px] bg-[#f0f0f0]">Interest paid in cash<br/>(15)</th>
                        <th className="border p-2 min-w-[140px] bg-[#f0f0f0]">Late Fee Payable<br/>(16)</th>
                        <th className="border p-2 min-w-[140px] bg-[#f0f0f0]">Late Fee paid in cash<br/>(17)</th>
                        <th className="border p-2 min-w-[140px]">Utilizable Cash balance<br/>(18)</th>
                        <th className="border p-2 min-w-[140px]">Additional Cash required<br/>(19)</th>
                     </tr>
                  </thead>
                  <tbody>
                     {/* Row 1: Integrated Tax */}
                     <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-2 border font-medium sticky left-0 bg-white z-10">Integrated Tax</td>
                        <RenderCell val={col6.igst} field="igst" disabled />
                        <RenderCell val={col7.igst} field="igst" disabled />
                        <RenderCell val={col8.igst} field="igst" setter={setCol8} />
                        <RenderCell val={col9.igst} field="igst" setter={setCol9} />
                        <RenderCell val={col10.igst} field="igst" setter={setCol10} />
                        <RenderCell val={col11.igst} field="igst" disabled bgGray />
                        <RenderCell val={col12.igst} field="igst" disabled />
                        <RenderCell val={col13.igst} field="igst" disabled />
                        <RenderCell val={0} field="igst" disabled bgGray />
                        <RenderCell val={0} field="igst" disabled bgGray />
                        <RenderCell val={0} field="igst" disabled bgGray />
                        <RenderCell val={0} field="igst" disabled bgGray />
                        <RenderCell val={col18.igst} field="igst" setter={setCol18} />
                        <RenderCell val={col19.igst} field="igst" disabled />
                     </tr>
                     {/* Row 2: Central Tax */}
                     <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-2 border font-medium sticky left-0 bg-white z-10">Central Tax</td>
                        <RenderCell val={col6.cgst} field="cgst" disabled />
                        <RenderCell val={col7.cgst} field="cgst" disabled />
                        <RenderCell val={col8.cgst} field="cgst" setter={setCol8} />
                        <RenderCell val={col9.cgst} field="cgst" setter={setCol9} />
                        <RenderCell val={col10.cgst} field="cgst" setter={setCol10} />
                        <RenderCell val={col11.cgst} field="cgst" disabled bgGray />
                        <RenderCell val={col12.cgst} field="cgst" disabled />
                        <RenderCell val={col13.cgst} field="cgst" disabled />
                        <RenderCell val={0} field="cgst" disabled bgGray />
                        <RenderCell val={0} field="cgst" disabled bgGray />
                        <RenderCell val={0} field="cgst" disabled bgGray />
                        <RenderCell val={0} field="cgst" disabled bgGray />
                        <RenderCell val={col18.cgst} field="cgst" setter={setCol18} />
                        <RenderCell val={col19.cgst} field="cgst" disabled />
                     </tr>
                     {/* Row 3: State/UT Tax */}
                     <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-2 border font-medium sticky left-0 bg-white z-10">State/UT Tax</td>
                        <RenderCell val={col6.sgst} field="sgst" disabled />
                        <RenderCell val={col7.sgst} field="sgst" disabled />
                        <RenderCell val={col8.sgst} field="sgst" setter={setCol8} />
                        <RenderCell val={col9.sgst} field="sgst" setter={setCol9} />
                        <RenderCell val={col10.sgst} field="sgst" setter={setCol10} />
                        <RenderCell val={col11.sgst} field="sgst" disabled bgGray />
                        <RenderCell val={col12.sgst} field="sgst" disabled />
                        <RenderCell val={col13.sgst} field="sgst" disabled />
                        <RenderCell val={0} field="sgst" disabled bgGray />
                        <RenderCell val={0} field="sgst" disabled bgGray />
                        <RenderCell val={0} field="sgst" disabled bgGray />
                        <RenderCell val={0} field="sgst" disabled bgGray />
                        <RenderCell val={col18.sgst} field="sgst" setter={setCol18} />
                        <RenderCell val={col19.sgst} field="sgst" disabled />
                     </tr>
                     {/* Row 4: CESS */}
                     <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-2 border font-medium sticky left-0 bg-white z-10">CESS</td>
                        <RenderCell val={col6.cess} field="cess" disabled />
                        <RenderCell val={col7.cess} field="cess" disabled />
                        <RenderCell val={col8.cess} field="cess" setter={setCol8} />
                        <RenderCell val={col9.cess} field="cess" setter={setCol9} />
                        <RenderCell val={col10.cess} field="cess" setter={setCol10} />
                        <RenderCell val={col11.cess} field="cess" disabled bgGray />
                        <RenderCell val={col12.cess} field="cess" disabled />
                        <RenderCell val={col13.cess} field="cess" disabled />
                        <RenderCell val={0} field="cess" disabled bgGray />
                        <RenderCell val={0} field="cess" disabled bgGray />
                        <RenderCell val={0} field="cess" disabled bgGray />
                        <RenderCell val={0} field="cess" disabled bgGray />
                        <RenderCell val={col18.cess} field="cess" setter={setCol18} />
                        <RenderCell val={col19.cess} field="cess" disabled />
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>

         <div className="mt-8 flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
             <div className="flex gap-4">
                <Button variant="outline" onClick={handleBack}>
                  BACK
                </Button>
             </div>
             <div className="flex gap-4">
                <Button className="bg-[#1C244B] hover:bg-[#151b3a] text-white" onClick={() => handleSave()}>
                  SAVE
                </Button>
                <Button 
                  className="bg-[#1C244B] hover:bg-[#151b3a] text-white"
                  onClick={handleProceed}
                >
                  PROCEED TO FILE / PAYMENT
                </Button>
             </div>
          </div>
      </main>
    </div>
  );
};

export default Gstr3bPaymentOfTaxPage;
