import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';



type B2BRecord = {
  gstin: string;
  recipientName: string;
  nameAsInMaster?: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalInvoiceValue: number;
  posCode: string;
  posName: string;
  supplyType: string;
  irn?: string;
  irnDate?: string;
};

const FIXED_GSTIN = '33FKCPS0842D1ZG';

const stateOptions = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' },
  { code: '26', name: 'Dadra & Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];


const AddB2BRecordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  console.log('ENTER ADD PAGE', { fy, q, p, url: window.location.href });
  const { user } = useAuth();
  useEffect(() => {
    if (!fy || !q || !p) {
      alert('Invalid access. Redirecting...');
      navigate('/returns/gstr1/prepare-online');
    }
  }, [fy, q, p]);
  const [gstin, setGstin] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [nameAsInMaster, setNameAsInMaster] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [totalInvoiceValue, setTotalInvoiceValue] = useState('');
  const [posCode, setPosCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const gstinStateCode = useMemo(() => (gstin?.slice(0, 2) || ''), [gstin]);
  const posName = useMemo(() => stateOptions.find(s => s.code === posCode)?.name || '', [posCode]);
  const supplyType = useMemo(() => {
    if (!posCode || gstinStateCode.length !== 2) return '';
    return posCode === gstinStateCode ? 'Intra-State' : 'Inter-State';
  }, [posCode, gstinStateCode]);

  type SupplyType = "Inter-State" | "Intra-State";
  type TaxRow = { rate: number; taxableValue: number };
  const gstRates = [3, 5, 12, 18, 28, 48];
  const [taxRows, setTaxRows] = useState<TaxRow[]>(gstRates.map((r) => ({ rate: r, taxableValue: 0 })));

  useEffect(() => {
    const ready = gstin.length === 15 && !!posCode && !!supplyType;
    setShowItems(ready);
  }, [gstin, posCode, supplyType]);

  useEffect(() => {
    if (showItems) {
      setAnimateIn(false);
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
    }
  }, [showItems]);

  useEffect(() => {
    const presetGstin = searchParams.get('gstin');
    const editId = searchParams.get('id');

    if (presetGstin) {
      setGstin(presetGstin);
    }
  }, [gstin, searchParams]);

  useEffect(() => {
    const editId = searchParams.get('id');
    if (editId) {
      const loadEditData = async () => {
        try {
          if (!user) return;
          setLoading(true);
          const { data, error } = await supabase
            .from('gstr1_b2b')
            .select('*')
            .eq('id', editId)
            .single();
          if (error) {
            console.error(error);
            if (String(error.message || '').toLowerCase().includes('invalid refresh token')) {
              await supabase.auth.signOut();
              navigate('/login');
            }
            return;
          }
          if (data) {
            const rec: any = data;
            setGstin(rec.gstin || '');
            setRecipientName(rec.recipient_name || '');
            setNameAsInMaster(rec.recipient_name || '');
            setInvoiceNumber(rec.invoice_number || '');
            setInvoiceDate(rec.invoice_date || '');
            setTotalInvoiceValue(String(rec.total_invoice_value ?? ''));
            setPosCode(rec.pos_code || '');
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      loadEditData();
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (gstin === FIXED_GSTIN) {
      setRecipientName('SMS Exports');
      setPosCode('33');
    }
  }, [gstin]);

  const save = async () => {
    setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      alert(sessionError.message);
      return;
    }
    if (!sessionData?.session) {
      alert('Session expired. Please login again.');
      return;
    }
    const fy = searchParams.get('fy') || '';
    const q = searchParams.get('q') || '';
    const p = searchParams.get('p') || '';
    if (!user || !fy || !q || !p) {
      alert('MISSING user / fy / q / p');
      return;
    }
    if (!gstin || !recipientName || !invoiceNumber || !invoiceDate || !totalInvoiceValue || !posCode) {
      setError('Please fill all required fields.');
      return;
    }
    const valueNum = Number(totalInvoiceValue);
    if (Number.isNaN(valueNum) || valueNum <= 0) {
      setError('Total Invoice Value must be a positive number.');
      return;
    }
    if (gstin.length !== 15) {
      setError('GSTIN must be 15 characters.');
      return;
    }
    const editId = searchParams.get('id');

    if (!user || !fy || !q || !p) return;
    try {
      const saveInvoice = async (payload: {
        gstin: string;
        recipientName: string;
        invoiceNumber: string;
        invoiceDate: string;
        totalInvoiceValue: number;
        taxableValue: number;
        posCode: string;
        posName: string;
        supplyType: 'Intra-State' | 'Inter-State';
        integratedTax: number;
        centralTax: number;
        stateUtTax: number;
        cess: number;
      }) => {
        if (editId) {
          const { error } = await supabase
            .from('gstr1_b2b')
            .update({
              gstin: payload.gstin,
              recipient_name: payload.recipientName,
              invoice_number: payload.invoiceNumber,
              invoice_date: payload.invoiceDate,
              total_invoice_value: payload.totalInvoiceValue,
              taxable_value: payload.taxableValue,
              pos_code: payload.posCode,
              pos_name: payload.posName,
              supply_type: payload.supplyType,
              integrated_tax: payload.integratedTax,
              central_tax: payload.centralTax,
              state_ut_tax: payload.stateUtTax,
              cess: payload.cess,
            })
            .eq('id', editId)
            .eq('user_id', user.id);
          if (error) {
            alert(error.message);
            if (String(error.message || '').toLowerCase().includes('invalid refresh token')) {
              await supabase.auth.signOut();
              navigate('/login');
            }
            throw error;
          }
          return;
        }
        const { error } = await supabase
          .from('gstr1_b2b')
          .insert({
            user_id: user.id,
            filing_year: fy,
            quarter: q,
            period: p,
            gstin: payload.gstin,
            recipient_name: payload.recipientName,
            invoice_number: payload.invoiceNumber,
            invoice_date: payload.invoiceDate,
            total_invoice_value: payload.totalInvoiceValue,
            taxable_value: payload.taxableValue,
            pos_code: payload.posCode,
            pos_name: payload.posName,
            supply_type: payload.supplyType,
            integrated_tax: payload.integratedTax,
            central_tax: payload.centralTax,
            state_ut_tax: payload.stateUtTax,
            cess: payload.cess,
          });
        if (error) {
          console.error('SAVE FAILED:', error);
          alert(error.message);
          if (String(error.message || '').toLowerCase().includes('invalid refresh token')) {
            await supabase.auth.signOut();
            navigate('/login');
          }
          throw error;
        }
      };
      const isInterState = supplyType === 'Inter-State';
      const igstTotal = isInterState
        ? taxRows.reduce((sum, r) => sum + (Number(r.taxableValue) * Number(r.rate)) / 100, 0)
        : 0;
      const half = (rate: number) => rate / 2;
      const cgstTotal = !isInterState
        ? taxRows.reduce((sum, r) => sum + (Number(r.taxableValue) * half(Number(r.rate))) / 100, 0)
        : 0;
      const sgstTotal = !isInterState
        ? taxRows.reduce((sum, r) => sum + (Number(r.taxableValue) * half(Number(r.rate))) / 100, 0)
        : 0;
      const cessTotal = 0;
      const totalTaxable = taxRows.reduce((sum, r) => sum + Number(r.taxableValue || 0), 0);

      await saveInvoice({
        gstin,
        recipientName,
        invoiceNumber,
        invoiceDate,
        totalInvoiceValue: valueNum,
        taxableValue: totalTaxable,
        posCode,
        posName,
        supplyType: supplyType as 'Intra-State' | 'Inter-State',
        integratedTax: igstTotal,
        centralTax: cgstTotal,
        stateUtTax: sgstTotal,
        cess: cessTotal,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to save');
      return;
    }
    navigate(`/returns/gstr1/b2b?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">
      <main className="max-w-[1200px] mx-auto px-4 py-6 w-full">
        <nav className="text-sm mb-4">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <span className="text-gray-400">›</span>
            <Link to="/returns" className="text-blue-600 hover:underline">Returns</Link>
            <span className="text-gray-400">›</span>
            <Link to="/returns/gstr1/prepare-online" className="text-blue-600 hover:underline">GSTR-1</Link>
            <span className="text-gray-400">›</span>
            <Link to="/returns/gstr1/b2b" className="text-blue-600 hover:underline">B2B</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">Add Record</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">Add B2B Record</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/returns/gstr1/b2b?fy=${encodeURIComponent(searchParams.get('fy') || '')}&q=${encodeURIComponent(searchParams.get('q') || '')}&p=${encodeURIComponent(searchParams.get('p') || '')}`)}>BACK</Button>
              <Button type="button" className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={save}>SAVE</Button>
            </div>
          </div>

          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Recipient GSTIN/UIN *</Label>
              <Input value={gstin} onChange={(e) => setGstin(e.target.value.trim())} placeholder="15-character GSTIN" />
            </div>
            <div>
              <Label>Recipient Name *</Label>
              <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient Name" />
            </div>
            <div>
              <Label>Name as in Master</Label>
              <Input value={nameAsInMaster} onChange={(e) => setNameAsInMaster(e.target.value)} placeholder="Name as in Master" />
            </div>
            <div>
              <Label>Invoice Number *</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Invoice Number" />
            </div>
            <div>
              <Label>Invoice Date *</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div>
              <Label>Total Invoice Value (₹) *</Label>
              <Input type="number" value={totalInvoiceValue} onChange={(e) => setTotalInvoiceValue(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>POS (Place of Supply) *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={posCode}
                onChange={(e) => setPosCode(e.target.value)}
              >
                <option value="">Select</option>
                {stateOptions.map((s) => (
                  <option key={s.code} value={s.code}>{`${s.code} – ${s.name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Supply Type</Label>
              <Input value={supplyType} readOnly />
            </div>
          </div>
        </div>

        {showItems ? (
          <div
            className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow border mt-6 transition-all duration-300 ease-in-out ${
              animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <h2 className="text-xl font-semibold mb-4">Item Details</h2>
            {supplyType === 'Inter-State' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left border">Rate (%)</th>
                      <th className="p-2 text-left border">Taxable Value (₹)</th>
                      <th className="p-2 text-left border">Integrated Tax (₹)</th>
                      <th className="p-2 text-left border">Cess (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((row, idx) => {
                      const igst = (row.taxableValue * row.rate) / 100;
                      return (
                        <tr key={row.rate}>
                          <td className="p-2 border">{row.rate}%</td>
                          <td className="p-2 border">
                            <Input
                              type="number"
                              value={row.taxableValue ? String(row.taxableValue) : ''}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value || '0');
                                setTaxRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], taxableValue: Number.isNaN(v) ? 0 : v };
                                  return next;
                                });
                              }}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2 border">
                            <Input value={igst ? igst.toFixed(2) : ''} readOnly />
                          </td>
                          <td className="p-2 border">
                            <Input value="" readOnly />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left border">Rate (%)</th>
                      <th className="p-2 text-left border">Taxable Value (₹)</th>
                      <th className="p-2 text-left border">Central Tax (₹)</th>
                      <th className="p-2 text-left border">State / UT Tax (₹)</th>
                      <th className="p-2 text-left border">Cess (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((row, idx) => {
                      const halfRate = row.rate / 2;
                      const cgst = (row.taxableValue * halfRate) / 100;
                      const sgst = (row.taxableValue * halfRate) / 100;
                      return (
                        <tr key={row.rate}>
                          <td className="p-2 border">{row.rate}%</td>
                          <td className="p-2 border">
                            <Input
                              type="number"
                              value={row.taxableValue ? String(row.taxableValue) : ''}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value || '0');
                                setTaxRows((prev) => {
                                  const next = [...prev];
                                  next[idx] = { ...next[idx], taxableValue: Number.isNaN(v) ? 0 : v };
                                  return next;
                                });
                              }}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-2 border">
                            <Input value={cgst ? cgst.toFixed(2) : ''} readOnly />
                          </td>
                          <td className="p-2 border">
                            <Input value={sgst ? sgst.toFixed(2) : ''} readOnly />
                          </td>
                          <td className="p-2 border">
                            <Input value="" readOnly />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default AddB2BRecordPage;
