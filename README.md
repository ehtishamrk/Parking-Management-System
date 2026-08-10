# ParkIn — Parking Management System (Web App)

Static Next.js app (for GitHub Pages) + Supabase backend. Admin + Ticket
Operator roles, pricing, digital passes, thermal-printer receipts, QR/barcode
verification, revenue reporting, Urdu toggle.

Because GitHub Pages only serves static files, there's no server-rendering
and no API routes here — everything talks to Supabase directly from the
browser, and the one action that needs elevated privileges (creating
operator logins) runs as a **Supabase Edge Function** instead of a Next.js
API route. Auth/role checks happen client-side (you'll see a brief "Loading…"
flash before a redirect — normal for static hosting, there's no way around
it without a server).

## 1. Create a Supabase project
Free tier at supabase.com — one project per parking lot client, per your plan.

## 2. Run the database schema
Supabase → SQL Editor → paste `supabase/schema.sql` → Run.
Creates every table, RLS policy, and seeds default pricing.

**Already ran schema.sql before?** Run these migrations in order:
1. `supabase/migrations/002_billing_and_pricing_mode.sql` — admin-controlled
   pricing mode + the platform billing table.
2. `supabase/migrations/004_permanent_revenue_ledger.sql` — adds a
   permanent, trigger-maintained revenue history table and backfills it
   from your existing tickets/passes, and fixes the retention purge so it
   only ever deletes old tickets — never passes, never revenue history.
   **Run this even if you haven't turned on the cron job yet** — it also
   fixes how the Dashboard and Billing pages calculate their numbers.
3. `supabase/migrations/003_data_retention_cron.sql` — optional, schedules
   the daily purge (needs the `pg_cron` extension enabled first;
   instructions are in the file). Only tickets older than 3 months are
   ever deleted — passes and all revenue history are permanent.

## 3. Create a public storage bucket
Supabase → Storage → New bucket → name it `branding` → toggle **Public**.
(Used for the logo upload on the Branding page.)

## 4. Deploy the Edge Function (for creating operator logins)
Install the Supabase CLI, then from the project folder:
```
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy manage-operator
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```
The service-role key lives only as a Supabase secret — it never reaches
GitHub Pages or the browser.

## 5. Create your first admin user
Supabase → Authentication → Add user (email + password). Then in SQL Editor:
```sql
insert into profiles (id, full_name, role)
values ('<the-user-id-from-auth>', 'Your Name', 'admin');
```
Every operator login after that is created from Admin → Operators in the app.

## 6. Push to GitHub and turn on Pages
1. Push this folder to a GitHub repo.
2. Repo → Settings → Pages → Source → **GitHub Actions**.
3. Repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. If your repo is NOT named `your-username.github.io` (i.e. it'll be served
   at `your-username.github.io/repo-name`), also add a repository **variable**
   (not secret) named `NEXT_PUBLIC_BASE_PATH` set to `/repo-name`.
5. Push to `main` — the included workflow (`.github/workflows/deploy.yml`)
   builds and deploys automatically. Check the Actions tab for the live URL.

## Local development
```
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

## What's built
- **Admin**: dashboard with a flexible date-range filter (presets + custom
  from/to) plus always-on today/week/month/quarter/year cards, a searchable
  Customers page (date range + plate lookup, 3-month retention), pricing
  matrix, admin-controlled Ticket Pricing Mode (hourly vs fixed — operators
  don't choose this), payment policy (advance/post/both), Billing (what
  this lot owes the platform, payment history, lockout status), branding,
  operator account management, pass issuing with ID-card printing, and the
  same ticket/verify tools operators use.
- **Operator**: New Ticket (vehicle type → plate → payment → print, using
  whichever pricing mode the admin set) with a Pass mode (scan QR → logs
  entry), and Verify (camera scan or type a number), with Mark Paid /
  Allow Exit actions. Hourly tickets bill actual duration at exit, rounded
  up to the next full hour.
- **Receipts & passes**: 80mm thermal-print ticket with QR code and
  auto-print on issue; separate ID-card-sized (85.6mm × 54mm) printable
  pass for handing to customers.
- **Billing & lockout**: Rs 3.5/receipt billed monthly. If last month's bill
  isn't cleared by the 1st, the app locks starting the 2nd — checked on
  every login and re-checked every 60 seconds so it also triggers mid-
  session. Admin can still reach the Billing page while locked; operators
  see a blocked screen until the admin clears it. Payments are recorded
  by you directly in Supabase for now (see Billing page in the app) —
  intentionally not a self-service button, since a tenant marking their
  own bill paid would defeat the lockout.
- **Language**: full English/Urdu toggle, right-to-left layout, persisted
  per device.
- **Auth**: Supabase Auth, client-side role gating (admin vs operator).

## Not yet built (next steps)
- One-tap "print on Enter" without the browser dialog — auto-print on
  issue gets close; a fully silent zero-dialog print needs a native
  wrapper (Capacitor/React Native), which fits your mobile-app-next plan.
  Chrome's `--kiosk-printing` launch flag is a same-day workaround for
  booth PCs/tablets in the meantime.
- Native mobile app — planned after this web app.
- Real payment gateway for the Billing page — planned with the control
  panel, per your build order. The UI is already shaped for it (Pay Now
  button, payment history table) so wiring in a gateway later is a
  swap-in, not a redesign.
- The top-level control panel (your own customers, kill switch, per-
  customer billing) — planned last, per your build order.
