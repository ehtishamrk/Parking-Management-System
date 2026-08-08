# ParkStub — Parking Management System (Web App)

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
- **Admin**: dashboard (revenue by day/week/month/quarter/year + platform
  fee at Rs 3.5/receipt), pricing matrix, payment policy (advance/post/both),
  branding (logo/address/instructions/rules), operator account management
  (via the Edge Function), pass issuing, and the same ticket/verify tools
  operators use.
- **Operator**: New Ticket (vehicle type → plate → payment → print) with a
  Pass mode (scan QR → logs entry), and Verify (camera scan or type a
  number), with Mark Paid / Allow Exit actions.
- **Receipts**: 80mm thermal-print CSS, unique QR code per ticket.
- **Language**: full English/Urdu toggle, right-to-left layout, persisted
  per device.
- **Auth**: Supabase Auth, client-side role gating (admin vs operator).

## Not yet built (next steps)
- One-tap "print on Enter" without the browser dialog — needs a native
  wrapper (Capacitor/React Native), which fits your mobile-app-next plan.
- Hourly tickets currently price at a flat rate per basis rather than
  duration × rate at exit (`exit_time` is already captured, just not billed
  against yet).
- Native mobile app — planned after this web app.
- The top-level control panel (your own customers, kill switch, per-customer
  billing) — planned last, per your build order.
