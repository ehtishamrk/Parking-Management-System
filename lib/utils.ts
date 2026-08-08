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

export function formatCurrency(amount: number, symbol = 'Rs') {
  return `${symbol} ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
