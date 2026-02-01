import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { loadUserData } from '@/lib/userStorage';

type RowData = { 
  taxable: number; 
  igst: number; 
  cgst: number; 
  sgst: number; 
  cess: number; 
  source: 'AUTO' | 'MANUAL';
  is_tax_locked?: boolean;
};

const formatINR = (n: number) => {
  const parts = Number(n || 0).toFixed(2).split('.');
  const x = parts[0];
  const last3 = x.slice(-3);
  const other = x.slice(0, -3);
  const withCommas = other.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (other ? ',' : '') + last3;
  return `${withCommas}.${parts[1]}`;
};

const CurrencyInput: React.FC<{ value: number; onChange?: (v: number) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  const [text, setText] = useState<string>(Number.isFinite(value) ? String(value) : '');
  useEffect(() => setText(Number.isFinite(value) ? String(value) : ''), [value]);
  return (
    <Input
      type="text"
      value={disabled ? formatINR(Number(value || 0)) : text}
      onChange={e => {
        const raw = e.target.value;
        setText(raw);
        const num = parseFloat(raw.replace(/,/g, ''));
        if (onChange) onChange(Number.isFinite(num) ? num : 0);
      }}
      onBlur={e => {
        const num = parseFloat((e.target.value || '0').replace(/,/g, ''));
        setText(formatINR(Number.isFinite(num) ? num : 0));
      }}
      disabled={disabled}
      className="text-right"
      placeholder="0.00"
    />
  );
};

const Gstr3bSection31Page: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Record<string, RowData>>({
    a: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' },
    b: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' },
    c: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' },
    d: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' },
    e: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' },
  });

  const [eff, setEff] = useState<{ interShare: number; igstRate: number; intraRate: number }>({ interShare: 0, igstRate: 0, intraRate: 0 });
  const [gstr1Split, setGstr1Split] = useState({ interTaxable: 0, intraTaxable: 0 });
  const GST_RATE = 0.18;
  const round2 = (n: number) => Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  const clamp = (n: number) => Math.max(0, round2(n));


  const fetchGstr1DataAndCalculate = async () => {
    if (!user || !fy || !q || !p) return null;

    const supplierGstin = (await loadUserData<{ gstin?: string }>('profile:gstin'))?.gstin || '';
    const supplierStateCode = supplierGstin?.slice(0, 2) || '';

    // Fetch B2B
    const { data: b2bData } = await supabase
      .from('gstr1_b2b')
      .select('taxable_value, integrated_tax, central_tax, state_ut_tax, cess, pos_code, supply_type')
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p);

    const b2bRows = b2bData || [];

    // Fetch B2CS
    const { data: b2csData } = await supabase
      .from('gstr1_b2cs')
      .select('taxable_value, integrated_tax, central_tax, state_tax, cess, pos')
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p);
    
    const b2csRows = b2csData || [];

    // Fetch Nil Rated
    const { data: nilRow } = await supabase
      .from('gstr1_nil_rated')
      .select('*')
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p)
      .maybeSingle();

    // Aggregation for 3.1(a) - Outward Taxable
    // B2B + B2CS
    let a_taxable = 0, a_igst = 0, a_cgst = 0, a_sgst = 0, a_cess = 0;

    b2bRows.forEach(r => {
        const taxable = Number(r.taxable_value || 0);
        a_taxable += taxable;
        a_cess += Number(r.cess || 0);

        if (r.supply_type === 'Inter-State') {
            a_igst += Number(r.integrated_tax || 0);
        } else {
            a_cgst += Number(r.central_tax || 0);
            a_sgst += Number(r.state_ut_tax || 0);
        }
    });

    b2csRows.forEach(r => {
        const taxable = Number(r.taxable_value || 0);
        a_taxable += taxable;
        a_cess += Number(r.cess || 0);
    });

    // Aggregation for 3.1(c) - Nil / Exempted
    // From Nil Rated table: Nil + Exempted columns
    let c_taxable = 0;
    if (nilRow) {
        c_taxable += Number(nilRow.intra_reg_nil || 0) + Number(nilRow.intra_unreg_nil || 0) + 
                     Number(nilRow.inter_reg_nil || 0) + Number(nilRow.inter_unreg_nil || 0) +
                     Number(nilRow.intra_reg_exempted || 0) + Number(nilRow.intra_unreg_exempted || 0) + 
                     Number(nilRow.inter_reg_exempted || 0) + Number(nilRow.inter_unreg_exempted || 0);
    }

    // Aggregation for 3.1(e) - Non-GST
    let e_taxable = 0;
    if (nilRow) {
        e_taxable += Number(nilRow.intra_reg_non_gst || 0) + Number(nilRow.intra_unreg_non_gst || 0) + 
                     Number(nilRow.inter_reg_non_gst || 0) + Number(nilRow.inter_unreg_non_gst || 0);
    }
    
    // Calculate effective tax share and rates for manual overrides
    let totalInterTaxable = 0;
    let totalIntraTaxable = 0;

    b2bRows.forEach(r => {
        const taxable = Number(r.taxable_value || 0);
        if (r.supply_type === 'Inter-State') {
            totalInterTaxable += taxable;
        } else {
            totalIntraTaxable += taxable;
        }
    });

    b2csRows.forEach(r => {
        const taxable = Number(r.taxable_value || 0);
        if (r.pos && r.pos !== supplierStateCode) {
            totalInterTaxable += taxable;
        } else {
            totalIntraTaxable += taxable;
        }
    });
    
    const interShare = (totalInterTaxable + totalIntraTaxable) > 0 ? totalInterTaxable / (totalInterTaxable + totalIntraTaxable) : 0;
    
    // Derived rates or default to 18% (kept for compatibility with old eff state, but main logic now uses split)
    const derivedIgstRate = 0.18;
    const derivedIntraRate = 0.18;

    return {
        a: { taxable: clamp(a_taxable), igst: clamp(a_igst), cgst: clamp(a_cgst), sgst: clamp(a_sgst), cess: clamp(a_cess), source: 'AUTO' as const },
        b: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' as const },
        c: { taxable: clamp(c_taxable), igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' as const },
        d: { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' as const },
        e: { taxable: clamp(e_taxable), igst: 0, cgst: 0, sgst: 0, cess: 0, source: 'AUTO' as const },
        eff: { interShare, igstRate: derivedIgstRate, intraRate: derivedIntraRate },
        split: { interTaxable: totalInterTaxable, intraTaxable: totalIntraTaxable }
    };
  };

  const loadData = async () => {
    if (!user || !fy || !q || !p) {
        setLoading(false);
        return;
    }
    setLoading(true);

    // 1. Fetch Saved 3.1 Data
    const { data: savedData, error: savedError } = await supabase
        .from('gstr3b_section_3_1')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('period', p);
    
    if (savedError) console.error("Error fetching saved 3.1 data:", savedError);

    // 2. Fetch GSTR-1 Derived Data
    const derived = await fetchGstr1DataAndCalculate();
    if (derived) {
        setEff({ interShare: derived.eff.interShare, igstRate: derived.eff.igstRate, intraRate: derived.eff.intraRate });
        setGstr1Split(derived.split);
    }

    // 3. Merge Logic:
    // If saved row exists and source is MANUAL, use saved.
    // Else use derived.
    
    setRows(prev => {
        const next = { ...prev };
        ['a', 'b', 'c', 'd', 'e'].forEach(key => {
            const savedRow = savedData?.find(r => r.row_code === key);
            
            if (savedRow?.source === 'MANUAL') {
                next[key] = {
                    taxable: clamp(Number(savedRow.taxable_value || 0)),
                    igst: clamp(Number(savedRow.igst || 0)),
                    cgst: clamp(Number(savedRow.cgst || 0)),
                    sgst: clamp(Number(savedRow.sgst || 0)),
                    cess: clamp(Number(savedRow.cess || 0)),
                    source: 'MANUAL'
                };
            } else if (derived) {
                // Use derived (fresh GSTR-1 data)
                // @ts-expect-error dynamic key access
                next[key] = derived[key];
            }
        });
        return next;
    });

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user, fy, q, p]);

  const headerPeriod = useMemo(() => `${fy || ''} – ${p || ''}`, [fy, p]);

  const setRow = (key: keyof typeof rows, field: keyof RowData, value: number) => {
    setRows(prev => {
      const next = { ...prev };
      // Update value
      // @ts-expect-error dynamic
      next[key][field] = value as never;
      

      
      // Mirror logic for IGST/CGST/SGST adjustments
      if ((key === 'a' || key === 'd') && (field === 'igst' || field === 'cgst' || field === 'sgst')) {
        next[key].is_tax_locked = true;
        next[key].source = 'MANUAL';

        if (field === 'igst') {
          next[key].cgst = 0;
          next[key].sgst = 0;
        }
        if (field === 'cgst') {
          next[key].sgst = value;
        }
        if (field === 'sgst') {
          next[key].cgst = value;
        }
      }

      return next;
    });
  };

  const handleReset = async () => {
    if (!confirm("Reset will discard manual changes and re-sync from GSTR-1")) return;

    setLoading(true);

    const derived = await fetchGstr1DataAndCalculate();
    if (!derived) return;

    setEff({ interShare: derived.eff.interShare, igstRate: derived.eff.igstRate, intraRate: derived.eff.intraRate });
    setGstr1Split(derived.split);

    setRows({
      a: derived.a,
      b: derived.b,
      c: derived.c,
      d: derived.d,
      e: derived.e,
    });

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return false;
    
    // Validate
    const hasNegative = ['a', 'c', 'd'].some(k => {
      const r = rows[k];
      return [r.taxable, r.igst, r.cgst, r.sgst, r.cess].some(v => Number(v) < 0);
    });
    if (hasNegative) {
      alert('Values cannot be negative');
      return false;
    }

    // Validate mutual exclusivity: IGST cannot coexist with CGST/SGST
    const hasMixed = ['a', 'd'].some(k => {
      const r = rows[k];
      const igstPos = Number(r.igst || 0) > 0.0001;
      const cgstPos = Number(r.cgst || 0) > 0.0001;
      const sgstPos = Number(r.sgst || 0) > 0.0001;
      return igstPos && (cgstPos || sgstPos);
    });
    if (hasMixed) {
      alert('Invalid tax mix: IGST cannot coexist with CGST/SGST');
      return false;
    }

    // Validate CGST == SGST (Hard Stop)
    const hasMismatch = ['a', 'c', 'd'].some(k => {
      const r = rows[k];
      // Allow small tolerance for floating point math
      return Math.abs(Number(r.cgst || 0) - Number(r.sgst || 0)) > 0.1;
    });
    if (hasMismatch) {
      alert('CGST and SGST must be equal');
      return false;
    }

    const profileData = await loadUserData<{ gstin?: string }>('profile:gstin');
    const userGstin = profileData?.gstin || '';

    const rowPayloads = Object.entries(rows).map(([code, data]) => ({
      user_id: user.id,
      gstin: userGstin,
      filing_year: fy,
      period: p,
      row_code: code,
      taxable_value: clamp(data.taxable),
      igst: clamp(data.igst),
      cgst: clamp(data.cgst),
      sgst: clamp(data.sgst),
      cess: clamp(data.cess),
      source: data.source, // Save the source flag
      updated_at: new Date().toISOString(),
    }));

    // Upsert Rows
    const { error: sErr } = await supabase.from('gstr3b_section_3_1').upsert(rowPayloads, { onConflict: 'user_id,filing_year,period,row_code' });
    if (sErr) {
      alert(sErr.message);
      return false;
    }

    // Upsert Summary with Merge Strategy
    // 1. Fetch existing summary to preserve other sections
    const { data: existingSummary } = await supabase
        .from('gstr3b_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .maybeSingle();
    
    const totalTaxable = Object.values(rows).reduce((s, r) => s + Number(r.taxable || 0), 0);
    const totalIgst = Object.values(rows).reduce((s, r) => s + Number(r.igst || 0), 0);
    const totalCgst = Object.values(rows).reduce((s, r) => s + Number(r.cgst || 0), 0);
    const totalSgst = Object.values(rows).reduce((s, r) => s + Number(r.sgst || 0), 0);
    const totalCess = Object.values(rows).reduce((s, r) => s + Number(r.cess || 0), 0);

    const newSec31 = {
        taxable_value: totalTaxable,
        igst: totalIgst,
        cgst: totalCgst,
        sgst: totalSgst,
        cess: totalCess
    };

    // 2. Prepare payload merging new 3.1 with existing sections
    const summaryPayload = {
      user_id: user.id,
      gstin: userGstin,
      filing_year: fy,
      quarter: q,
      period: p,
      sec_3_1: newSec31,
      // Preserve other sections if they exist, otherwise undefined (which upsert might handle as null if column exists, but for JSONB columns it's fine)
      sec_3_2: existingSummary?.sec_3_2,
      sec_4: existingSummary?.sec_4,
      sec_5: existingSummary?.sec_5,
      sec_5_1: existingSummary?.sec_5_1,
      sec_6_1: existingSummary?.sec_6_1,
      updated_at: new Date().toISOString()
    };

    const { error: sumErr } = await supabase
      .from('gstr3b_summary')
      .upsert(summaryPayload, { onConflict: 'user_id,filing_year,quarter,period' });
      
    if (sumErr) {
      alert(sumErr.message);
      return false;
    }
    
    return true;
  };

  const handleBack = async () => {
    const saved = await handleSave();
    if (saved) {
      navigate(`/returns/gstr3b/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
    }
  };

  const handleConfirm = async () => {
    const saved = await handleSave();
    if (saved) {
      navigate(`/returns/gstr3b/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
    }
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
            <span className="text-gray-600 font-medium">3.1 – Tax on outward and reverse charge inward supplies</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">GSTR-3B – 3.1 – Tax on outward and reverse charge inward supplies</h1>
            <div className="flex gap-2">
                 <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleReset}>RESET</Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>GSTIN: <span className="font-medium">{user?.email || '—'}</span></div>
            <div>Legal Name: <span className="font-medium">—</span></div>
            <div>Trade Name: <span className="font-medium">—</span></div>
            <div>FY / Tax Period: <span className="font-medium">{headerPeriod}</span></div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-900 border">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Nature of Supplies</th>
                  <th className="px-4 py-2 text-right font-medium">Total Taxable Value (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">Integrated Tax (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">Central Tax (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">State/UT Tax (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">CESS (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-2">
                      (a) Outward taxable supplies (other than zero rated, nil rated and exempted)
                      {rows.a.source === 'MANUAL' && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">MANUAL</span>}
                  </td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a.taxable} onChange={v => setRow('a', 'taxable', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a.igst} onChange={v => setRow('a', 'igst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a.cgst} onChange={v => setRow('a', 'cgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a.sgst} onChange={v => setRow('a', 'sgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a.cess} onChange={v => setRow('a', 'cess', v)} /></td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">(b) Outward taxable supplies (zero rated)</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b.taxable} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b.igst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b.cgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b.sgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b.cess} disabled /></td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">
                      (c) Other outward supplies (Nil rated, exempted)
                      {rows.c.source === 'MANUAL' && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">MANUAL</span>}
                  </td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.taxable} onChange={v => setRow('c', 'taxable', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.igst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.cgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.sgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.cess} disabled /></td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">
                      (d) Inward supplies (liable to reverse charge)
                      {rows.d.source === 'MANUAL' && <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">MANUAL</span>}
                  </td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.d.taxable} onChange={v => setRow('d', 'taxable', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.d.igst} onChange={v => setRow('d', 'igst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.d.cgst} onChange={v => setRow('d', 'cgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.d.sgst} onChange={v => setRow('d', 'sgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.d.cess} onChange={v => setRow('d', 'cess', v)} /></td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">(e) Non-GST outward supplies</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.e.taxable} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.e.igst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.e.cgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.e.sgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.e.cess} disabled /></td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-right">Total</td>
                  <td className="px-4 py-2 text-right font-bold">
                    {formatINR(Object.values(rows).reduce((s, r) => s + Number(r.taxable || 0), 0))}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    {formatINR(Object.values(rows).reduce((s, r) => s + Number(r.igst || 0), 0))}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    {formatINR(Object.values(rows).reduce((s, r) => s + Number(r.cgst || 0), 0))}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    {formatINR(Object.values(rows).reduce((s, r) => s + Number(r.sgst || 0), 0))}
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    {formatINR(Object.values(rows).reduce((s, r) => s + Number(r.cess || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-4 mt-6">
            <Button variant="outline" onClick={handleBack}>BACK</Button>
            <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={handleConfirm}>CONFIRM</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gstr3bSection31Page;
