import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pencil, Trash, Plus } from 'lucide-react';

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
  source?: string;
  irn?: string;
  irnDate?: string;
};

type Invoice = {
  id: string;
  gstin: string;
  recipientName: string;
  invoiceNo: string;
  invoiceDate: string;
  pos: string;
  supplyType: "Intra-State" | "Inter-State";
  totalValue: number;
};

type B2BRecipient = {
  gstin: string;
  tradeName: string;
  taxpayerType: string;
  invoices: Invoice[];
};

import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { storageKeys } from '@/lib/storageKeys';

const B2BPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();
  const [records, setRecords] = useState<B2BRecord[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<{ financialYear: string; quarter: string; period: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !fy || !q || !p) return;
      setCurrentPeriod({ financialYear: fy, quarter: q, period: p });
      setLoading(true);
      const { data, error } = await supabase
        .from('gstr1_b2b')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        if (String(error.message || '').toLowerCase().includes('invalid refresh token')) {
          await supabase.auth.signOut();
          navigate('/login');
        }
        setRecords([]);
      } else {
        const normalized = (data || []).map((r: any) => ({
          gstin: r.gstin,
          recipientName: r.recipient_name || '',
          nameAsInMaster: r.recipient_name || '',
          invoiceNumber: r.invoice_number || '',
          invoiceDate: r.invoice_date || '',
          totalInvoiceValue: Number(r.total_invoice_value || 0),
          posCode: r.pos_code || '',
          posName: r.pos_name || '',
          supplyType: r.supply_type || '',
          id: r.id,
        })) as (B2BRecord & { id: string })[];
        setRecords(normalized);
      }
      setLoading(false);
    };
    loadData();
  }, [user, fy, q, p]);

  const recipients: B2BRecipient[] = useMemo(() => {
    const byGstin = new Map<string, B2BRecipient>();
    for (const r of records) {
      const key = r.gstin;
      if (!byGstin.has(key)) {
        byGstin.set(key, {
          gstin: r.gstin,
          tradeName: (r.recipientName || '').toUpperCase(),
          taxpayerType: 'Regular taxpayer',
          invoices: [],
        });
      }
      const rec = byGstin.get(key)!;
      rec.invoices.push({
        id: (r as B2BRecord & { id?: string }).id || '',
        gstin: r.gstin,
        recipientName: r.recipientName,
        invoiceNo: r.invoiceNumber,
        invoiceDate: r.invoiceDate,
        pos: `${r.posCode} – ${r.posName}`,
        supplyType: r.supplyType,
        totalValue: r.totalInvoiceValue,
      });
    }
    return Array.from(byGstin.values());
  }, [records]);

  const deleteInvoice = async (id: string) => {
    try {
      if (!user) return;
      const { error } = await supabase
        .from('gstr1_b2b')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error(error);
        if (String(error.message || '').toLowerCase().includes('invalid refresh token')) {
          await supabase.auth.signOut();
          navigate('/login');
        }
        return;
      }
      const { data } = await supabase
        .from('gstr1_b2b')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .order('created_at', { ascending: false });
      const normalized = (data || []).map((r: any) => ({
        gstin: r.gstin,
        recipientName: r.recipient_name || '',
        nameAsInMaster: r.recipient_name || '',
        invoiceNumber: r.invoice_number || '',
        invoiceDate: r.invoice_date || '',
        totalInvoiceValue: Number(r.total_invoice_value || 0),
        posCode: r.pos_code || '',
        posName: r.pos_name || '',
        supplyType: r.supply_type || '',
        irn: r.irn || '',
        irnDate: r.irn_date || '',
        id: r.id,
      })) as (B2BRecord & { id: string })[];
      setRecords(normalized);
    } catch (e) {
      console.error(e);
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
            <Link to="/returns/gstr1/prepare-online" className="text-blue-600 hover:underline">GSTR-1</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">B2B</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">B2B – Invoices</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>BACK</Button>
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => {
                if (!fy || !q || !p) {
                  alert("Please select Filing Year, Quarter and Period first");
                  navigate("/returns/gstr1/prepare-online");
                  return;
                }
                navigate(`/returns/gstr1/b2b/add?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
              }}>ADD RECORD</Button>
              <Button className="bg-gray-400 hover:bg-gray-400/80" disabled>IMPORT EWB DATA</Button>
            </div>
          </div>

          {loading ? (
            <div className="overflow-x-auto">
              <Table className="min-w-full bg-white dark:bg-gray-900">
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient GSTIN</TableHead>
                    <TableHead>Trade / Legal Name</TableHead>
                    <TableHead>Taxpayer Type</TableHead>
                    <TableHead>Processed Records</TableHead>
                    <TableHead>Pending / Errored Invoices</TableHead>
                    <TableHead>Add Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(3)].map((_, i) => (
                    <TableRow key={`sk-${i}`} className="animate-pulse">
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                      <TableCell className="h-6 bg-gray-100" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : recipients.length === 0 ? (
            <div className="border rounded-md p-6 bg-blue-50 text-blue-800">There are no records to be displayed.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full bg-white dark:bg-gray-900">
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient GSTIN</TableHead>
                    <TableHead>Trade / Legal Name</TableHead>
                    <TableHead>Taxpayer Type</TableHead>
                    <TableHead>Processed Records</TableHead>
                    <TableHead>Pending / Errored Invoices</TableHead>
                    <TableHead>Add Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((rec) => (
                    <>
                      <TableRow key={rec.gstin}>
                        <TableCell>{rec.gstin}</TableCell>
                        <TableCell>{rec.tradeName}</TableCell>
                        <TableCell>{rec.taxpayerType}</TableCell>
                        <TableCell>{rec.invoices.length}</TableCell>
                        <TableCell>0</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="bg-[#234E8F] hover:bg-[#1d447e]"
                            onClick={() => navigate(`/returns/gstr1/b2b/add?gstin=${encodeURIComponent(rec.gstin)}&fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                          >
                            <Plus className="h-4 w-4" />
                            Add Invoice
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() => setExpanded((cur) => (cur === rec.gstin ? null : rec.gstin))}
                          >
                            {expanded === rec.gstin ? 'Hide' : 'Show'} invoices
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expanded === rec.gstin && rec.invoices.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="rounded-md border bg-muted/30 p-3">
                              <Table className="w-full">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Invoice No</TableHead>
                                    <TableHead>Invoice Date</TableHead>
                                    <TableHead>POS</TableHead>
                                    <TableHead>Supply Type</TableHead>
                                    <TableHead>Total Value (₹)</TableHead>
                                    <TableHead>Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rec.invoices.map((inv) => (
                                    <TableRow key={inv.id}>
                                      <TableCell>{inv.invoiceNo}</TableCell>
                                      <TableCell>{inv.invoiceDate}</TableCell>
                                      <TableCell>{inv.pos}</TableCell>
                                      <TableCell>{inv.supplyType}</TableCell>
                                      <TableCell>{inv.totalValue.toFixed(2)}</TableCell>
                                      <TableCell className="whitespace-nowrap">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => navigate(`/returns/gstr1/b2b/add?id=${encodeURIComponent(inv.id)}&fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="ml-2"
                                          onClick={() => deleteInvoice(inv.id)}
                                        >
                                          <Trash className="h-4 w-4" />
                                          Delete
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default B2BPage;
