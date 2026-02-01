import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Gstr3bTile from '@/components/Gstr3bTile';
import { toast } from 'sonner';

type TaxTotals = { igst: number; cgst: number; sgst: number; cess: number };

const mergeSummary = (existing: any, patch: Partial<Record<string, any>>) => ({
  ...(existing ?? {}),
  ...patch,
});

 

const Gstr3bPrepareOnlinePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();
  const location = useLocation();

  const [s31, setS31] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [s311, setS311] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [s32, setS32] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [s4, setS4] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [s5, setS5] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [s51, setS51] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [s61, setS61] = useState<TaxTotals>({ igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      if (!user || !fy || !q || !p) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase
        .from('gstr3b_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .maybeSingle();

      if (error) {
        console.error("Error loading summary:", error);
        setLoading(false);
        return;
      }

      // Helper to ensure structure
      const ensure = (obj: any) => ({
        igst: Number(obj?.igst || 0),
        cgst: Number(obj?.cgst || 0),
        sgst: Number(obj?.sgst || 0),
        cess: Number(obj?.cess || 0)
      });

      // ONLY read from summary table. Never recalculate here.
      setS31(ensure(data?.sec_3_1));
      setS32(ensure(data?.sec_3_2));
      setS4(ensure(data?.sec_4));
      setS5(ensure(data?.sec_5));
      setS51(ensure(data?.sec_5_1));
      setS61(ensure(data?.sec_6_1));
      
      // If sec_3_1_1 exists in schema, map it here. Otherwise default to 0.
      setS311(ensure(data?.sec_3_1_1)); 

      setLoading(false);
    };

    if (user && fy && q && p) {
      loadSummary();
    }
  }, [user, fy, q, p, location.key]);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to RESET all GSTR-3B data for this period? This action cannot be undone.')) {
      return;
    }
    setLoading(true);
    try {
      // Delete from summary table
      await supabase.from('gstr3b_summary').delete()
        .eq('user_id', user?.id).eq('filing_year', fy).eq('quarter', q).eq('period', p);

      // Delete from detailed tables
      await supabase.from('gstr3b_section_3_1').delete()
        .eq('user_id', user?.id).eq('filing_year', fy).eq('period', p);
        
      await supabase.from('gstr3b_3_1_summary').delete()
        .eq('user_id', user?.id).eq('filing_year', fy).eq('quarter', q).eq('period', p);
        
      await supabase.from('gstr3b_eligible_itc').delete()
        .eq('user_id', user?.id).eq('filing_year', fy).eq('quarter', q).eq('period', p);
        
      await supabase.from('gstr3b_payment_tax').delete()
        .eq('user_id', user?.id).eq('filing_year', fy).eq('quarter', q).eq('period', p);

      // Reset local state
      const z = { igst: 0, cgst: 0, sgst: 0, cess: 0 };
      setS31(z);
      setS32(z);
      setS311(z);
      setS4(z);
      setS5(z);
      setS51(z);
      setS61(z);

      toast.success("GSTR-3B data reset successfully");
      
    } catch (e: any) {
      console.error(e);
      toast.error("Error resetting data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const headerPeriod = useMemo(() => `${fy || ''} – ${p || ''}`, [fy, p]);

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">
      <main className="max-w-[1200px] mx-auto px-4 py-6 w-full">
        <nav className="text-sm mb-4">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <span className="text-gray-400">›</span>
            <Link to="/returns" className="text-blue-600 hover:underline">Returns</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">GSTR-3B – Prepare Online</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">GSTR-3B – Prepare Online</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/returns')}>Back to Returns</Button>
              <Button variant="destructive" onClick={handleReset}>RESET</Button>
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr3b/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>REFRESH</Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>GSTIN: <span className="font-medium">{user?.email || '—'}</span></div>
            <div>Legal Name: <span className="font-medium">—</span></div>
            <div>Trade Name: <span className="font-medium">—</span></div>
            <div>FY / Tax Period: <span className="font-medium">{headerPeriod}</span></div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">3.1 Tax on outward and reverse charge inward supplies</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">3.1.1 Supplies notified under section 9(5) of CGST Act, 2017</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">3.2 Inter-state supplies</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">4. Eligible ITC</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">5. Exempt, Nil and Non-GST inward supplies</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">5.1 Interest and Late fee for previous tax period</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
                <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
                  <div className="bg-[#17375E] text-white p-4"><div className="font-semibold">6.1 Payment of Tax</div></div>
                  <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /><div className="h-4 bg-gray-100 animate-pulse" /></div>
                </div>
              </>
            ) : (
              <>
                <Gstr3bTile
                  title="3.1 Tax on outward and reverse charge inward supplies"
                  rows={[
                    { label: 'Integrated Tax', value: s31.igst },
                    { label: 'Central Tax', value: s31.cgst },
                    { label: 'State/UT Tax', value: s31.sgst },
                    { label: 'CESS', value: s31.cess },
                  ]}
                  onClick={() => navigate(`/returns/gstr3b/3-1?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                />
                <Gstr3bTile
                  title="3.1.1 Supplies notified under section 9(5) of CGST Act, 2017"
                  rows={[
                    { label: 'Integrated Tax', value: s311.igst },
                    { label: 'Central Tax', value: s311.cgst },
                    { label: 'State/UT Tax', value: s311.sgst },
                    { label: 'CESS', value: s311.cess },
                  ]}
                />
                <Gstr3bTile
                  title="3.2 Inter-state supplies"
                  rows={[
                    { label: 'Integrated Tax', value: s32.igst },
                    { label: 'Central Tax', value: s32.cgst },
                    { label: 'State/UT Tax', value: s32.sgst },
                    { label: 'CESS', value: s32.cess },
                  ]}
                />
                <Gstr3bTile
                  title="4. Eligible ITC"
                  rows={[
                    { label: 'Integrated Tax', value: s4.igst },
                    { label: 'Central Tax', value: s4.cgst },
                    { label: 'State/UT Tax', value: s4.sgst },
                    { label: 'CESS', value: s4.cess },
                  ]}
                  onClick={() => navigate(`/returns/gstr3b/eligible-itc?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                />
                <Gstr3bTile
                  title="5. Exempt, Nil and Non-GST inward supplies"
                  rows={[
                    { label: 'Integrated Tax', value: s5.igst },
                    { label: 'Central Tax', value: s5.cgst },
                    { label: 'State/UT Tax', value: s5.sgst },
                    { label: 'CESS', value: s5.cess },
                  ]}
                />
                <Gstr3bTile
                  title="5.1 Interest and Late fee for previous tax period"
                  rows={[
                    { label: 'Integrated Tax', value: s51.igst },
                    { label: 'Central Tax', value: s51.cgst },
                    { label: 'State/UT Tax', value: s51.sgst },
                    { label: 'CESS', value: s51.cess },
                  ]}
                />
                <Gstr3bTile
                  title="6.1 Payment of Tax"
                  rows={[
                    { label: 'Integrated Tax', value: s61.igst },
                    { label: 'Central Tax', value: s61.cgst },
                    { label: 'State/UT Tax', value: s61.sgst },
                    { label: 'CESS', value: s61.cess },
                  ]}
                  onClick={() => navigate(`/returns/gstr3b/payment-of-tax?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                />
              </>
            )}
          </div>
          
          <div className="mt-8 flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow border">
             <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate('/returns')}>
                  Back
                </Button>
              
             </div>
             <div className="flex gap-4">
                <Button className="bg-[#1C244B] hover:bg-[#151b3a] text-white">
                  Save GSTR3B
                </Button>
               
                <Button 
                  className="bg-[#1C244B] hover:bg-[#151b3a] text-white"
                  onClick={() => navigate(`/returns/gstr3b/payment-of-tax?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                >
                  Proceed to payment
                </Button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gstr3bPrepareOnlinePage;
