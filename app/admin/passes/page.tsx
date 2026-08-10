'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Pass, VehicleType, PricingBasis, LotSettings } from '@/lib/types';
import { generatePassCode, computeValidTo, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Plus, Printer } from 'lucide-react';
import PassCard from '@/components/PassCard';

export default function PassesPage() {
  const supabase = createClient();
  const [passes, setPasses] = useState<Pass[]>([]);
  const [settings, setSettings] = useState<LotSettings | null>(null);
  const [printingPass, setPrintingPass] = useState<Pass | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    holder_name: '', phone: '', vehicle_type: 'car' as VehicleType, vehicle_number: '',
    basis: 'monthly' as PricingBasis, amount_paid: '',
  });

  useEffect(() => {
    load();
    supabase.from('lot_settings').select('*').eq('id', 1).single().then(({ data }) => setSettings(data));
  }, []);

  async function load() {
    const { data } = await supabase.from('passes').select('*').order('created_at', { ascending: false });
    setPasses(data ?? []);
  }

  async function issuePass(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const valid_to = computeValidTo(form.basis).toISOString().slice(0, 10);
    const { data, error } = await supabase.from('passes').insert({
      pass_code: generatePassCode(),
      holder_name: form.holder_name,
      phone: form.phone,
      vehicle_type: form.vehicle_type,
      vehicle_number: form.vehicle_number.toUpperCase(),
      basis: form.basis,
      amount_paid: Number(form.amount_paid),
      valid_to,
      created_by: userData.user?.id,
    }).select().single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pass issued');
    setShowForm(false);
    setForm({ holder_name: '', phone: '', vehicle_type: 'car', vehicle_number: '', basis: 'monthly', amount_paid: '' });
    load();
    if (data) setPrintingPass(data);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Passes</h1>
          <p className="text-steel text-sm">One-time payment, recurring entry via QR.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 bg-amber text-ink font-semibold px-4 py-2.5 rounded-lg text-sm">
          <Plus size={16} /> Issue Pass
        </button>
      </div>

      {showForm && (
        <form onSubmit={issuePass} className="bg-paper border border-steel-line rounded-xl p-5 mb-6 grid md:grid-cols-3 gap-4">
          <F label="Holder's Name" value={form.holder_name} onChange={(v) => setForm({ ...form, holder_name: v })} required />
          <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <F label="Vehicle Number" value={form.vehicle_number} onChange={(v) => setForm({ ...form, vehicle_number: v })} required />
          <div>
            <label className="text-xs text-steel">Vehicle Type</label>
            <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value as VehicleType })} className="w-full mt-1 border border-steel-line rounded-lg px-3 py-2">
              <option value="cycle">Cycle</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="car">Car</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-steel">Basis</label>
            <select value={form.basis} onChange={(e) => setForm({ ...form, basis: e.target.value as PricingBasis })} className="w-full mt-1 border border-steel-line rounded-lg px-3 py-2">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <F label="Amount Paid" type="number" value={form.amount_paid} onChange={(v) => setForm({ ...form, amount_paid: v })} required />
          <div className="md:col-span-3">
            <button disabled={saving} className="bg-ink text-chalk font-medium px-5 py-2.5 rounded-lg text-sm">{saving ? 'Issuing…' : 'Issue Pass'}</button>
          </div>
        </form>
      )}

      <div className="bg-paper border border-steel-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-chalk">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Code</th>
              <th className="text-left px-4 py-3 font-medium">Holder</th>
              <th className="text-left px-4 py-3 font-medium">Vehicle</th>
              <th className="text-left px-4 py-3 font-medium">Valid Until</th>
              <th className="text-left px-4 py-3 font-medium">Paid</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {passes.map((p) => (
              <tr key={p.id} className="border-t border-steel-line">
                <td className="px-4 py-3 mono-num">{p.pass_code}</td>
                <td className="px-4 py-3">{p.holder_name}</td>
                <td className="px-4 py-3">{p.vehicle_number}</td>
                <td className="px-4 py-3">{p.valid_to}</td>
                <td className="px-4 py-3">{formatCurrency(p.amount_paid)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'active' ? 'bg-signal-green/15 text-signal-green' : 'bg-signal-red/15 text-signal-red'}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setPrintingPass(p)} className="flex items-center gap-1 text-xs text-steel underline ml-auto">
                    <Printer size={13} /> Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {printingPass && settings && (
        <PassCard pass={printingPass} settings={settings} onClose={() => setPrintingPass(null)} />
      )}
    </div>
  );
}

function F({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-steel">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 border border-steel-line rounded-lg px-3 py-2 outline-none focus:border-amber" />
    </div>
  );
}
