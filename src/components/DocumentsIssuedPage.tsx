import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Loader2, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type OutwardRow = {
  id: string;
  from: number | '';
  to: number | '';
  total: number | '';
  cancelled: number | '';
};

type Period = { financialYear: string; quarter: string; period: string };
type OutwardRowPersist = { id: string; from: number; to: number; total: number; cancelled: number };
type Sec13Record = {
  financialYear: string;
  quarter: string;
  period: string;
  section: '13';
  outwardRows: OutwardRowPersist[];
};

const categories = [
  'Invoices for outward supply',
  'Invoices for inward supply from unregistered person',
  'Revised Invoice',
  'Debit Note',
  'Credit Note',
  'Receipt Voucher',
  'Payment Voucher',
  'Refund Voucher',
  'Delivery Challan for job work',
  'Delivery Challan for supply on approval',
  'Delivery Challan in case of liquid gas',
  'Delivery Challan in cases other than by way of supply',
] as const;

const DocumentsIssuedPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const [outwardRows, setOutwardRows] = useState<OutwardRow[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const period = { financialYear: fy, quarter: q, period: p };
    setCurrentPeriod(fy && q && p ? period : null);
    const load = async () => {
      if (!user || !fy || !q || !p) return;
      const { data, error } = await supabase
        .from('gstr1_documents_issued')
        .select('id, sr_from, sr_to, total, cancelled')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .eq('document_type', 'Invoices for outward supply')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        setOutwardRows(
          data.map((row: { id: string; sr_from: number; sr_to: number; total: number; cancelled: number }) => ({
            id: row.id,
            from: row.sr_from,
            to: row.sr_to,
            total: row.total,
            cancelled: row.cancelled,
          })),
        );
      }
    };
    load();
  }, [user, fy, q, p]);

  const addOutwardRow = () => {
    const id = (globalThis.crypto && 'randomUUID' in globalThis.crypto)
      ? (globalThis.crypto as Crypto).randomUUID()
      : `doc_${Date.now()}`;
    setOutwardRows((prev) => [...prev, { id, from: '', to: '', total: '', cancelled: '' }]);
  };

  const deleteOutwardRow = (id: string) => {
    setOutwardRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      const run = async () => {
        if (!user || !fy || !q || !p) return;
        await supabase
          .from('gstr1_documents_issued')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id)
          .eq('filing_year', fy)
          .eq('quarter', q)
          .eq('period', p)
          .eq('document_type', 'Invoices for outward supply');
        setSaveOk(true);
        setTimeout(() => setSaveOk(false), 800);
      };
      run();
      return next;
    });
  };

  const netIssued = useMemo(() => {
    return outwardRows.reduce<Record<string, number>>((acc, r) => {
      const total = typeof r.total === 'number' ? r.total : Number(r.total || 0);
      const cancelled = typeof r.cancelled === 'number' ? r.cancelled : Number(r.cancelled || 0);
      acc[r.id] = Math.max(0, total - cancelled);
      return acc;
    }, {});
  }, [outwardRows]);

  const updateField = (id: string, key: keyof OutwardRow, value: string) => {
    setOutwardRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value === '' ? '' : Math.max(0, Number(value) || 0) } : r)),
    );
  };

  const save = async () => {
    if (saving) return;
    setError(null);
    for (const [i, r] of outwardRows.entries()) {
      const from = typeof r.from === 'number' ? r.from : Number(r.from);
      const to = typeof r.to === 'number' ? r.to : Number(r.to);
      const total = typeof r.total === 'number' ? r.total : Number(r.total);
      const cancelled = typeof r.cancelled === 'number' ? r.cancelled : Number(r.cancelled);
      if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(total) || !Number.isFinite(cancelled)) {
        setError(`Row ${i + 1}: All fields must be numeric.`);
        return;
      }
      if (String(r.from) === '' || String(r.to) === '' || String(r.total) === '' || String(r.cancelled) === '') {
        setError(`Row ${i + 1}: All fields are mandatory.`);
        return;
      }
      if (cancelled > total) {
        setError(`Row ${i + 1}: Cancelled cannot be greater than Total number.`);
        return;
      }
      if (from < 0 || to < 0 || total < 0 || cancelled < 0) {
        setError(`Row ${i + 1}: Values cannot be negative.`);
        return;
      }
    }
    setSaving(true);
    if (!user || !fy || !q || !p) {
      setSaving(false);
      return;
    }
    const { error: delError } = await supabase
      .from('gstr1_documents_issued')
      .delete()
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p)
      .eq('document_type', 'Invoices for outward supply');
    if (delError) {
      setSaving(false);
      alert(delError.message);
      return;
    }
    const payload = outwardRows.map((r) => ({
      user_id: user.id,
      filing_year: fy,
      quarter: q,
      period: p,
      document_type: 'Invoices for outward supply',
      row_key: `${user.id}-${fy}-${q}-${p}-Invoices for outward supply-${outwardRows.indexOf(r)}`,
      sr_from: typeof r.from === 'number' ? r.from : Number(r.from || 0),
      sr_to: typeof r.to === 'number' ? r.to : Number(r.to || 0),
      total: typeof r.total === 'number' ? r.total : Number(r.total || 0),
      cancelled: typeof r.cancelled === 'number' ? r.cancelled : Number(r.cancelled || 0),
      net_issued:
        (typeof r.total === 'number' ? r.total : Number(r.total || 0)) -
        (typeof r.cancelled === 'number' ? r.cancelled : Number(r.cancelled || 0)),
    }));
    if (payload.length > 0) {
      const { error } = await supabase
        .from('gstr1_documents_issued')
        .insert(payload);
      if (error) {
        setSaving(false);
        alert(error.message);
        return;
      }
    }
    setSaving(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 1200);
    const { data } = await supabase
      .from('gstr1_documents_issued')
      .select('id, sr_from, sr_to, total, cancelled')
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p)
      .eq('document_type', 'Invoices for outward supply')
      .order('created_at', { ascending: false });
    if (Array.isArray(data)) {
      setOutwardRows(
        data.map((row: { id: string; sr_from: number; sr_to: number; total: number; cancelled: number }) => ({
          id: row.id,
          from: row.sr_from,
          to: row.sr_to,
          total: row.total,
          cancelled: row.cancelled,
        })),
      );
    }
  };

  // Removed localStorage persistence in favor of Supabase inserts

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
            <span className="text-gray-600 font-medium">13 – Documents issued during the tax period</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold">13 – Documents issued during the tax period</h1>
            <Button variant="outline" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>BACK</Button>
          </div>
          <div className="text-sm text-gray-600 mb-4">Note: Kindly click on save button after any modification (add, edit, delete) to save the changes</div>

          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Invoices for outward supply</h2>
              {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2">{error}</div>}
              <div className="overflow-x-auto">
                <Table className="min-w-full bg-white dark:bg-gray-900">
                  <TableHeader>
                    <TableRow>
                      <TableHead>No.</TableHead>
                      <TableHead>Sr. No. From</TableHead>
                      <TableHead>Sr. No. To</TableHead>
                      <TableHead>Total number</TableHead>
                      <TableHead>Cancelled</TableHead>
                      <TableHead>Net issued</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outwardRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="rounded-md border bg-blue-50 text-blue-800 p-3">There are no documents to be displayed.</div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      outwardRows.map((r, idx) => (
                        <TableRow key={r.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell className="max-w-[150px]">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={r.from === '' ? '' : String(r.from)}
                              onChange={(e) => updateField(r.id, 'from', e.target.value)}
                              placeholder="0"
                              disabled={saving}
                              className={saving ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                            />
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={r.to === '' ? '' : String(r.to)}
                              onChange={(e) => updateField(r.id, 'to', e.target.value)}
                              placeholder="0"
                              disabled={saving}
                              className={saving ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                            />
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={r.total === '' ? '' : String(r.total)}
                              onChange={(e) => updateField(r.id, 'total', e.target.value)}
                              placeholder="0"
                              disabled={saving}
                              className={saving ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                            />
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <Input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={r.cancelled === '' ? '' : String(r.cancelled)}
                              onChange={(e) => updateField(r.id, 'cancelled', e.target.value)}
                              placeholder="0"
                              disabled={saving}
                              className={saving ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                            />
                          </TableCell>
                          <TableCell className="max-w-[150px]">
                            <Input value={String(netIssued[r.id] ?? 0)} readOnly />
                          </TableCell>
                          <TableCell>
                            <Button variant="destructive" size="sm" onClick={() => deleteOutwardRow(r.id)} disabled={saving}>
                              <Trash className="h-4 w-4" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3">
                <Button className="bg-[#234E8F] hover:bg-[#1d447e] transition-all duration-200" onClick={addOutwardRow} disabled={saving}>
                  ADD DOCUMENT
                </Button>
              </div>
            </section>

            {categories.slice(1).map((title, i) => (
              <section key={i}>
                <h2 className="text-lg font-semibold mb-2">{`${i + 2}. ${title}`}</h2>
                <div className="overflow-x-auto">
                  <Table className="min-w-full bg-white dark:bg-gray-900">
                    <TableHeader>
                      <TableRow>
                        <TableHead>No.</TableHead>
                        <TableHead>Sr. No. From</TableHead>
                        <TableHead>Sr. No. To</TableHead>
                        <TableHead>Total number</TableHead>
                        <TableHead>Cancelled</TableHead>
                        <TableHead>Net issued</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="rounded-md border bg-blue-50 text-blue-800 p-3">There are no documents to be displayed.</div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3">
                  <Button className="bg-gray-400 hover:bg-gray-400/80" disabled>ADD DOCUMENT</Button>
                </div>
              </section>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="bg-[#234E8F] hover:bg-[#1d447e] min-w-[120px]" onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : saveOk ? (
                <>✔ Saved</>
              ) : (
                <>SAVE</>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentsIssuedPage;
