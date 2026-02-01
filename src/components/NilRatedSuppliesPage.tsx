import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';

type ThreeAmounts = { nil: number; exempted: number; nonGst: number };

const zeroAmounts: ThreeAmounts = { nil: 0, exempted: 0, nonGst: 0 };

const NilRatedSuppliesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fy = searchParams.get('fy') || '';
  const q = searchParams.get('q') || '';
  const p = searchParams.get('p') || '';
  const [intraReg, setIntraReg] = useState<ThreeAmounts>(zeroAmounts);
  const [intraUnreg, setIntraUnreg] = useState<ThreeAmounts>(zeroAmounts);
  const [interReg, setInterReg] = useState<ThreeAmounts>(zeroAmounts);
  const [interUnreg, setInterUnreg] = useState<ThreeAmounts>(zeroAmounts);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fy || !q || !p) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('gstr1_nil_rated')
        .select('*')
        .eq('user_id', user.id)
        .eq('filing_year', fy)
        .eq('quarter', q)
        .eq('period', p)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        setIntraReg({
          nil: Number(data.intra_reg_nil || 0),
          exempted: Number(data.intra_reg_exempted || 0),
          nonGst: Number(data.intra_reg_non_gst || 0),
        });
        setIntraUnreg({
          nil: Number(data.intra_unreg_nil || 0),
          exempted: Number(data.intra_unreg_exempted || 0),
          nonGst: Number(data.intra_unreg_non_gst || 0),
        });
        setInterReg({
          nil: Number(data.inter_reg_nil || 0),
          exempted: Number(data.inter_reg_exempted || 0),
          nonGst: Number(data.inter_reg_non_gst || 0),
        });
        setInterUnreg({
          nil: Number(data.inter_unreg_nil || 0),
          exempted: Number(data.inter_unreg_exempted || 0),
          nonGst: Number(data.inter_unreg_non_gst || 0),
        });
      } else {
        setIntraReg(zeroAmounts);
        setIntraUnreg(zeroAmounts);
        setInterReg(zeroAmounts);
        setInterUnreg(zeroAmounts);
      }
    })();
  }, [fy, q, p]);

  const anyNonZero = useMemo(() => {
    const sum = (a: ThreeAmounts) => (a.nil || 0) + (a.exempted || 0) + (a.nonGst || 0);
    return sum(intraReg) + sum(intraUnreg) + sum(interReg) + sum(interUnreg);
  }, [intraReg, intraUnreg, interReg, interUnreg]);

  const toFixed2 = (v: number) => (v ? v.toFixed(2) : '');

  const onAmountChange =
    (setter: React.Dispatch<React.SetStateAction<ThreeAmounts>>, key: keyof ThreeAmounts) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const n = Number(raw);
      setter((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
    };

  const onBlurFormat =
    (setter: React.Dispatch<React.SetStateAction<ThreeAmounts>>, key: keyof ThreeAmounts) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      const n = Number(e.target.value);
      setter((prev) => ({ ...prev, [key]: Number.isFinite(n) ? parseFloat(n.toFixed(2)) : 0 }));
    };

  const save = async () => {
    if (!fy || !q || !p) {
      alert('Missing Filing Year / Quarter / Period');
      return;
    }
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('User not authenticated');
        return;
      }
      const { error } = await supabase
        .from('gstr1_nil_rated')
        .upsert(
          {
            user_id: user.id,
            filing_year: fy,
            quarter: q,
            period: p,
            intra_reg_nil: Number(intraReg.nil || 0),
            intra_reg_exempted: Number(intraReg.exempted || 0),
            intra_reg_non_gst: Number(intraReg.nonGst || 0),
            intra_unreg_nil: Number(intraUnreg.nil || 0),
            intra_unreg_exempted: Number(intraUnreg.exempted || 0),
            intra_unreg_non_gst: Number(intraUnreg.nonGst || 0),
            inter_reg_nil: Number(interReg.nil || 0),
            inter_reg_exempted: Number(interReg.exempted || 0),
            inter_reg_non_gst: Number(interReg.nonGst || 0),
            inter_unreg_nil: Number(interUnreg.nil || 0),
            inter_unreg_exempted: Number(interUnreg.exempted || 0),
            inter_unreg_non_gst: Number(interUnreg.nonGst || 0),
          },
          {
            onConflict: 'user_id,filing_year,quarter,period',
          }
        );
      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }
      navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`);
    } finally {
      setSaving(false);
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
            <Link to={`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`} className="text-blue-600 hover:underline">GSTR-1</Link>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">8A, 8B, 8C, 8D – Nil Rated, Exempted and Non-GST Supplies</span>
          </div>
        </nav>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold">8A, 8B, 8C, 8D – Nil Rated, Exempted and Non-GST Supplies</h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(fy)}&q=${encodeURIComponent(q)}&p=${encodeURIComponent(p)}`)}>BACK</Button>
              <Button className="bg-[#234E8F] hover:bg-[#1d447e]" onClick={save} disabled={saving}>
                {saving ? 'SAVING...' : 'SAVE'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-full bg-white dark:bg-gray-900">
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Nil Rated Supplies (₹)</TableHead>
                  <TableHead>Exempted Supplies (₹)</TableHead>
                  <TableHead>Non-GST Supplies (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Intra-state supplies to registered person</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={intraReg.nil ? String(intraReg.nil) : ''}
                      onChange={onAmountChange(setIntraReg, 'nil')}
                      onBlur={onBlurFormat(setIntraReg, 'nil')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={intraReg.exempted ? String(intraReg.exempted) : ''}
                      onChange={onAmountChange(setIntraReg, 'exempted')}
                      onBlur={onBlurFormat(setIntraReg, 'exempted')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={intraReg.nonGst ? String(intraReg.nonGst) : ''}
                      onChange={onAmountChange(setIntraReg, 'nonGst')}
                      onBlur={onBlurFormat(setIntraReg, 'nonGst')}
                      placeholder="0.00"
                    />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Intra-state supplies to unregistered person</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={intraUnreg.nil ? String(intraUnreg.nil) : ''}
                      onChange={onAmountChange(setIntraUnreg, 'nil')}
                      onBlur={onBlurFormat(setIntraUnreg, 'nil')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={intraUnreg.exempted ? String(intraUnreg.exempted) : ''}
                      onChange={onAmountChange(setIntraUnreg, 'exempted')}
                      onBlur={onBlurFormat(setIntraUnreg, 'exempted')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={intraUnreg.nonGst ? String(intraUnreg.nonGst) : ''}
                      onChange={onAmountChange(setIntraUnreg, 'nonGst')}
                      onBlur={onBlurFormat(setIntraUnreg, 'nonGst')}
                      placeholder="0.00"
                    />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Inter-state supplies to registered person</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={interReg.nil ? String(interReg.nil) : ''}
                      onChange={onAmountChange(setInterReg, 'nil')}
                      onBlur={onBlurFormat(setInterReg, 'nil')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={interReg.exempted ? String(interReg.exempted) : ''}
                      onChange={onAmountChange(setInterReg, 'exempted')}
                      onBlur={onBlurFormat(setInterReg, 'exempted')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={interReg.nonGst ? String(interReg.nonGst) : ''}
                      onChange={onAmountChange(setInterReg, 'nonGst')}
                      onBlur={onBlurFormat(setInterReg, 'nonGst')}
                      placeholder="0.00"
                    />
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell>Inter-state supplies to unregistered person</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={interUnreg.nil ? String(interUnreg.nil) : ''}
                      onChange={onAmountChange(setInterUnreg, 'nil')}
                      onBlur={onBlurFormat(setInterUnreg, 'nil')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={interUnreg.exempted ? String(interUnreg.exempted) : ''}
                      onChange={onAmountChange(setInterUnreg, 'exempted')}
                      onBlur={onBlurFormat(setInterUnreg, 'exempted')}
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={interUnreg.nonGst ? String(interUnreg.nonGst) : ''}
                      onChange={onAmountChange(setInterUnreg, 'nonGst')}
                      onBlur={onBlurFormat(setInterUnreg, 'nonGst')}
                      placeholder="0.00"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NilRatedSuppliesPage;
