import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pencil, Trash } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type B2CSRecord = {
  id: string;
  posCode: string;
  posName: string;
  supplyType: 'Intra-State' | 'Inter-State';
  taxableValue: number;
  rate: number;
  integratedTax?: number;
  centralTax?: number;
  stateUtTax?: number;
  cess?: number;
  applicablePercentage?: number;
  financialYear?: string;
  quarter?: string;
  period?: string;
  returnType?: string;
};

const B2CSPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const [records, setRecords] = useState<B2CSRecord[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<{ financialYear: string; quarter: string; period: string } | null>(null);

  const loadB2cs = async () => {
    setCurrentPeriod(fy && q && p ? { financialYear: fy, quarter: q, period: p } : null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !fy || !q || !p) {
      setRecords([]);
      return;
    }
    const { data, error } = await supabase
      .from('gstr1_b2cs')
      .select('*')
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p);
    if (error) {
      setRecords([]);
      return;
    }
    const mapped = (data || []).map((row: {
      id: string;
      pos: string;
      pos_name?: string;
      supply_type: 'Intra-State' | 'Inter-State';
      taxable_value: number;
      rate: number;
      integrated_tax?: number;
      central_tax?: number;
      state_tax?: number;
      cess?: number;
      applicable_percentage?: number | null;
    }) => ({
      id: row.id,
      posCode: row.pos,
      posName: row.pos_name,
      supplyType: row.supply_type,
      taxableValue: row.taxable_value,
      rate: row.rate,
      integratedTax: row.integrated_tax,
      centralTax: row.central_tax,
      stateUtTax: row.state_tax,
      cess: row.cess,
      applicablePercentage: row.applicable_percentage ?? undefined,
      financialYear: fy,
      quarter: q,
      period: p,
      returnType: 'GSTR-1',
    })) as B2CSRecord[];
    setRecords(mapped);
  };

  useEffect(() => {
    if (!fy || !q || !p) return;
    (async () => {
      await loadB2cs();
    })();
  }, [fy, q, p]);

  const deleteRecord = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('gstr1_b2cs')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id);
    if (error) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
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
            <span className="text-gray-600 font-medium">B2CS</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">7 – B2C (Others)</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>BACK</Button>
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={() => navigate(`/returns/gstr1/b2cs/add?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>ADD RECORD</Button>
              <Button className="bg-gray-400 hover:bg-gray-400/80" disabled>IMPORT EWB DATA</Button>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="border rounded-md p-6 bg-blue-50 text-blue-800">There are no records to be displayed.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full bg-white dark:bg-gray-900">
                <TableHeader>
                  <TableRow>
                    <TableHead>Place of Supply (Name of State)</TableHead>
                    <TableHead>Total Taxable Value (₹)</TableHead>
                    <TableHead>Integrated tax (₹)</TableHead>
                    <TableHead>Central tax (₹)</TableHead>
                    <TableHead>State/UT tax (₹)</TableHead>
                    <TableHead>Cess (₹)</TableHead>
                    <TableHead>Applicable percentage (%)</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.posName}</TableCell>
                      <TableCell>{(r.taxableValue || 0).toFixed(2)}</TableCell>
                      <TableCell>{(r.integratedTax || 0).toFixed(2)}</TableCell>
                      <TableCell>{(r.centralTax || 0).toFixed(2)}</TableCell>
                      <TableCell>{(r.stateUtTax || 0).toFixed(2)}</TableCell>
                      <TableCell>{(r.cess || 0).toFixed(2)}</TableCell>
                      <TableCell>{r.applicablePercentage ? `${r.applicablePercentage}%` : '0%'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/returns/gstr1/b2cs/add?id=${encodeURIComponent(r.id)}&fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="ml-2"
                          onClick={() => deleteRecord(r.id)}
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
          )}
        </div>
      </main>
    </div>
  );
};

export default B2CSPage;
