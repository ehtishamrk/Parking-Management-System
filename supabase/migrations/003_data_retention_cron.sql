-- =========================================================
-- Migration 003: schedule the 3-month data-purge job
-- Optional — only run this if you want automatic cleanup.
-- =========================================================

-- 1. In Supabase Dashboard → Database → Extensions, enable "pg_cron"
--    (search for it, toggle it on). Then run the rest of this file.

-- 2. Schedule purge_old_records() to run daily at 2 AM server time.
--    (purge_old_records() itself is created by schema.sql / this migration
--    if you haven't run schema.sql's latest version — see below.)
create or replace function purge_old_records() returns void as $$
begin
  delete from pass_entries where scanned_at < now() - interval '3 months';
  delete from tickets where created_at < now() - interval '3 months';
  delete from passes where created_at < now() - interval '3 months' and valid_to < now();
end;
$$ language plpgsql security definer;

select cron.schedule(
  'purge-old-parking-records',
  '0 2 * * *',
  $$ select purge_old_records(); $$
);

-- To check it's scheduled: select * from cron.job;
-- To remove it later: select cron.unschedule('purge-old-parking-records');
