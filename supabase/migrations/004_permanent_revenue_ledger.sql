-- =========================================================
-- Migration 004: permanent revenue history + safer retention
-- Run this once in Supabase → SQL Editor (existing installs only —
-- fresh installs get this from the updated schema.sql directly).
--
-- Why: the original purge_old_records() deleted tickets after 3 months,
-- and every revenue number (dashboard, billing) was computed by summing
-- the live tickets/passes tables directly — so old revenue would have
-- been deleted along with the old tickets. This fixes that by keeping a
-- separate, permanent day-by-day ledger that the purge job never touches.
-- =========================================================

-- ---------- 1. Permanent revenue ledger (one row per calendar day) ----------
create table if not exists revenue_ledger (
  day date primary key,
  ticket_count int not null default 0,
  ticket_revenue numeric(12,2) not null default 0,
  pass_count int not null default 0,
  pass_revenue numeric(12,2) not null default 0
);

-- ---------- 2. Triggers that keep the ledger in sync automatically ----------
-- New ticket → add its amount to that day's bucket.
create or replace function ledger_on_ticket_insert() returns trigger as $$
begin
  insert into revenue_ledger (day, ticket_count, ticket_revenue)
  values (date(new.entry_time), 1, new.amount)
  on conflict (day) do update
    set ticket_count = revenue_ledger.ticket_count + 1,
        ticket_revenue = revenue_ledger.ticket_revenue + new.amount;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ledger_ticket_insert on tickets;
create trigger trg_ledger_ticket_insert
  after insert on tickets
  for each row execute function ledger_on_ticket_insert();

-- Hourly tickets get their final amount at exit (updated, not inserted) —
-- apply just the difference so the ledger stays correct either way.
create or replace function ledger_on_ticket_amount_update() returns trigger as $$
begin
  if new.amount is distinct from old.amount then
    update revenue_ledger
      set ticket_revenue = ticket_revenue + (new.amount - old.amount)
      where day = date(new.entry_time);
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ledger_ticket_update on tickets;
create trigger trg_ledger_ticket_update
  after update of amount on tickets
  for each row execute function ledger_on_ticket_amount_update();

-- New pass → add its payment to that day's bucket.
create or replace function ledger_on_pass_insert() returns trigger as $$
begin
  insert into revenue_ledger (day, pass_count, pass_revenue)
  values (date(new.created_at), 1, new.amount_paid)
  on conflict (day) do update
    set pass_count = revenue_ledger.pass_count + 1,
        pass_revenue = revenue_ledger.pass_revenue + new.amount_paid;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_ledger_pass_insert on passes;
create trigger trg_ledger_pass_insert
  after insert on passes
  for each row execute function ledger_on_pass_insert();

-- ---------- 3. Backfill the ledger from whatever data already exists ----------
insert into revenue_ledger (day, ticket_count, ticket_revenue)
select date(entry_time), count(*), coalesce(sum(amount), 0)
from tickets
group by date(entry_time)
on conflict (day) do update
  set ticket_count = revenue_ledger.ticket_count + excluded.ticket_count,
      ticket_revenue = revenue_ledger.ticket_revenue + excluded.ticket_revenue;

insert into revenue_ledger (day, pass_count, pass_revenue)
select date(created_at), count(*), coalesce(sum(amount_paid), 0)
from passes
group by date(created_at)
on conflict (day) do update
  set pass_count = revenue_ledger.pass_count + excluded.pass_count,
      pass_revenue = revenue_ledger.pass_revenue + excluded.pass_revenue;

-- ---------- 4. RLS: staff can read the ledger, nobody writes it by hand ----------
alter table revenue_ledger enable row level security;
create policy "revenue_ledger_read_all" on revenue_ledger for select using (auth.uid() is not null);

-- ---------- 5. Fix the purge job: tickets only, passes and pass_entries untouched ----------
create or replace function purge_old_records() returns void as $$
begin
  delete from tickets where created_at < now() - interval '3 months';
  -- Passes and pass_entries are intentionally NOT purged — a lapsed
  -- yearly/monthly pass is still meaningful, and revenue is preserved
  -- separately in revenue_ledger regardless of what's purged here.
end;
$$ language plpgsql security definer;
