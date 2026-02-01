import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

const ORIGIN_STATE_CODE = '33';

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
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '97', name: 'Other Territory' },
];

type B2CSRecord = {
  id?: string;
  posCode: string;
  posName: string;
  supplyType: 'Intra-State' | 'Inter-State';
  taxableValue: number;
  rate: number;
  integratedTax?: number;
  centralTax?: number;
  stateUtTax?: number;
  cess?: number;
  financialYear?: string;
  quarter?: string;
  period?: string;
  returnType?: string;
};

const rateOptions = [0, 0.1, 3, 5, 12, 18, 28];

const AddB2CSDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const [posCode, setPosCode] = useState('');
  const [taxableValue, setTaxableValue] = useState('');
  const [rate, setRate] = useState<number>(0);
  const [cess, setCess] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!fy || !q || !p) {
      alert('Invalid access. Redirecting...');
      navigate('/returns/gstr1/prepare-online');
    }
  }, [fy, q, p]);

  const posName = useMemo(() => stateOptions.find((s) => s.code === posCode)?.name || '', [posCode]);
  const supplyType = useMemo(() => {
    if (!posCode) return '';
    return posCode === ORIGIN_STATE_CODE ? 'Intra-State' : 'Inter-State';
  }, [posCode]);

  const integratedTax = useMemo(() => {
    const val = Number(taxableValue || '0');
    if (supplyType !== 'Inter-State') return 0;
    return (val * rate) / 100;
  }, [taxableValue, supplyType, rate]);

  const centralTax = useMemo(() => {
    const val = Number(taxableValue || '0');
    if (supplyType !== 'Intra-State') return 0;
    return (val * (rate / 2)) / 100;
  }, [taxableValue, supplyType, rate]);

  const stateUtTax = useMemo(() => {
    const val = Number(taxableValue || '0');
    if (supplyType !== 'Intra-State') return 0;
    return (val * (rate / 2)) / 100;
  }, [taxableValue, supplyType, rate]);

  useEffect(() => {
    const editId = searchParams.get('id');
    if (!editId || hasLoadedRef.current) return;

    hasLoadedRef.current = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('gstr1_b2cs')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', editId)
        .maybeSingle();
      if (!error && data) {
        setPosCode(data.pos || '');
        setTaxableValue(data.taxable_value ? String(data.taxable_value) : '');
        setRate(typeof data.rate === 'number' ? data.rate : Number(data.rate ?? 0));
        setCess(data.cess ? String(data.cess) : '');
      }
    })();
  }, []);

  const save = async () => {
    setError(null);
    if (!posCode || !taxableValue) {
      setError('Please fill all mandatory fields.');
      return;
    }
    if (!rate) {
      setError('Please select a rate');
      return;
    }
    const valNum = Number(taxableValue);
    if (Number.isNaN(valNum) || valNum <= 0) {
      setError('Taxable value must be a positive number.');
      return;
    }
    const rateNum = rate;
    const editId = searchParams.get('id');
    const base: B2CSRecord = {
      posCode,
      posName,
      supplyType: supplyType as 'Intra-State' | 'Inter-State',
      taxableValue: valNum,
      rate: rateNum,
      integratedTax: supplyType === 'Inter-State' ? (valNum * rateNum) / 100 : 0,
      centralTax: supplyType === 'Intra-State' ? (valNum * (rateNum / 2)) / 100 : 0,
      stateUtTax: supplyType === 'Intra-State' ? (valNum * (rateNum / 2)) / 100 : 0,
      cess: Number(cess || '0') || 0,
    };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User not authenticated');
      return;
    }
    if (editId) {
      const { error } = await supabase
        .from('gstr1_b2cs')
        .update({
          pos: posCode,
            pos_name: posName,
          supply_type: supplyType,
          taxable_value: valNum,
          rate: rateNum,
          central_tax: supplyType === 'Intra-State' ? (valNum * (rateNum / 2)) / 100 : 0,
          state_tax: supplyType === 'Intra-State' ? (valNum * (rateNum / 2)) / 100 : 0,
          integrated_tax: supplyType === 'Inter-State' ? (valNum * rateNum) / 100 : 0,
          cess: Number(cess || '0') || 0,
        })
        .eq('user_id', user.id)
        .eq('id', editId);
      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from('gstr1_b2cs')
        .insert({
          user_id: user.id,
            filing_year: fy,
            quarter: q,
            period: p,
          pos: posCode,
          supply_type: supplyType,
          taxable_value: valNum,
          rate: rateNum,
          central_tax: supplyType === 'Intra-State' ? (valNum * (rateNum / 2)) / 100 : 0,
          state_tax: supplyType === 'Intra-State' ? (valNum * (rateNum / 2)) / 100 : 0,
          integrated_tax: supplyType === 'Inter-State' ? (valNum * rateNum) / 100 : 0,
          cess: Number(cess || '0') || 0,
          pos_name: posName,
        });
      if (error) {
        setError(error.message);
        return;
      }
    }
    navigate(`/returns/gstr1/b2cs?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
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
            <Link to="/returns/gstr1/b2cs" className="text-blue-600 hover:underline">B2CS</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">Add Details</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">B2CS – Add Details</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/returns/gstr1/b2cs?fy=${fy}&q=${q}&p=${p}`)}>BACK</Button>
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={save}>SAVE</Button>
            </div>
          </div>

          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-red-700">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>POS *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={posCode}
                onChange={(e) => setPosCode(e.target.value)}
              >
                <option value="">Select</option>
                {stateOptions.map((s) => (
                  <option key={s.code} value={s.code}>{`${s.code}-${s.name}`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Taxable value *</Label>
              <Input type="number" value={taxableValue} onChange={(e) => setTaxableValue(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Supply Type</Label>
              <Input value={supplyType} readOnly />
            </div>
            <div className="col-span-1 md:col-span-2">
              {/* Differential percentage input removed */}
            </div>
            <div>
              <Label>Rate *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              >
                <option value="">Select</option>
                {rateOptions.map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>
            {/* Applicable percentage input removed */}
          </div>

          <div className="mt-6">
            {supplyType === 'Inter-State' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Integrated Tax (₹)</Label>
                  <Input value={integratedTax ? integratedTax.toFixed(2) : ''} readOnly />
                </div>
                <div>
                  <Label>CESS (₹)</Label>
                  <Input type="number" value={cess} onChange={(e) => setCess(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Central Tax (₹)</Label>
                  <Input value={centralTax ? centralTax.toFixed(2) : ''} readOnly />
                </div>
                <div>
                  <Label>State/UT Tax (₹)</Label>
                  <Input value={stateUtTax ? stateUtTax.toFixed(2) : ''} readOnly />
                </div>
                <div>
                  <Label>CESS (₹)</Label>
                  <Input type="number" value={cess} onChange={(e) => setCess(e.target.value)} placeholder="0.00" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddB2CSDetailsPage;
