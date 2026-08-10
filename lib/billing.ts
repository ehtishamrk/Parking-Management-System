import { createClient } from '@/lib/supabase/client';

export const RATE_PER_RECEIPT = 3.5;

export function periodKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function previousMonthPeriod(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return periodKey(d);
}

export function currentMonthPeriod(now = new Date()) {
  return periodKey(now);
}

function periodRange(period: string) {
  const [y, m] = period.split('-').map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function receiptsInPeriod(supabase: ReturnType<typeof createClient>, period: string) {
  const { from, to } = periodRange(period);
  const [{ count: ticketCount }, { count: passCount }] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
    supabase.from('passes').select('id', { count: 'exact', head: true }).gte('created_at', from).lt('created_at', to),
  ]);
  return (ticketCount ?? 0) + (passCount ?? 0);
}

export async function paymentsForPeriod(supabase: ReturnType<typeof createClient>, period: string) {
  const { data } = await supabase.from('platform_payments').select('*').eq('period', period).order('paid_at', { ascending: false });
  return data ?? [];
}

export async function amountDueForPeriod(supabase: ReturnType<typeof createClient>, period: string) {
  const [receipts, payments] = await Promise.all([
    receiptsInPeriod(supabase, period),
    paymentsForPeriod(supabase, period),
  ]);
  const billed = receipts * RATE_PER_RECEIPT;
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  return { receipts, billed, paid, due: Math.max(0, billed - paid) };
}

/**
 * The core lockout rule: the previous calendar month's bill is due by the
 * 1st. If it's still unpaid once the 2nd of the current month arrives, the
 * app locks until the platform operator records a payment.
 */
export async function getBillingLockStatus(supabase: ReturnType<typeof createClient>) {
  const now = new Date();
  const period = previousMonthPeriod(now);
  const { due, billed, paid, receipts } = await amountDueForPeriod(supabase, period);
  const pastGraceDay = now.getDate() >= 2;
  const locked = due > 0 && pastGraceDay;
  return { locked, period, due, billed, paid, receipts };
}
