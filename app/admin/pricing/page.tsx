'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PricingRule, VehicleType, PricingBasis, PaymentOption } from '@/lib/types';
import toast from 'react-hot-toast';

const VEHICLES: VehicleType[] = ['cycle', 'motorcycle', 'car'];
const BASES: PricingBasis[] = ['hourly', 'fixed', 'daily', 'monthly', 'yearly'];

export default function PricingPage() {
  const supabase = createClient();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentOption>('both');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: rulesData }, { data: settings }] = await Promise.all([
      supabase.from('pricing_rules').select('*').order('vehicle_type'),
      supabase.from('lot_settings').select('payment_mode').eq('id', 1).single(),
    ]);
    setRules(rulesData ?? []);
    setPaymentMode(settings?.payment_mode ?? 'both');
    setLoading(false);
  }

  function getRate(v: VehicleType, b: PricingBasis) {
    return rules.find((r) => r.vehicle_type === v && r.basis === b);
  }

  async function updateRate(v: VehicleType, b: PricingBasis, rate: number) {
    const existing = getRate(v, b);
    if (existing) {
      await supabase.from('pricing_rules').update({ rate, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('pricing_rules').insert({ vehicle_type: v, basis: b, rate });
    }
    toast.success('Rate saved');
    load();
  }

  async function savePaymentMode(mode: PaymentOption) {
    setPaymentMode(mode);
    await supabase.from('lot_settings').update({ payment_mode: mode }).eq('id', 1);
    toast.success('Payment policy updated');
  }

  if (loading) return <p className="text-steel">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Pricing</h1>
      <p className="text-steel text-sm mb-6">Set rates per vehicle and billing basis, and the lot-wide payment policy.</p>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-6">
        <p className="font-display text-lg mb-3">Payment Policy at Ticket Counter</p>
        <div className="flex flex-wrap gap-2">
          {(['advance', 'post', 'both'] as PaymentOption[]).map((m) => (
            <button
              key={m}
              onClick={() => savePaymentMode(m)}
              className={`px-4 py-2 rounded-lg text-sm border ${
                paymentMode === m ? 'bg-amber border-amber text-ink font-semibold' : 'border-steel-line text-steel'
              }`}
            >
              {m === 'advance' ? 'Advance payment only' : m === 'post' ? 'Pay on exit only' : 'Operator chooses either'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-paper border border-steel-line rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-chalk">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Vehicle</th>
              {BASES.map((b) => (
                <th key={b} className="text-left px-4 py-3 font-medium capitalize">{b}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {VEHICLES.map((v) => (
              <tr key={v} className="border-t border-steel-line">
                <td className="px-4 py-3 font-medium capitalize">{v}</td>
                {BASES.map((b) => (
                  <td key={b} className="px-4 py-2">
                    <RateInput value={getRate(v, b)?.rate} onSave={(rate) => updateRate(v, b, rate)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RateInput({ value, onSave }: { value?: number; onSave: (v: number) => void }) {
  const [val, setVal] = useState(value?.toString() ?? '');
  useEffect(() => setVal(value?.toString() ?? ''), [value]);
  return (
    <input
      type="number"
      value={val}
      placeholder="—"
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => val && onSave(Number(val))}
      className="w-24 border border-steel-line rounded-lg px-2 py-1.5 outline-none focus:border-amber"
    />
  );
}
