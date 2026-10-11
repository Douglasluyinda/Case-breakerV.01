# Launch Checklist — Case Breaker

Work through this list top-to-bottom on launch day. Each section is ordered so later steps depend on earlier ones.

---

## 1. Infrastructure

### Supabase (production project)
- [ ] Create a **production** Supabase project (separate from dev)
- [ ] Run all migrations in order via the SQL editor or `supabase db push`:
  - `docs/migrations/001_initial_schema.sql`
  - `docs/migrations/002_products.sql`
  - `docs/migrations/003_orders.sql`
  - `docs/migrations/004_subscriptions.sql`
- [ ] Enable Row Level Security on every table
- [ ] RLS policy — `profiles`: users read/write own row only
- [ ] RLS policy — `orders`: users read own orders; service role writes
- [ ] RLS policy — `subscriptions`: users read own; service role writes
- [ ] RLS policy — `products`: public read (is_active = true); service role write
- [ ] RLS policy — `download_events`: service role insert only
- [ ] Copy `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`

### Cloudflare R2
- [ ] Create a bucket named `case-breaker-prod` (or your choice)
- [ ] Create an API token with **Object Read & Write** on that bucket
- [ ] Copy `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

### Stripe (live mode)
- [ ] Switch dashboard to **Live** mode
- [ ] Create product: **Case Breaker Pro** → price: $9.00/month recurring
- [ ] Copy `STRIPE_PRO_PRICE_ID` (starts with `price_live_...`)
- [ ] Copy `STRIPE_SECRET_KEY` (starts with `sk_live_...`)
- [ ] Webhooks → Add endpoint → `https://<railway-url>/checkout/stripe/webhook`
  - Events: `checkout.session.completed`, `customer.subscription.created`,
    `customer.subscription.updated`, `customer.subscription.deleted`,
    `invoice.payment_failed`
- [ ] Copy `STRIPE_WEBHOOK_SECRET` (starts with `whsec_...`)
- [ ] Webhooks → Add second endpoint → `https://<railway-url>/subscriptions/stripe/webhook`
  - Same events as above (subscriptions route handles the Pro billing cycle)

### Flutterwave (live mode)
- [ ] Switch dashboard to **Live** mode
- [ ] Settings → API Keys → copy `FLW_PUBLIC_KEY` + `FLW_SECRET_KEY`
- [ ] Settings → Webhooks → URL: `https://<railway-url>/checkout/flutterwave/webhook`
- [ ] Set **Secret Hash** → copy same value as `FLW_WEBHOOK_HASH`

---

## 2. Deploy Backend (Railway)

- [ ] Railway → New Project → Deploy from GitHub → `Douglasluyinda/Case-breakerV.01`
- [ ] Root directory: `backend`
- [ ] Add all environment variables (see `backend/.env.example`)
- [ ] Wait for first deploy to succeed (green checkmark)
- [ ] Run smoke test:
  ```bash
  ./scripts/smoke-test.sh https://<your-railway-url>.up.railway.app
  ```
  All 9 checks should pass.
- [ ] Note your Railway URL for the next step

---

## 3. Deploy Frontend (Vercel)

- [ ] Vercel → Add New Project → import `Douglasluyinda/Case-breakerV.01`
- [ ] Root directory: `frontend`
- [ ] Environment variable: `VITE_API_URL` = your Railway URL (no trailing slash)
- [ ] Deploy → wait for build to finish
- [ ] Visit the Vercel preview URL and confirm the app loads

---

## 4. Custom Domain

- [ ] Vercel → Domains → Add `casebreaker.deutschwithdoug.com`
- [ ] In your DNS provider, add the CNAME record Vercel shows
- [ ] Wait for SSL to provision (usually < 5 min)
- [ ] Update Railway env vars:
  - `APP_URL` = `https://casebreaker.deutschwithdoug.com`
  - `CORS_ORIGINS` = `https://casebreaker.deutschwithdoug.com`
- [ ] Railway will redeploy automatically

---

## 5. First Product Upload

- [ ] Admin → go to `/admin` on the live site (log in with your admin account)
- [ ] Or use the API directly:
  ```bash
  # 1. Create the product
  curl -X POST https://<railway-url>/products \
    -H "Authorization: Bearer <admin-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"slug":"german-case-cheatsheet","title":"German Case Cheat Sheet","description":"A printable A4 reference card for all 4 German cases.","priceUsd":4.99}'

  # 2. Get a presigned upload URL (replace <product-id> with the returned id)
  curl -X POST https://<railway-url>/products/<product-id>/upload-url \
    -H "Authorization: Bearer <admin-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"contentType":"application/pdf","fileName":"german-case-cheatsheet.pdf"}'

  # 3. Upload the file to R2 using the returned uploadUrl
  curl -X PUT "<uploadUrl>" \
    -H "Content-Type: application/pdf" \
    --data-binary @german-case-cheatsheet.pdf

  # 4. Link the R2 key back to the product
  curl -X PATCH https://<railway-url>/products/<product-id> \
    -H "Authorization: Bearer <admin-jwt>" \
    -H "Content-Type: application/json" \
    -d '{"r2Key":"<r2Key from step 2>","fileType":"application/pdf","fileSizeBytes":123456}'
  ```
- [ ] Activate the product: `{"isActive": true}` via PATCH (or toggle in Admin UI)

---

## 6. End-to-End Payment Test (Stripe test cards)

- [ ] Register a test account on the live site
- [ ] Go to `/shop` → click Buy on the first product
- [ ] Use Stripe test card: `4242 4242 4242 4242` · exp `12/34` · CVC `123`
- [ ] Confirm redirect to `/dashboard?payment=success` with green banner
- [ ] Confirm download link works → file opens/downloads
- [ ] Go to `/pro` → Subscribe
- [ ] Confirm redirect to dashboard with success state
- [ ] Check Supabase `subscriptions` table — row with `status = active`
- [ ] Cancel subscription → confirm `cancel_at_period_end = true`

---

## 7. Post-Launch

- [ ] Add site to Google Search Console → submit sitemap:
  `https://casebreaker.deutschwithdoug.com/sitemap.xml`
- [ ] Share link in DeutschwithDoug community / channel
- [ ] Monitor Railway logs for any 5xx errors in first 24h
- [ ] Set up Stripe email notifications for successful payments
- [ ] Set up Vercel spend alerts

---

## Quick Reference

| Service | URL |
|---------|-----|
| Backend API | `https://<railway-url>.up.railway.app` |
| API Docs | `https://<railway-url>.up.railway.app/docs` |
| Frontend | `https://casebreaker.deutschwithdoug.com` |
| Supabase dashboard | `https://supabase.com/dashboard` |
| Stripe dashboard | `https://dashboard.stripe.com` |
| Railway dashboard | `https://railway.app/dashboard` |
| Vercel dashboard | `https://vercel.com/dashboard` |
