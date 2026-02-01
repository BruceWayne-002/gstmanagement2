import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { loadUserData } from '@/lib/userStorage';
import { storageKeys } from '@/lib/storageKeys';

type LocalB2BRow = {
  id: string;
  gstin: string;
  recipientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  posCode: string;
  posName?: string;
  supplyType: string;
  totalInvoiceValue: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  cess?: number;
};
type B2CSRow = {
  id: string;
  taxable_value: number;
  integrated_tax?: number;
  central_tax?: number;
  state_tax?: number;
  cess?: number;
};
type HSNRow = {
  id: string;
  taxable_value: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  cess?: number;
};
type Row = {
  description: string;
  records: number;
  docType: string;
  value: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
};

const NumberCell: React.FC<{ value: number; grey?: boolean; bold?: boolean }> = ({ value, grey, bold }) => {
  const formatted = useMemo(() => (value ? value.toFixed(2) : '0.00'), [value]);
  return <span className={`tabular-nums ${grey ? 'bg-gray-100 text-gray-400 px-2 py-1 rounded-sm' : ''} ${bold ? 'font-semibold' : ''} block text-right`}>{formatted}</span>;
};

const SummaryRow: React.FC<{ row: Row; total?: boolean }> = ({ row, total }) => (
  <TableRow className={`${total ? 'bg-gray-100 font-semibold' : ''}`}>
    <TableCell className={`${total ? 'font-semibold' : ''}`}>{row.description}</TableCell>
    <TableCell className="text-right">{row.records}</TableCell>
    <TableCell>{row.docType}</TableCell>
    <TableCell className="text-right"><NumberCell value={row.value} /></TableCell>
    <TableCell className="text-right"><NumberCell value={row.igst} /></TableCell>
    <TableCell className="text-right"><NumberCell value={row.cgst} /></TableCell>
    <TableCell className="text-right"><NumberCell value={row.sgst} /></TableCell>
    <TableCell className="text-right"><NumberCell value={row.cess} /></TableCell>
  </TableRow>
);

const ExpandableBlock: React.FC<{ title: string; childrenRows: Row[] }> = ({ title, childrenRows }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow>
        <TableCell colSpan={8}>
          <button className="flex items-center gap-2 text-sm" onClick={() => setOpen(!open)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span>{title}</span>
          </button>
        </TableCell>
      </TableRow>
      <tr>
        <td colSpan={8}>
          <div className={`transition-all duration-300 ${open ? 'max-h-[600px]' : 'max-h-0'} overflow-hidden`}>
            <div className="bg-gray-50">
              <Table className="w-full">
                <TableBody>
                  {childrenRows.map((r, idx) => (
                    <TableRow key={`${r.description}-${idx}`} className="bg-gray-50">
                      <TableCell className="pl-8">{r.description}</TableCell>
                      <TableCell className="text-right">{r.records}</TableCell>
                      <TableCell>{r.docType}</TableCell>
                      <TableCell className="text-right"><NumberCell value={r.value} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={r.igst} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={r.cgst} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={r.sgst} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={r.cess} grey /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
};

const Gstr1SummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [hsnChildren, setHsnChildren] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [a4Agg, setA4Agg] = useState({ count: 0, value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [a7Agg, setA7Agg] = useState({ count: 0, value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [a12Agg, setA12Agg] = useState({ count: 0, value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 });
  const [section8, setSection8] = useState({ total: 0, nil: 0, exempted: 0, non_gst: 0 });
  const [docsCount, setDocsCount] = useState(0);
  const [docsValue, setDocsValue] = useState(0);
  const [docsIssued, setDocsIssued] = useState(0);
  const [docsCancelled, setDocsCancelled] = useState(0);

  const loadSummary = useCallback(async () => {
    if (!user || !fy || !q || !p) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const run = async () => {
      const b2bAgg = supabase
        .from('gstr1_b2b')
        .select(`
          id,
          total_invoice_value,
          integrated_tax,
          central_tax,
          state_ut_tax,
          cess
        `)
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p);

      const b2csAgg = supabase
        .from('gstr1_b2cs')
        .select('id, taxable_value, integrated_tax, central_tax, state_tax, cess')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p);

      const nilRes = await supabase
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

      const hsnAgg = supabase
        .from('gstr1_hsn')
        .select('id, taxable_value, igst, cgst, sgst, cess, supply_type')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p);

      const docsTotalsAgg = supabase
        .from('gstr1_documents_issued')
        .select('total, cancelled')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p);

      const [b2bRes, b2csRes, hsnRes, docsTotalsRes] = await Promise.all([b2bAgg, b2csAgg, hsnAgg, docsTotalsAgg]);

      const b2bData = (b2bRes as { data: unknown[] | null }).data;
      const b2bRows: { id: string; total_invoice_value?: number; integrated_tax?: number; central_tax?: number; state_ut_tax?: number; cess?: number }[] =
        Array.isArray(b2bData)
          ? ((b2bData as { id: string; total_invoice_value?: number; integrated_tax?: number; central_tax?: number; state_ut_tax?: number; cess?: number }[]) || [])
          : [];
      const a4 = {
        count: b2bRows.length,
        value: b2bRows.reduce((s, r) => s + Number(r.total_invoice_value || 0), 0),
        igst: b2bRows.reduce((s, r) => s + Number(r.integrated_tax || 0), 0),
        cgst: b2bRows.reduce((s, r) => s + Number(r.central_tax || 0), 0),
        sgst: b2bRows.reduce((s, r) => s + Number(r.state_ut_tax || 0), 0),
        cess: b2bRows.reduce((s, r) => s + Number(r.cess || 0), 0),
      };
      const b2csData = (b2csRes as { data: unknown[] | null }).data;
      const b2csRows: B2CSRow[] = Array.isArray(b2csData)
        ? (((b2csData as B2CSRow[]) || []))
        : [];
      const a7 = {
        count: b2csRows.length,
        value: b2csRows.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
        igst: b2csRows.reduce((s, r) => s + Number(r.integrated_tax || 0), 0),
        cgst: b2csRows.reduce((s, r) => s + Number(r.central_tax || 0), 0),
        sgst: b2csRows.reduce((s, r) => s + Number(r.state_tax || 0), 0),
        cess: b2csRows.reduce((s, r) => s + Number(r.cess || 0), 0),
      };
      const hsnData = (hsnRes as { data: unknown[] | null }).data;
      type HSNRowExt = HSNRow & { supply_type: 'B2B' | 'B2C' };
      const hsnRows: HSNRowExt[] = Array.isArray(hsnData) ? ((hsnData as HSNRowExt[]) || []) : [];
      const hsnB2bRows = hsnRows.filter((r) => r.supply_type === 'B2B');
      const hsnB2cRows = hsnRows.filter((r) => r.supply_type === 'B2C');
      const a12 = {
        count: hsnRows.length,
        value: hsnRows.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
        igst: hsnRows.reduce((s, r) => s + Number(r.igst || 0), 0),
        cgst: hsnRows.reduce((s, r) => s + Number(r.cgst || 0), 0),
        sgst: hsnRows.reduce((s, r) => s + Number(r.sgst || 0), 0),
        cess: hsnRows.reduce((s, r) => s + Number(r.cess || 0), 0),
      };
      const a12B2B = {
        count: hsnB2bRows.length,
        value: hsnB2bRows.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
        igst: hsnB2bRows.reduce((s, r) => s + Number(r.igst || 0), 0),
        cgst: hsnB2bRows.reduce((s, r) => s + Number(r.cgst || 0), 0),
        sgst: hsnB2bRows.reduce((s, r) => s + Number(r.sgst || 0), 0),
        cess: hsnB2bRows.reduce((s, r) => s + Number(r.cess || 0), 0),
      };
      const a12B2C = {
        count: hsnB2cRows.length,
        value: hsnB2cRows.reduce((s, r) => s + Number(r.taxable_value || 0), 0),
        igst: hsnB2cRows.reduce((s, r) => s + Number(r.igst || 0), 0),
        cgst: hsnB2cRows.reduce((s, r) => s + Number(r.cgst || 0), 0),
        sgst: hsnB2cRows.reduce((s, r) => s + Number(r.sgst || 0), 0),
        cess: hsnB2cRows.reduce((s, r) => s + Number(r.cess || 0), 0),
      };

      const b2bRow: Row = {
        description: '4A – B2B Regular',
        records: a4.count,
        docType: 'Invoice',
        value: a4.value,
        igst: a4.igst || 0,
        cgst: a4.cgst || 0,
        sgst: a4.sgst || 0,
        cess: a4.cess || 0,
      };
      const b2csRow: Row = {
        description: '7 – B2C (Others)',
        records: a7.count,
        docType: 'Net Value',
        value: a7.value,
        igst: a7.igst,
        cgst: a7.cgst,
        sgst: a7.sgst,
        cess: a7.cess,
      };
      type NilRatedData = {
        intra_reg_nil?: number;
        intra_unreg_nil?: number;
        inter_reg_nil?: number;
        inter_unreg_nil?: number;
        intra_reg_exempted?: number;
        intra_unreg_exempted?: number;
        inter_reg_exempted?: number;
        inter_unreg_exempted?: number;
        intra_reg_non_gst?: number;
        intra_unreg_non_gst?: number;
        inter_reg_non_gst?: number;
        inter_unreg_non_gst?: number;
      };
      const nilData = (nilRes as { data: NilRatedData | null }).data;
      const nilValue = nilData
        ? Number(nilData.intra_reg_nil || 0) +
          Number(nilData.intra_unreg_nil || 0) +
          Number(nilData.inter_reg_nil || 0) +
          Number(nilData.inter_unreg_nil || 0)
        : 0;
      const nilRow: Row = {
        description: '8A – Nil Rated',
        records: nilData ? 1 : 0,
        docType: 'Invoice',
        value: nilValue,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      };
      const exemptedValue = nilData
        ? Number(nilData.intra_reg_exempted || 0) +
          Number(nilData.intra_unreg_exempted || 0) +
          Number(nilData.inter_reg_exempted || 0) +
          Number(nilData.inter_unreg_exempted || 0)
        : 0;
      const nonGstValue = nilData
        ? Number(nilData.intra_reg_non_gst || 0) +
          Number(nilData.intra_unreg_non_gst || 0) +
          Number(nilData.inter_reg_non_gst || 0) +
          Number(nilData.inter_unreg_non_gst || 0)
        : 0;
      const hsnTotals: Row = {
        description: '12 – HSN Summary – Total',
        records: a12.count,
        docType: 'Invoice',
        value: a12.value,
        igst: a12.igst,
        cgst: a12.cgst,
        sgst: a12.sgst,
        cess: a12.cess,
      };
      const hsnB2B: Row = {
        description: '12 – HSN Summary – B2B',
        records: a12B2B.count,
        docType: 'Invoice',
        value: a12B2B.value,
        igst: a12B2B.igst,
        cgst: a12B2B.cgst,
        sgst: a12B2B.sgst,
        cess: a12B2B.cess,
      };
      const hsnB2C: Row = {
        description: '12 – HSN Summary – B2C',
        records: a12B2C.count,
        docType: 'Invoice',
        value: a12B2C.value,
        igst: a12B2C.igst,
        cgst: a12B2C.cgst,
        sgst: a12B2C.sgst,
        cess: a12B2C.cess,
      };
      const docsTotalsData = (docsTotalsRes as { data: { total?: number; cancelled?: number }[] | null }).data;
      const issuedTotal = Array.isArray(docsTotalsData) ? docsTotalsData.reduce((s, r) => s + Number(r.total || 0), 0) : 0;
      const cancelledTotal = Array.isArray(docsTotalsData) ? docsTotalsData.reduce((s, r) => s + Number(r.cancelled || 0), 0) : 0;
      const netIssued = Math.max(0, issuedTotal - cancelledTotal);
      setDocsIssued(issuedTotal);
      setDocsCancelled(cancelledTotal);
      setDocsCount(netIssued);
      setDocsValue(netIssued);
      const dummyRow = (desc: string): Row => ({
        description: desc,
        records: 0,
        docType: 'Invoice',
        value: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      });
      const rowsOrdered: Row[] = [
        b2bRow,
        dummyRow('4B – Reverse Charge (Dummy)'),
        dummyRow('5 – B2CL (Dummy)'),
        dummyRow('6 – Exports (Dummy)'),
        b2csRow,
        nilRow,
        hsnTotals,
        {
          description: '13 – Documents Issued',
          records: netIssued,
          docType: 'All Documents',
          value: netIssued,
          igst: 0,
          cgst: 0,
          sgst: 0,
          cess: 0,
        },
      ];
      setHsnChildren([hsnB2B, hsnB2C]);
      const section8Total = nilValue + exemptedValue + nonGstValue;
      setA4Agg(a4);
      setA7Agg(a7);
      setA12Agg(a12);
      setSection8({ total: section8Total, nil: nilValue, exempted: exemptedValue, non_gst: nonGstValue });
      setRows(rowsOrdered);
      setLoading(false);
    };
    await run();
  }, [user, fy, q, p]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const headerPeriod = useMemo(() => {
    return `${fy || ''} – ${p || ''}`;
  }, [fy, p]);

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors">
      <main className="max-w-[1200px] mx-auto px-4 py-6 w-full">
        <nav className="text-sm mb-4">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
            <span className="text-gray-400">›</span>
            <Link to="/returns" className="text-blue-600 hover:underline">Returns</Link>
            <span className="text-gray-400">›</span>
            <Link to={`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`} className="text-blue-600 hover:underline">GSTR-1</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">Summary</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Consolidated Summary</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>BACK</Button>
              <Button variant="outline" onClick={() => window.print()}>Download (PDF)</Button>
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>FILE STATEMENT</Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>GSTIN: <span className="font-medium">{user?.email || '—'}</span></div>
            <div>Legal Name: <span className="font-medium">—</span></div>
            <div>Trade Name: <span className="font-medium">—</span></div>
            <div>FY / Tax Period: <span className="font-medium">{headerPeriod}</span></div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <Table className="min-w-full bg-white dark:bg-gray-900">
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>No. of Records</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Value (₹)</TableHead>
                  <TableHead>Integrated tax (₹)</TableHead>
                  <TableHead>Central tax (₹)</TableHead>
                  <TableHead>State/UT tax (₹)</TableHead>
                  <TableHead>CESS (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`sk-${i}`} className="animate-pulse">
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                    </TableRow>
                  ))
                ) : (
                  <>
                    <TableRow className="bg-gray-50">
                      <TableCell className="font-semibold">4A – Taxable outward supplies made to registered persons – B2B Regular</TableCell>
                      <TableCell className="text-right font-semibold">{a4Agg.count}</TableCell>
                      <TableCell className="font-semibold">Invoice</TableCell>
                      <TableCell className="text-right"><NumberCell value={a4Agg.value} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a4Agg.igst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a4Agg.cgst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a4Agg.sgst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a4Agg.cess} bold /></TableCell>
                    </TableRow>
                    <ExpandableBlock
                      title="Recipient wise summary"
                      childrenRows={[
                        { description: 'Recipient wise summary', records: 0, docType: 'Invoice', value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
                      ]}
                    />

                    <TableRow>
                      <TableCell>4B – Taxable outward supplies made to registered persons attracting reverse charge – B2B Reverse charge</TableCell>
                      <TableCell className="text-right">0</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell className="text-right"><NumberCell value={0} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>5 – B2CL (Large)</TableCell>
                      <TableCell className="text-right">0</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell className="text-right"><NumberCell value={0} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell>6 – Exports</TableCell>
                      <TableCell className="text-right">0</TableCell>
                      <TableCell>Invoice</TableCell>
                      <TableCell className="text-right"><NumberCell value={0} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>

                    <TableRow className="bg-gray-50">
                      <TableCell className="font-semibold">7 – Taxable supplies to unregistered persons – B2CS (Others)</TableCell>
                      <TableCell className="text-right font-semibold">{a7Agg.count}</TableCell>
                      <TableCell className="font-semibold">Net Value</TableCell>
                      <TableCell className="text-right"><NumberCell value={a7Agg.value} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a7Agg.igst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a7Agg.cgst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a7Agg.sgst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a7Agg.cess} bold /></TableCell>
                    </TableRow>
                    <ExpandableBlock
                      title="POS wise summary"
                      childrenRows={[
                        { description: 'POS wise summary', records: 0, docType: 'Net Value', value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
                      ]}
                    />

                    <TableRow>
                      <TableCell className="font-semibold">8 – Nil rated, exempted and non GST outward supplies</TableCell>
                      <TableCell className="text-right font-semibold">{section8.total > 0 ? 1 : 0}</TableCell>
                      <TableCell className="font-semibold">Invoice</TableCell>
                      <TableCell className="text-right"><NumberCell value={section8.total} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableCell>Nil</TableCell>
                      <TableCell className="text-right"></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right"><NumberCell value={section8.nil} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableCell>Exempted</TableCell>
                      <TableCell className="text-right"></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right"><NumberCell value={section8.exempted} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>
                    <TableRow className="bg-gray-50">
                      <TableCell>Non-GST</TableCell>
                      <TableCell className="text-right"></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right"><NumberCell value={section8.non_gst} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>

                    <TableRow className="bg-gray-50">
                      <TableCell className="font-semibold">12 – HSN-wise summary of outward supplies</TableCell>
                      <TableCell className="text-right font-semibold">{a12Agg.count}</TableCell>
                      <TableCell className="font-semibold">Invoice</TableCell>
                      <TableCell className="text-right"><NumberCell value={a12Agg.value} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a12Agg.igst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a12Agg.cgst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a12Agg.sgst} bold /></TableCell>
                      <TableCell className="text-right"><NumberCell value={a12Agg.cess} bold /></TableCell>
                    </TableRow>
                    <ExpandableBlock title="12 – HSN Summary – Details" childrenRows={hsnChildren} />

                    <TableRow>
                      <TableCell>13 – Documents Issued</TableCell>
                      <TableCell className="text-right">{docsCount}</TableCell>
                      <TableCell>All Documents</TableCell>
                      <TableCell className="text-right"><NumberCell value={docsValue} /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                      <TableCell className="text-right"><NumberCell value={0} grey /></TableCell>
                    </TableRow>
                    <ExpandableBlock
                      title="Net issued documents"
                      childrenRows={[
                        { description: 'Documents issued', records: docsIssued, docType: '', value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
                        { description: 'Documents cancelled', records: docsCancelled, docType: '', value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 },
                      ]}
                    />

                    <TableRow className="bg-green-50 sticky bottom-0 z-10">
                      <TableCell className="font-semibold text-green-800">Total Liability (Outward supplies other than Reverse charge)</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right">
                        <NumberCell value={a4Agg.value + a7Agg.value} bold />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={a4Agg.igst + a7Agg.igst} bold />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={a4Agg.cgst + a7Agg.cgst} bold />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={a4Agg.sgst + a7Agg.sgst} bold />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={a4Agg.cess + a7Agg.cess} bold />
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Gstr1SummaryPage;
