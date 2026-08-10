import { PricingBasis } from './types';

export function generateTicketNumber() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TKT-${ymd}-${rand}`;
}

export function generatePassCode() {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PASS-${rand}`;
}

export function basisLabel(basis: PricingBasis) {
  return basis;
}

export function computeValidTo(basis: PricingBasis, from = new Date()): Date {
  const d = new Date(from);
  if (basis === 'monthly') d.setMonth(d.getMonth() + 1);
  else if (basis === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else if (basis === 'daily') d.setDate(d.getDate() + 1);
  else d.setDate(d.getDate() + 1); // hourly/fixed passes default 1 day if ever used
  return d;
}

// Hourly tickets bill on actual duration at exit, not a flat rate at entry.
// Rounds up to the next full hour (standard parking-lot convention), minimum 1 hour.
export function computeHourlyCharge(entryTimeIso: string, rate: number, exitTime = new Date()) {
  const entry = new Date(entryTimeIso);
  const elapsedMs = Math.max(0, exitTime.getTime() - entry.getTime());
  const hours = Math.max(1, Math.ceil(elapsedMs / (1000 * 60 * 60)));
  return { hours, amount: hours * rate };
}

export function formatCurrency(amount: number, symbol = 'Rs') {
  return `${symbol} ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
