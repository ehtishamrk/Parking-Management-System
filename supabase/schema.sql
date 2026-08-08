-- =========================================================
-- PARKING MANAGEMENT SYSTEM — DATABASE SCHEMA (Supabase/Postgres)
-- One Supabase project = one parking lot tenant.
-- =========================================================

-- ---------- ENUMS ----------
create type user_role as enum ('admin', 'operator');
create type vehicle_type as enum ('cycle', 'motorcycle', 'car');
create type pricing_basis as enum ('hourly', 'fixed', 'daily', 'monthly', 'yearly');
create type payment_option as enum ('advance', 'post', 'both'); -- lot-level policy
create type payment_status as enum ('paid', 'pending');
create type ticket_status as enum ('open', 'closed');
create type pass_status as enum ('active', 'expired', 'revoked');

-- ---------- PROFILES (extends auth.users) ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'operator',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- LOT SETTINGS (single row config) ----------
create table lot_settings (
  id int primary key default 1 check (id = 1), -- singleton row
  business_name text not null default 'My Parking Lot',
  logo_url text,
  address text,
  phone text,
  instructions text,       -- shown on receipt / entry
  rules text,              -- terms & conditions shown on receipt
  currency_symbol text not null default 'Rs',
  payment_mode payment_option not null default 'both',
  default_language text not null default 'en', -- 'en' | 'ur'
  receipt_footer text,
  updated_at timestamptz not null default now()
);
insert into lot_settings (id) values (1);

-- ---------- PRICING RULES ----------
-- one active rate per (vehicle_type, pricing_basis)
create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  vehicle_type vehicle_type not null,
  basis pricing_basis not null,
  rate numeric(10,2) not null,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (vehicle_type, basis)
);

-- ---------- PASSES (digital pass / subscription) ----------
create table passes (
  id uuid primary key default gen_random_uuid(),
  pass_code text unique not null,           -- encoded in QR
  holder_name text not null,
  phone text,
  vehicle_type vehicle_type not null,
  vehicle_number text not null,
  basis pricing_basis not null,             -- monthly / yearly typically
  amount_paid numeric(10,2) not null,
  valid_from date not null default current_date,
  valid_to date not null,
  status pass_status not null default 'active',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_passes_code on passes(pass_code);
create index idx_passes_vehicle on passes(vehicle_number);

-- log every time a pass is scanned at entry
create table pass_entries (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references passes(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  scanned_by uuid references profiles(id)
);

-- ---------- TICKETS ----------
create table tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text unique not null,       -- human readable + encoded in QR/barcode
  vehicle_type vehicle_type not null,
  vehicle_number text not null,
  basis pricing_basis not null,
  rate_applied numeric(10,2) not null,
  amount numeric(10,2) not null,
  payment_status payment_status not null default 'pending',
  payment_method text,                      -- cash / card / other, free text
  status ticket_status not null default 'open',
  entry_time timestamptz not null default now(),
  exit_time timestamptz,
  verified_at timestamptz,
  verified_by uuid references profiles(id),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index idx_tickets_number on tickets(ticket_number);
create index idx_tickets_vehicle on tickets(vehicle_number);
create index idx_tickets_created_at on tickets(created_at);

-- ---------- BILLING (what we charge the lot: 3.5 Rs per receipt) ----------
-- A "receipt" = any closed ticket OR any issued pass. Computed via view, not stored.
create view daily_receipt_counts as
  select date(created_at) as day, count(*) as receipt_count
  from (
    select created_at from tickets
    union all
    select created_at from passes
  ) x
  group by date(created_at);

-- ---------- REVENUE VIEWS ----------
create view revenue_daily as
  select date(entry_time) as day, sum(amount) as revenue, count(*) as ticket_count
  from tickets
  group by date(entry_time);

-- ---------- ROW LEVEL SECURITY ----------
alter table profiles enable row level security;
alter table lot_settings enable row level security;
alter table pricing_rules enable row level security;
alter table passes enable row level security;
alter table pass_entries enable row level security;
alter table tickets enable row level security;

-- helper: is current user an admin
create function is_admin() returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and is_active = true
  );
$$ language sql security definer stable;

-- profiles: everyone can read their own row; admins can read/manage all
create policy "profiles_self_read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_admin_write" on profiles for insert with check (is_admin());
create policy "profiles_admin_update" on profiles for update using (is_admin());

-- lot_settings: any authenticated staff can read; only admin can write
create policy "settings_read_all" on lot_settings for select using (auth.uid() is not null);
create policy "settings_admin_write" on lot_settings for update using (is_admin());

-- pricing_rules: staff read, admin write
create policy "pricing_read_all" on pricing_rules for select using (auth.uid() is not null);
create policy "pricing_admin_write" on pricing_rules for all using (is_admin()) with check (is_admin());

-- passes: staff can read + create (issue passes at counter); admin can do everything
create policy "passes_read_all" on passes for select using (auth.uid() is not null);
create policy "passes_staff_insert" on passes for insert with check (auth.uid() is not null);
create policy "passes_admin_update" on passes for update using (is_admin());

-- pass_entries: staff can read + insert (scan log)
create policy "pass_entries_read_all" on pass_entries for select using (auth.uid() is not null);
create policy "pass_entries_staff_insert" on pass_entries for insert with check (auth.uid() is not null);

-- tickets: staff can read + create + update (close/verify); admin full access
create policy "tickets_read_all" on tickets for select using (auth.uid() is not null);
create policy "tickets_staff_insert" on tickets for insert with check (auth.uid() is not null);
create policy "tickets_staff_update" on tickets for update using (auth.uid() is not null);

-- ---------- SEED DEFAULT PRICING ----------
insert into pricing_rules (vehicle_type, basis, rate) values
  ('cycle', 'hourly', 10), ('cycle', 'daily', 40), ('cycle', 'monthly', 500), ('cycle', 'yearly', 5000),
  ('motorcycle', 'hourly', 20), ('motorcycle', 'daily', 80), ('motorcycle', 'monthly', 1000), ('motorcycle', 'yearly', 10000),
  ('car', 'hourly', 50), ('car', 'daily', 200), ('car', 'monthly', 2500), ('car', 'yearly', 25000);
