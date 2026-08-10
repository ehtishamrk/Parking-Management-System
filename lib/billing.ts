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
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * Reads from revenue_ledger — a permanent, trigger-maintained running total —
 * rather than counting rows in tickets/passes directly. That table gets
 * old tickets purged after 3 months (see purge_old_records()), but this
 * ledger never does, so historical revenue and receipt counts stay
 * accurate forever regardless of retention.
 */
export async function receiptsAndRevenueInRange(
  supabase: ReturnType<typeof createClient>,
  fromDate: string,
  toDateExclusive: string
) {
  const { data } = await supabase
    .from('revenue_ledger')
    .select('ticket_count, ticket_revenue, pass_count, pass_revenue')
    .gte('day', fromDate)
    .lt('day', toDateExclusive);
  const rows = data ?? [];
  const receipts = rows.reduce((s, r) => s + r.ticket_count + r.pass_count, 0);
  const revenue = rows.reduce((s, r) => s + Number(r.ticket_revenue) + Number(r.pass_revenue), 0);
  return { receipts, revenue };
}

export async function receiptsInPeriod(supabase: ReturnType<typeof createClient>, period: string) {
  const { from, to } = periodRange(period);
  const { receipts } = await receiptsAndRevenueInRange(supabase, from, to);
  return receipts;
}

export async function paymentsForPeriod(supabase: ReturnType<typeof createClient>, period: string) {
  const { data } = await supabase.from('platform_payments').select('*').eq('period', period).order('paid_at', { ascending: false });
  return data ?? [];
}

export async function amountDueForPeriod(supabase: ReturnType<typeof createClient>, period: string) {
  const { from, to } = periodRange(period);
  const [{ receipts }, payments] = await Promise.all([
    receiptsAndRevenueInRange(supabase, from, to),
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
