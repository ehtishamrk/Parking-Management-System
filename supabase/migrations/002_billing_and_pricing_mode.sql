-- =========================================================
-- Migration 002: admin-controlled pricing mode + platform billing
-- Run this once in Supabase → SQL Editor (existing installs only —
-- fresh installs get this from the updated schema.sql directly).
-- =========================================================

-- ---------- 1. Admin chooses hourly OR fixed for regular tickets ----------
-- (Passes keep their own monthly/yearly basis — this only governs the
-- New Ticket counter flow.)
alter table lot_settings
  add column if not exists pricing_mode text not null default 'hourly'
  check (pricing_mode in ('hourly', 'fixed'));

-- ---------- 2. Platform billing: what this lot owes us ----------
-- One row per payment received against a given month ("period", e.g. '2026-08').
-- Amount owed for a period = (tickets + passes created in that period) × 3.5
--                             minus sum of platform_payments.amount for that period.
create table if not exists platform_payments (
  id uuid primary key default gen_random_uuid(),
  period text not null,              -- 'YYYY-MM'
  amount numeric(10,2) not null,
  note text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references profiles(id)
);
create index if not exists idx_platform_payments_period on platform_payments(period);

alter table platform_payments enable row level security;

-- Admins can see the payment history; nobody (not even admins) can insert
-- from the client — payments are recorded by the platform operator (you)
-- directly in SQL until the payment gateway is wired up. This is
-- intentional: if the tenant's own admin could self-mark their bill paid,
-- the lockout below would be meaningless.
create policy "platform_payments_admin_read" on platform_payments
  for select using (is_admin());
