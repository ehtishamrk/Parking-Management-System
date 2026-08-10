'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { amountDueForPeriod, previousMonthPeriod, currentMonthPeriod, paymentsForPeriod, RATE_PER_RECEIPT } from '@/lib/billing';
import { PlatformPayment } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, CreditCard, Tag } from 'lucide-react';

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [prev, setPrev] = useState({ receipts: 0, billed: 0, paid: 0, due: 0 });
  const [curr, setCurr] = useState({ receipts: 0, billed: 0, paid: 0, due: 0 });
  const [history, setHistory] = useState<PlatformPayment[]>([]);
  const prevPeriod = previousMonthPeriod();
  const currPeriod = currentMonthPeriod();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [p, c, h] = await Promise.all([
        amountDueForPeriod(supabase, prevPeriod),
        amountDueForPeriod(supabase, currPeriod),
        paymentsForPeriod(supabase, prevPeriod),
      ]);
      setPrev(p);
      setCurr(c);
      setHistory(h);
      setLoading(false);
    })();
  }, [prevPeriod, currPeriod]);

  if (loading) return <p className="text-steel">Loading…</p>;

  const isLocked = prev.due > 0 && new Date().getDate() >= 2;

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl mb-1">Billing</h1>
      <p className="text-steel text-sm mb-6">
        Rs {RATE_PER_RECEIPT} per receipt (every ticket and pass issued), billed monthly.
      </p>

      {isLocked && (
        <div className="flex items-start gap-3 bg-signal-red/10 border border-signal-red text-signal-red rounded-xl p-4 mb-6">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Access is currently suspended for operators</p>
            <p className="opacity-90 mt-0.5">
              Last month's bill wasn't cleared by the 1st. Operators can't log in until this is paid — clearing it below restores access immediately.
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className={`rounded-xl p-5 border ${prev.due > 0 ? 'bg-signal-red/10 border-signal-red' : 'bg-signal-green/10 border-signal-green'}`}>
          <p className="text-xs uppercase text-steel mb-1">{prevPeriod} — Last Month (Due)</p>
          <p className="font-display text-3xl mb-2">{formatCurrency(prev.due)}</p>
          <p className="text-xs text-steel">{prev.receipts} receipts × Rs {RATE_PER_RECEIPT} = {formatCurrency(prev.billed)}{prev.paid > 0 ? ` — ${formatCurrency(prev.paid)} already paid` : ''}</p>
        </div>
        <div className="rounded-xl p-5 border border-steel-line bg-paper">
          <p className="text-xs uppercase text-steel mb-1">{currPeriod} — This Month (Running)</p>
          <p className="font-display text-3xl mb-2">{formatCurrency(curr.billed)}</p>
          <p className="text-xs text-steel">{curr.receipts} receipts so far — not due until next month</p>
        </div>
      </div>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={18} />
          <p className="font-display text-xl">Pay Now</p>
        </div>
        {prev.due > 0 ? (
          <>
            <p className="text-sm text-steel mb-4">
              Online payment isn't wired up yet — it's coming with the control panel. For now, clearing your
              balance is handled manually: reach out with your last month's total ({formatCurrency(prev.due)})
              and we'll record it as paid, which unlocks the app immediately.
            </p>
            <button disabled className="bg-steel-line text-steel font-semibold px-5 py-2.5 rounded-lg text-sm cursor-not-allowed">
              Online Payment — Coming Soon
            </button>
          </>
        ) : (
          <p className="text-sm text-signal-green flex items-center gap-2">
            <CheckCircle2 size={16} /> You're all caught up — nothing owed for {prevPeriod}.
          </p>
        )}
      </div>

      <div className="bg-paper border border-steel-line rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={18} />
          <p className="font-display text-xl">Offers</p>
        </div>
        <p className="text-sm text-steel">No current offers on your account.</p>
      </div>

      <div className="bg-paper border border-steel-line rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-steel-line">
          <p className="font-display text-lg">Payment History — {prevPeriod}</p>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-steel px-5 py-4">No payments recorded yet for this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-chalk">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Date</th>
                <th className="text-left px-4 py-2.5 font-medium">Amount</th>
                <th className="text-left px-4 py-2.5 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-steel-line">
                  <td className="px-4 py-2.5">{new Date(h.paid_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{formatCurrency(Number(h.amount))}</td>
                  <td className="px-4 py-2.5 text-steel">{h.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
