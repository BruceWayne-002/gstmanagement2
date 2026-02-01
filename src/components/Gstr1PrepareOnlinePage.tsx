import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { saveUserData, loadUserData } from '@/lib/userStorage';
import { storageKeys } from '@/lib/storageKeys';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

type Gstr1SectionKey = "4A" | "7B2C" | "8A" | "12HSN" | "13";
type SummaryAgg = {
  count: number;
  value: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  cess?: number;
};
type SummaryPreview = {
  a4A: SummaryAgg;
  a7: SummaryAgg;
  a8A: SummaryAgg;
  a12: SummaryAgg;
  a13: { count: number };
};

const Gstr1PrepareOnlinePage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const [currentPeriod, setCurrentPeriod] = useState<{ financialYear: string; quarter: string; period: string } | null>(null);
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({
    "4A": 0,
    "5": 0,
    "6A": 0,
    "7B2C": 0,
    "8A": 0,
    "9B_REG": 0,
    "9B_UNREG": 0,
    "11A": 0,
    "11B": 0,
    "12HSN": 0,
    "13": 0,
    "14": 0,
    "15": 0,
  });
  const [countsLoading, setCountsLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [viewReady, setViewReady] = useState<boolean>(false);
  const [preview, setPreview] = useState<SummaryPreview | null>(null);

  const fetchCounts = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user || !fy || !q || !p) {
      setCountsLoading(false);
      return;
    }
    setCountsLoading(true);

    const tableMap: Record<string, string> = {
      "4A": "gstr1_b2b",
      "5": "gstr1_b2cl",
      "6A": "gstr1_exports",
      "7B2C": "gstr1_b2cs",
      "8A": "gstr1_nil_rated",
      "9B_REG": "gstr1_cd_registered",
      "9B_UNREG": "gstr1_cd_unregistered",
      "11A": "gstr1_advances_received",
      "11B": "gstr1_adjustment_advances",
      "12HSN": "gstr1_hsn",
      "13": "gstr1_documents_issued",
      "14": "gstr1_eco",
      "15": "gstr1_9_5",
    };

    try {
      const promises = Object.entries(tableMap).map(async ([key, table]) => {
        if (key === "8A") {
          const { data } = await supabase
            .from('gstr1_nil_rated')
            .select(`
              intra_reg_nil,
              intra_unreg_nil,
              inter_reg_nil,
              inter_unreg_nil,
              intra_reg_exempted,
              intra_unreg_exempted,
              inter_reg_exempted,
              inter_unreg_exempted,
              intra_reg_non_gst,
              intra_unreg_non_gst,
              inter_reg_non_gst,
              inter_unreg_non_gst
            `)
            .eq('user_id', user.id)
            .eq('filing_year', fy)
            .eq('quarter', q)
            .eq('period', p)
            .maybeSingle();
          const values = [
            data?.intra_reg_nil, data?.intra_unreg_nil, data?.inter_reg_nil, data?.inter_unreg_nil,
            data?.intra_reg_exempted, data?.intra_unreg_exempted, data?.inter_reg_exempted, data?.inter_unreg_exempted,
            data?.intra_reg_non_gst, data?.intra_unreg_non_gst, data?.inter_reg_non_gst, data?.inter_unreg_non_gst,
          ];
          const hasAny = values.some(v => Number(v || 0) > 0);
          return { key, count: hasAny ? 1 : 0 };
        } else if (key === "12HSN") {
          const { count } = await supabase
            .from('gstr1_hsn')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('filing_year', fy)
            .eq('quarter', q)
            .eq('period', p);
          return { key, count: count || 0 };
        } else if (key === "13") {
          const { count } = await supabase
            .from('gstr1_documents_issued')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('filing_year', fy)
            .eq('quarter', q)
            .eq('period', p);
          return { key, count: count && count > 0 ? 1 : 0 };
        } else {
          const selectCols = key === "4A" ? 'id' : '*';
          const { count } = await supabase
            .from(table)
            .select(selectCols, { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('filing_year', fy)
            .eq('quarter', q)
            .eq('period', p);
          return { key, count: count || 0 };
        }
      });

      const results = await Promise.all(promises);
      const newCounts: Record<string, number> = {};
      results.forEach(({ key, count }) => {
        newCounts[key] = count;
      });

      setSectionCounts((prev) => ({ ...prev, ...newCounts }));
    } catch (error) {
      console.error("Error fetching GSTR-1 counts:", error);
    } finally {
      setCountsLoading(false);
    }
  }, [fy, q, p]);

  useEffect(() => {
    fetchCounts();
  }, [fy, q, p, fetchCounts]);
  useEffect(() => {
    fetchCounts();
  }, [location.pathname, fetchCounts]);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && fy && q && p) {
        fetchCounts();
      }
    });
    const onFocus = () => fetchCounts();
    window.addEventListener('focus', onFocus);
    return () => {
      subscription?.subscription.unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [fy, q, p, fetchCounts]);

  const handleGenerateSummary = async () => {
    setAnalyzing(true);
    setViewReady(false);
    setPreview(null);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !fy || !q || !p) {
      setAnalyzing(false);
      return;
    }
    try {
      const key4A = storageKeys.gstr1B2B(fy, q, p);
      type B2BStored = { totalInvoiceValue?: number; igst?: number; cgst?: number; sgst?: number; cess?: number; taxable_value?: number };
      const b2bStored = await loadUserData<B2BStored[]>(key4A);
      const q7 = supabase
        .from('gstr1_b2cs')
        .select('id, taxable_value, integrated_tax, central_tax, state_tax, cess')
        .eq('user_id', user.id).eq('filing_year', fy).eq('quarter', q).eq('period', p);
      const q12 = supabase
        .from('gstr1_hsn')
        .select('id, taxable_value, igst, cgst, sgst, cess')
        .eq('user_id', user.id).eq('filing_year', fy).eq('quarter', q).eq('period', p);
      const [r7, r12] = await Promise.all([q7, q12]);
      const rows4A = Array.isArray(b2bStored) ? b2bStored : [];
      const rows7 = Array.isArray((r7 as { data: { taxable_value?: number; integrated_tax?: number; central_tax?: number; state_tax?: number; cess?: number }[] | null }).data)
        ? (((r7 as { data: { taxable_value?: number; integrated_tax?: number; central_tax?: number; state_tax?: number; cess?: number }[] | null }).data as { taxable_value?: number; integrated_tax?: number; central_tax?: number; state_tax?: number; cess?: number }[]) || [])
        : [];
      const rows12 = Array.isArray((r12 as { data: { taxable_value?: number; igst?: number; cgst?: number; sgst?: number; cess?: number }[] | null }).data)
        ? (((r12 as { data: { taxable_value?: number; igst?: number; cgst?: number; sgst?: number; cess?: number }[] | null }).data as { taxable_value?: number; igst?: number; cgst?: number; sgst?: number; cess?: number }[]) || [])
        : [];
      const previewData: SummaryPreview = {
        a4A: {
          count: rows4A.length,
          value: rows4A.reduce((s, r) => s + Number(r.totalInvoiceValue || r.taxable_value || 0), 0),
          igst: rows4A.reduce((s, r) => s + Number(r.igst || 0), 0),
          cgst: rows4A.reduce((s, r) => s + Number(r.cgst || 0), 0),
          sgst: rows4A.reduce((s, r) => s + Number(r.sgst || 0), 0),
          cess: rows4A.reduce((s, r) => s + Number(r.cess || 0), 0),
        },
        a7: {
          count: rows7.length,
          value: rows7.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
          igst: rows7.reduce((s, r) => s + Number(r.integrated_tax || 0), 0),
          cgst: rows7.reduce((s, r) => s + Number(r.central_tax || 0), 0),
          sgst: rows7.reduce((s, r) => s + Number(r.state_tax || 0), 0),
          cess: rows7.reduce((s, r) => s + Number(r.cess || 0), 0),
        },
        a8A: { count: 0, value: 0 },
        a12: {
          count: rows12.length,
          value: rows12.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
          igst: rows12.reduce((s, r) => s + Number(r.igst || 0), 0),
          cgst: rows12.reduce((s, r) => s + Number(r.cgst || 0), 0),
          sgst: rows12.reduce((s, r) => s + Number(r.sgst || 0), 0),
          cess: rows12.reduce((s, r) => s + Number(r.cess || 0), 0),
        },
        a13: { count: 0 },
      };
      setPreview(previewData);
      setViewReady(true);
    } catch (e) {
      setViewReady(false);
    } finally {
      setAnalyzing(false);
    }
  };

  const sections: { key: Gstr1SectionKey; code: string; title: string }[] = [
    {
      key: "4A",
      code: "4A,4B,6B,6C – B2B, SEZ, DE",
      title: "Taxable outward supplies (other than zero rated, nil rated and exempted)",
    },
    {
      key: "7B2C",
      code: "7 – B2C (Others)",
      title: "B2C (Others)",
    },
    {
      key: "8A",
      code: "8A,8B,8D",
      title: "Nil Rated Supplies – Supplies to registered persons (Composition taxable person)",
    },
    {
      key: "12HSN",
      code: "12",
      title: "HSN-Wise Summary of Outward Supplies",
    },
    {
      key: "13",
      code: "13 – Documents issued",
      title: "Documents issued",
    },
  ];

  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const handleResetAll = async () => {
    try {
      await saveUserData(storageKeys.gstr1B2B(fy, q, p), []);
      await saveUserData(storageKeys.gstr1B2CS(fy, q, p), []);
      await saveUserData(storageKeys.gstr1HSN(fy, q, p), []);
      await saveUserData(storageKeys.gstr1Docs(fy, q, p), []);
      setSectionCounts({
        "4A": 0,
        "7B2C": 0,
        "8A": 0,
        "12HSN": 0,
        "13": 0,
      });
    } catch (e) {
      console.error('Failed to reset data', e);
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
            <Link to="/returns" className="text-blue-600 hover:underline">File Returns</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">GSTR-1 – Prepare Online</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">GSTR-1 – Prepare Online</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/returns')}>Back to Returns</Button>
              {analyzing ? (
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" disabled>
                  <span className="inline-block w-4 h-4 mr-2 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Analyzing data…
                </Button>
              ) : viewReady ? (
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/summary?fy=${fy}&q=${q}&p=${p}`)}>
                  View Summary
                </Button>
              ) : (
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={handleGenerateSummary}>
                  Generate Summary
                </Button>
              )}
            </div>
          </div>

          {/* Official GST tile order */}
          {/* Row 1 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 4A, 4B, 6B, 6C – B2B, SEZ, DE Invoices */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">4A, 4B, 6B, 6C – B2B, SEZ, DE Invoices</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["4A"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["4A"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/b2b?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 5 – B2C (Large) Invoices */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">5 – B2C (Large) Invoices</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["5"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["5"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]">ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 6A – Exports Invoices */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">6A – Exports Invoices</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["6A"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["6A"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]">ADD / EDIT DETAILS</Button>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 7 – B2C (Others) */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">7 – B2C (Others)</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["7B2C"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["7B2C"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/b2cs?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 8A, 8B, 8C, 8D – Nil Rated Supplies */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">8A, 8B, 8C, 8D – Nil Rated Supplies</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["8A"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["8A"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/nil-rated?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 9B – Credit / Debit Notes (Registered) */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">9B – Credit / Debit Notes (Registered)</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["9B_REG"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["9B_REG"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]">ADD / EDIT DETAILS</Button>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 9B – Credit / Debit Notes (Unregistered) */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">9B – Credit / Debit Notes (Unregistered)</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["9B_UNREG"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["9B_UNREG"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]">ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 11A(1), 11A(2) – Tax Liability (Advances Received) */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">11A(1), 11A(2) – Tax Liability (Advances Received)</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["11A"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["11A"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]">ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 11B(1), 11B(2) – Adjustment of Advances */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">11B(1), 11B(2) – Adjustment of Advances</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["11B"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["11B"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]">ADD / EDIT DETAILS</Button>
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 12 – HSN-wise Summary of Outward Supplies */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">12 – HSN-wise Summary of Outward Supplies</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["12HSN"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["12HSN"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/hsn-summary?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 13 – Documents Issued */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">13 – Documents Issued</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["13"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["13"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/documents-issued?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
            {/* 14 – Supplies made through ECO */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">14 – Supplies made through ECO</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["14"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["14"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => toast({ title: "Coming Soon", description: "ECO Supplies module is under development." })}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
          </div>

          {/* Row 5 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 15 – Supplies u/s 9(5) */}
            <div className="rounded-md overflow-hidden shadow bg-white dark:bg-gray-900 border">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">15 – Supplies u/s 9(5)</div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {countsLoading ? <span className="inline-block w-5 h-5" /> : (sectionCounts["15"] > 0 ? <Check className="h-5 w-5 text-green-600" /> : <span className="inline-block w-5 h-5" />)}
                  {countsLoading ? (
                    <span className="inline-block w-6 h-6 rounded bg-gray-300 dark:bg-gray-700 animate-pulse" />
                  ) : (
                    <span className="text-xl font-bold animate-fade-in">{sectionCounts["15"]}</span>
                  )}
                </div>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => toast({ title: "Coming Soon", description: "Supplies u/s 9(5) module is under development." })}>ADD / EDIT DETAILS</Button>
              </div>
            </div>
          </div>
          {/* Global action bar */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-[#234E8F] hover:bg-[#1d447e]" variant="outline">Reset</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm reset</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all draft data across B2B, B2C, Nil Rated, HSN Summary, and Documents Issued. Proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetAll}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gstr1PrepareOnlinePage;
