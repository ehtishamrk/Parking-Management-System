# ParkStub — Parking Management System (Web App)

Admin + Ticket Operator web app for a parking lot: pricing, digital passes,
ticketing with thermal-printer receipts, QR/barcode verification, and
revenue reporting. Built with Next.js (App Router) + Supabase.

## 1. Create a Supabase project
Free tier at supabase.com — one project per parking lot client (per your model).

## 2. Run the schema
Open Supabase → SQL Editor → paste the contents of `supabase/schema.sql` → Run.
This creates all tables, RLS policies, the default pricing seed, and enables
row-level security so operators can only do what they need to.

## 3. Create a storage bucket for the logo
Supabase → Storage → New bucket → name it `branding` → make it **public**.

## 4. Environment variables
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — same page, **keep this secret**, it's only used
  server-side (in `app/api/operators`) to create operator logins.

## 5. Create the first admin user
Supabase → Authentication → Add user (email + password), then in the SQL editor:
```sql
insert into profiles (id, full_name, role)
values ('<the-user-id-from-auth>', 'Your Name', 'admin');
```
All operator logins after that are created from inside the app (Admin → Operators),
no manual SQL needed.

## 6. Install & run
```
npm install
npm run dev
```

## What's built
- **Admin**: dashboard (revenue by day/week/month/quarter/year + platform fee
  at Rs 3.5/receipt), pricing matrix (vehicle × basis), payment policy
  (advance/post/both), branding (logo/address/instructions/rules), operator
  account management, pass issuing, and the same new-ticket/verify tools
  operators use.
- **Operator**: New Ticket (vehicle type → plate → payment → print) and a
  dedicated Pass mode that scans a QR and logs entry; Verify (by camera scan
  or by typing the ticket number/plate), shows payment status, lets the
  operator mark paid or allow exit.
- **Receipts**: 80mm thermal-print layout with logo, business info, unique
  QR code, and CSS `@media print` rules sized for thermal printers.
- **Language**: full English/Urdu toggle, right-to-left layout, persisted
  per device.
- **Auth**: Supabase Auth with role-based routing (admin vs operator) via
  middleware; operator logins are created by admins through a protected API
  route using the service-role key — never exposed to the browser.

## Not yet built (next steps)
- Bluetooth thermal-printer SDK integration (current print uses the browser
  print dialog, which works with most Bluetooth thermal printers configured
  as a system printer on Android — a native/Capacitor wrapper is the next
  step for one-tap "print on Enter" without the dialog)
- Hourly tickets currently price at a flat rate per basis rather than
  duration × rate at exit (needs an exit-time duration calculator)
  Note: `exit_time` and `verified_at` are already captured on exit
- Native mobile app (React Native / Capacitor) — planned after this web app
- The top-level control panel (managing your own customers/tenants, kill
  switch, per-customer billing) — planned last, per your build order
