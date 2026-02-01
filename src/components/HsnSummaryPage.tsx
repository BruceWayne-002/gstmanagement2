import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pencil, Trash, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Period = { financialYear: string; quarter: string; period: string };
type HsnRecord = {
  id: string;
  hsnCode: string;
  description: string;
  descriptionHSN: string;
  uqc: 'NOS' | 'KGS' | 'PCS' | 'NA';
  totalQuantity?: number;
  taxableValue: number;
  rate: 5 | 8 | 12 | 28;
  integratedTax?: number;
  centralTax: number;
  stateUtTax: number;
  cess?: number;
  financialYear?: string;
  quarter?: string;
  period?: string;
  returnType?: string;
  supplyType?: 'B2B' | 'B2C';
};
type HsnServerRecord = {
  id: string;
  hsn_code: string;
  product_name?: string;
  description: string;
  uqc: 'NOS' | 'KGS' | 'PCS' | 'NA';
  total_quantity: number;
  taxable_value: number;
  rate: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
};

const HSN_DESCRIPTIONS: Record<string, string> = {
  '6103':
    "Men’s or boys’ suits, ensembles, jackets, blazers, trousers, bib and brace overalls, breeches and shorts (other than swimwear), knitted or crocheted",
  '2523':
    "Portland cement, aluminous cement, slag cement, supersulphate cement and similar hydraulic cements, whether or not coloured or in the form of clinkers",
  '9401': "Seats (other than those of heading 9402), whether or not convertible into beds, and parts thereof",
  '8517':
    "Telephone sets, including smartphones and other telephones for cellular networks or for other wireless networks; other apparatus for transmission or reception of voice, images, or other data",
};

const UQC_OPTIONS = ['NOS', 'KGS', 'PCS', 'NA'] as const;
const RATE_OPTIONS = [5, 8, 12, 28] as const;

const HsnSummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const { user } = useAuth();
  const [tab, setTab] = useState<'B2B' | 'B2C'>('B2B');
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [records, setRecords] = useState<HsnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [hsnCode, setHsnCode] = useState('');
  const [description, setDescription] = useState('');
  const descriptionHSN = useMemo(() => HSN_DESCRIPTIONS[hsnCode] || (hsnCode ? 'Unknown HSN Code' : ''), [hsnCode]);
  const [uqc, setUqc] = useState<'NOS' | 'KGS' | 'PCS' | 'NA' | ''>('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [taxableValue, setTaxableValue] = useState('');
  const [rate, setRate] = useState<5 | 8 | 12 | 28 | ''>('');
  const [centralTaxInput, setCentralTaxInput] = useState('');
  const [stateUtTaxInput, setStateUtTaxInput] = useState('');
  const [cessInput, setCessInput] = useState('');

  useEffect(() => {
    setCurrentPeriod(fy && q && p ? { financialYear: fy, quarter: q, period: p } : null);
  }, [fy, q, p]);

  const loadHSN = async () => {
    if (!user || !fy || !q || !p) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('gstr1_hsn')
      .select('id, hsn_code, product_name, description, uqc, total_quantity, taxable_value, rate, igst, cgst, sgst, cess, supply_type')
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Load HSN error:', error);
    } else {
      const mapped = (data || []).map((row: {
        id: string;
        hsn_code: string;
        product_name?: string;
        description: string;
        uqc: 'NOS' | 'KGS' | 'PCS' | 'NA';
        total_quantity: number;
        taxable_value: number;
        rate: number;
        igst: number;
        cgst: number;
        sgst: number;
        cess: number;
        supply_type: 'B2B' | 'B2C';
      }) => ({
        id: row.id,
        hsnCode: row.hsn_code,
        description: row.product_name ?? '',
        descriptionHSN: row.description,
        uqc: row.uqc,
        totalQuantity: row.total_quantity,
        taxableValue: row.taxable_value,
        rate: row.rate as 5 | 8 | 12 | 28,
        integratedTax: row.igst,
        centralTax: row.cgst,
        stateUtTax: row.sgst,
        cess: row.cess,
        supplyType: row.supply_type,
      })) as HsnRecord[];
      setRecords(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && fy && q && p) {
      const run = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('gstr1_hsn')
          .select('id, hsn_code, product_name, description, uqc, total_quantity, taxable_value, rate, igst, cgst, sgst, cess, supply_type')
          .eq('user_id', user.id)
          .eq('filing_year', fy)
          .eq('quarter', q)
          .eq('period', p)
          .order('created_at', { ascending: false });
        if (!error) {
          const mapped = (data || []).map((row: {
            id: string;
            hsn_code: string;
            product_name?: string;
            description: string;
            uqc: 'NOS' | 'KGS' | 'PCS' | 'NA';
            total_quantity: number;
            taxable_value: number;
            rate: number;
            igst: number;
            cgst: number;
            sgst: number;
            cess: number;
            supply_type: 'B2B' | 'B2C';
          }) => ({
            id: row.id,
            hsnCode: row.hsn_code,
            description: row.product_name ?? '',
            descriptionHSN: row.description,
            uqc: row.uqc,
            totalQuantity: row.total_quantity,
            taxableValue: row.taxable_value,
            rate: row.rate as 5 | 8 | 12 | 28,
            integratedTax: row.igst,
            centralTax: row.cgst,
            stateUtTax: row.sgst,
            cess: row.cess,
            supplyType: row.supply_type,
          })) as HsnRecord[];
          setRecords(mapped);
        }
        setLoading(false);
      };
      run();
    }
  }, [user, fy, q, p]);

  const clearForm = () => {
    setHsnCode('');
    setDescription('');
    setUqc('');
    setTotalQuantity('');
    setTaxableValue('');
    setRate('');
    setError(null);
    setCentralTaxInput('');
    setStateUtTaxInput('');
    setCessInput('');
    setEditingId(null);
  };

  const addRecord = () => {
    setError(null);
    if (!hsnCode || !uqc || !taxableValue || !rate || !centralTaxInput || !stateUtTaxInput) {
      setError('Please fill all mandatory fields.');
      return;
    }
    const record: HsnRecord = {
      id: editingId || ((globalThis.crypto && 'randomUUID' in globalThis.crypto)
        ? (globalThis.crypto as Crypto).randomUUID()
        : `hsn_${Date.now()}`),
      hsnCode,
      description,
      descriptionHSN,
      uqc: uqc as HsnRecord['uqc'],
      totalQuantity: Number(totalQuantity || 0),
      taxableValue: Number(taxableValue),
      rate: rate as HsnRecord['rate'],
      integratedTax: 0,
      centralTax: Number(centralTaxInput),
      stateUtTax: Number(stateUtTaxInput),
      cess: Number(cessInput || 0),
      financialYear: currentPeriod?.financialYear,
      quarter: currentPeriod?.quarter,
      period: currentPeriod?.period,
      returnType: 'GSTR-1',
      supplyType: tab,
    };
    setRecords((prev) => {
      if (editingId) {
        return prev.map((r) => (r.id === editingId ? record : r));
      }
      return [...prev, record];
    });
    clearForm();
  };

  const editRecord = (rec: HsnRecord) => {
    setEditingId(rec.id);
    setHsnCode(rec.hsnCode);
    setDescription(rec.description);
    setUqc(rec.uqc);
    setTotalQuantity(rec.totalQuantity ? String(rec.totalQuantity) : '');
    setTaxableValue(String(rec.taxableValue));
    setRate(rec.rate);
    setCentralTaxInput(rec.centralTax ? String(rec.centralTax) : '');
    setStateUtTaxInput(rec.stateUtTax ? String(rec.stateUtTax) : '');
    setCessInput(rec.cess ? String(rec.cess) : '');
  };

  const deleteRecord = async (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (!user || !fy || !q || !p) return;
    await supabase
      .from('gstr1_hsn')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('filing_year', fy)
      .eq('quarter', q)
      .eq('period', p)
      .eq('supply_type', tab);
  };

  const handleSave = async () => {
    if (!user || !fy || !q || !p) return;
    if (records.length === 0) {
      alert('No records to save');
      return;
    }
    setSaving(true);
    const payload = records
      .filter((r) => r.supplyType === tab)
      .map((r) => ({
      user_id: user.id,
      filing_year: fy,
      quarter: q,
      period: p,
      supply_type: tab,
      hsn_code: r.hsnCode,
      product_name: r.description,
      description: r.descriptionHSN,
      uqc: r.uqc,
      total_quantity: r.totalQuantity ?? 0,
      taxable_value: r.taxableValue,
      rate: r.rate,
      igst: r.integratedTax ?? 0,
      cgst: r.centralTax,
      sgst: r.stateUtTax,
      cess: r.cess ?? 0,
    }));
    const { error } = await supabase.from('gstr1_hsn').insert(payload);
    setSaving(false);
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 2000);
    loadHSN();
  };

  const saveAll = handleSave;

  const recordsForTab = records.filter((r) => r.supplyType === tab);

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
            <span className="text-gray-600 font-medium">12 – HSN-wise summary of outward supplies</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">12 – HSN-wise Summary of Outward Supplies</h1>
            <Button variant="outline" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${fy}&q=${q}&p=${p}`)}>BACK</Button>
          </div>

          <div className="mt-4">
            <div className="flex gap-2">
              <Button variant={tab === 'B2B' ? 'default' : 'outline'} onClick={() => setTab('B2B')}>B2B Supplies</Button>
              <Button variant={tab === 'B2C' ? 'default' : 'outline'} onClick={() => setTab('B2C')}>B2C Supplies</Button>
            </div>
          </div>

          

          <div key={tab} className="mt-6 animate-fade-in">
            {error && <div className="mb-3 rounded-md border border-red-200 bg-red-50 text-red-700 px-3 py-2">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>HSN Code *</Label>
                <Input value={hsnCode} onChange={(e) => setHsnCode(e.target.value.trim())} placeholder="Enter HSN Code" />
              </div>
              <div>
                <Label>Product Name as in My Master</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
              </div>
              <div>
                <Label>Description as per HSN Code</Label>
                <Input value={descriptionHSN} readOnly className="bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <Label>UQC *</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={uqc}
                  onChange={(e) => setUqc(e.target.value as 'NOS' | 'KGS' | 'PCS' | 'NA' | '')}
                >
                  <option value="">Select</option>
                  {UQC_OPTIONS.map((u) => (<option key={u} value={u}>{u} – {u === 'NOS' ? 'Numbers' : u === 'KGS' ? 'Kilograms' : u === 'PCS' ? 'Pieces' : 'NA'}</option>))}
                </select>
              </div>
              <div>
                <Label>Total Quantity</Label>
                <Input type="number" value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label>Total Taxable Value (₹) *</Label>
                <Input type="number" value={taxableValue} onChange={(e) => setTaxableValue(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Rate (%) *</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={rate === '' ? '' : String(rate)}
                  onChange={(e) => setRate(e.target.value === '' ? '' : (Number(e.target.value) as 5 | 8 | 12 | 28))}
                >
                  <option value="">Select</option>
                  {RATE_OPTIONS.map((r) => (<option key={r} value={r}>{r}%</option>))}
                </select>
              </div>
              <div>
                <Label>Central Tax (₹) *</Label>
                <Input type="number" value={centralTaxInput} onChange={(e) => setCentralTaxInput(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>State / UT Tax (₹) *</Label>
                <Input type="number" value={stateUtTaxInput} onChange={(e) => setStateUtTaxInput(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Cess (₹)</Label>
                <Input type="number" value={cessInput} onChange={(e) => setCessInput(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={addRecord}>{editingId ? 'UPDATE' : 'ADD'}</Button>
              </div>
          </div>

          <div key={tab + '_table'} className="mt-6 overflow-x-auto animate-fade-in">
            <Table className="min-w-full bg-white dark:bg-gray-900">
              <TableHeader>
                <TableRow>
                  <TableHead>HSN</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Description as per HSN Code</TableHead>
                  <TableHead>UQC</TableHead>
                  <TableHead>Total Quantity</TableHead>
                  <TableHead>Total Taxable Value (₹)</TableHead>
                  <TableHead>Rate (%)</TableHead>
                  <TableHead>Integrated tax (₹)</TableHead>
                  <TableHead>Central tax (₹)</TableHead>
                  <TableHead>State/UT tax (₹)</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <TableRow key={`skeleton-${i}`} className="animate-pulse">
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                        <TableCell className="h-6 bg-gray-100" />
                      </TableRow>
                    ))}
                  </>
                ) : recordsForTab.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <div className="rounded-md border bg-blue-50 text-blue-800 p-3">There are no records to be displayed.</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  recordsForTab.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.hsnCode}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>{r.descriptionHSN}</TableCell>
                      <TableCell>{r.uqc}</TableCell>
                      <TableCell>{r.totalQuantity ?? 0}</TableCell>
                      <TableCell>{r.taxableValue.toFixed(2)}</TableCell>
                      <TableCell>{r.rate}%</TableCell>
                      <TableCell>{(r.integratedTax || 0).toFixed(2)}</TableCell>
                      <TableCell>{r.centralTax.toFixed(2)}</TableCell>
                      <TableCell>{r.stateUtTax.toFixed(2)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => editRecord(r)}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button variant="destructive" size="sm" className="ml-2" onClick={() => deleteRecord(r.id)}>
                          <Trash className="h-4 w-4" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              className="bg-[#234E8F] hover:bg-[#1d447e] min-w-[120px]"
              onClick={saveAll}
              disabled={saving}
            >
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

export default HsnSummaryPage;
