import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type Cols = { igst: number; cgst: number; sgst: number; cess: number };
type ItcRows = {
  a3: Cols; // Inward supplies liable to reverse charge
  a5: Cols; // All other ITC
  b1: Cols; // As per rules 38, 42 & 43 of CGST Rules and section 17(5)
  b2: Cols; // Others
  c: Cols;  // Net ITC Available (A - B)
};

const CurrencyInput: React.FC<{ value: number; onChange?: (v: number) => void; disabled?: boolean }> = ({ value, onChange, disabled }) => {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? String(value) : ''}
      onChange={e => onChange?.(parseFloat(e.target.value || '0'))}
      disabled={disabled}
      className="text-right"
      placeholder="0.00"
    />
  );
};

const Gstr3bEligibleItcPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ItcRows>({
    a3: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    a5: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    b1: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    b2: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
    c: { igst: 0, cgst: 0, sgst: 0, cess: 0 },
  });

  type EligibleRow = {
    a3_igst?: number; a3_cgst?: number; a3_sgst?: number; a3_cess?: number;
    a5_igst?: number; a5_cgst?: number; a5_sgst?: number; a5_cess?: number;
    b1_igst?: number; b1_cgst?: number; b1_sgst?: number; b1_cess?: number;
    b2_igst?: number; b2_cgst?: number; b2_sgst?: number; b2_cess?: number;
    c_igst?: number; c_cgst?: number; c_sgst?: number; c_cess?: number;
  };
  useEffect(() => {
    const run = async () => {
      if (!user || !fy || !q || !p) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from('gstr3b_eligible_itc')
        .select('a3_igst,a3_cgst,a3_sgst,a3_cess,a5_igst,a5_cgst,a5_sgst,a5_cess,b1_igst,b1_cgst,b1_sgst,b1_cess,b2_igst,b2_cgst,b2_sgst,b2_cess,c_igst,c_cgst,c_sgst,c_cess')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!error && Array.isArray(data) && data[0]) {
        const r = data[0] as EligibleRow;
        setRows({
          a3: { igst: Number(r.a3_igst || 0), cgst: Number(r.a3_cgst || 0), sgst: Number(r.a3_sgst || 0), cess: Number(r.a3_cess || 0) },
          a5: { igst: Number(r.a5_igst || 0), cgst: Number(r.a5_cgst || 0), sgst: Number(r.a5_sgst || 0), cess: Number(r.a5_cess || 0) },
          b1: { igst: Number(r.b1_igst || 0), cgst: Number(r.b1_cgst || 0), sgst: Number(r.b1_sgst || 0), cess: Number(r.b1_cess || 0) },
          b2: { igst: Number(r.b2_igst || 0), cgst: Number(r.b2_cgst || 0), sgst: Number(r.b2_sgst || 0), cess: Number(r.b2_cess || 0) },
          c:  { igst: Number(r.c_igst || 0),  cgst: Number(r.c_cgst || 0),  sgst: Number(r.c_sgst || 0),  cess: Number(r.c_cess || 0) },
        });
      }
      setLoading(false);
    };
    run();
  }, [user, fy, q, p]);

  const headerPeriod = useMemo(() => `${fy || ''} – ${p || ''}`, [fy, p]);

  const clamp2 = (n: number) => Math.max(0, Math.round(n * 100) / 100);

  const setCell = (group: keyof ItcRows, col: keyof Cols, value: number) => {
    setRows(prev => {
      const next = { ...prev, [group]: { ...prev[group], [col]: Number.isFinite(value) ? value : 0 } } as ItcRows;
      const aTotal: Cols = {
        igst: clamp2(next.a3.igst + next.a5.igst),
        cgst: clamp2(next.a3.cgst + next.a5.cgst),
        sgst: clamp2(next.a3.sgst + next.a5.sgst),
        cess: clamp2(next.a3.cess + next.a5.cess),
      };
      const bTotal: Cols = {
        igst: clamp2(next.b1.igst + next.b2.igst),
        cgst: clamp2(next.b1.cgst + next.b2.cgst),
        sgst: clamp2(next.b1.sgst + next.b2.sgst),
        cess: clamp2(next.b1.cess + next.b2.cess),
      };
      next.c = {
        igst: clamp2(aTotal.igst - bTotal.igst),
        cgst: clamp2(aTotal.cgst - bTotal.cgst),
        sgst: clamp2(aTotal.sgst - bTotal.sgst),
        cess: clamp2(aTotal.cess - bTotal.cess),
      };
      return next;
    });
  };

  const handleSave = async (): Promise<boolean> => {
    if (!user) return false;
    const all = [rows.a3, rows.a5, rows.b1, rows.b2, rows.c];
    const hasNegative = all.some(g => Object.values(g).some(v => Number(v) < 0));
    if (hasNegative) {
      toast({ title: 'Validation Error', description: 'Values cannot be negative', variant: 'destructive' });
      return false;
    }
    const payload = {
      user_id: user.id,
      filing_year: fy,
      quarter: q,
      period: p,
      a3_igst: rows.a3.igst, a3_cgst: rows.a3.cgst, a3_sgst: rows.a3.sgst, a3_cess: rows.a3.cess,
      a5_igst: rows.a5.igst, a5_cgst: rows.a5.cgst, a5_sgst: rows.a5.sgst, a5_cess: rows.a5.cess,
      b1_igst: rows.b1.igst, b1_cgst: rows.b1.cgst, b1_sgst: rows.b1.sgst, b1_cess: rows.b1.cess,
      b2_igst: rows.b2.igst, b2_cgst: rows.b2.cgst, b2_sgst: rows.b2.sgst, b2_cess: rows.b2.cess,
      c_igst: rows.c.igst, c_cgst: rows.c.cgst, c_sgst: rows.c.sgst, c_cess: rows.c.cess,
    };
    const { error } = await supabase
      .from('gstr3b_eligible_itc')
      .upsert(payload, { onConflict: 'user_id,filing_year,quarter,period' });
    if (error) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
      return false;
    }

    const summaryPayload = {
      user_id: user.id,
      filing_year: fy,
      quarter: q,
      period: p,
      sec_4: {
        igst: rows.c.igst,
        cgst: rows.c.cgst,
        sgst: rows.c.sgst,
        cess: rows.c.cess
      },
      updated_at: new Date().toISOString()
    };
    const { error: sumErr } = await supabase.from('gstr3b_summary').upsert(summaryPayload, { onConflict: 'user_id,filing_year,quarter,period' });

    if (sumErr) {
       console.error("Summary update failed", sumErr);
       // We don't block navigation on summary failure but log it
    }

    toast({ title: 'Saved', description: 'Eligible ITC saved successfully' });
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
            <span className="text-gray-600 font-medium">4. Eligible ITC</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">GSTR-3B – 4. Eligible ITC</h1>
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
                  <th className="px-4 py-2 text-left font-medium">Details</th>
                  <th className="px-4 py-2 text-right font-medium">Integrated Tax (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">Central Tax (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">State/UT Tax (₹)</th>
                  <th className="px-4 py-2 text-right font-medium">CESS (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="px-4 py-2 font-semibold">(A) ITC Available (whether in full or part)</td><td /><td /><td /><td /></tr>
                <tr className="border-t">
                  <td className="px-4 py-2">(1) Import of goods</td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">(2) Import of services</td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2">(3) Inward supplies liable to reverse charge</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a3.igst} onChange={v => setCell('a3', 'igst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a3.cgst} onChange={v => setCell('a3', 'cgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a3.sgst} onChange={v => setCell('a3', 'sgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a3.cess} onChange={v => setCell('a3', 'cess', v)} /></td>
                </tr>
                <tr className="border-t">
                  <td className="px-4 py-2">(4) Inward supplies from ISD</td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={0} disabled /></td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2">(5) All other ITC</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a5.igst} onChange={v => setCell('a5', 'igst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a5.cgst} onChange={v => setCell('a5', 'cgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a5.sgst} onChange={v => setCell('a5', 'sgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.a5.cess} onChange={v => setCell('a5', 'cess', v)} /></td>
                </tr>

                <tr><td className="px-4 py-2 font-semibold">(B) ITC Reversed</td><td /><td /><td /><td /></tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2">(1) As per rules 38, 42 & 43 of CGST Rules and section 17(5)</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b1.igst} onChange={v => setCell('b1', 'igst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b1.cgst} onChange={v => setCell('b1', 'cgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b1.sgst} onChange={v => setCell('b1', 'sgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b1.cess} onChange={v => setCell('b1', 'cess', v)} /></td>
                </tr>
                <tr className="border-t bg-gray-50">
                  <td className="px-4 py-2">(2) Others</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b2.igst} onChange={v => setCell('b2', 'igst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b2.cgst} onChange={v => setCell('b2', 'cgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b2.sgst} onChange={v => setCell('b2', 'sgst', v)} /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.b2.cess} onChange={v => setCell('b2', 'cess', v)} /></td>
                </tr>

                <tr><td className="px-4 py-2 font-semibold">(C) Net ITC Available (A − B)</td><td /><td /><td /><td /></tr>
                <tr className="border-t">
                  <td className="px-4 py-2">Net ITC Available (A − B)</td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.igst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.cgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.sgst} disabled /></td>
                  <td className="px-4 py-2"><CurrencyInput value={rows.c.cess} disabled /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={handleBack}>BACK</Button>
            <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={handleConfirm}>CONFIRM</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gstr3bEligibleItcPage;
