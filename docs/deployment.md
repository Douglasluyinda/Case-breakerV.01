# Deployment Guide

Case Breaker deploys as two separate services:
- **Frontend** → Vercel (static, auto-deploy from `master`)
- **Backend** → Railway (Node.js, auto-deploy from `master`)

---

## 1. Backend — Railway

### Create the service

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `Douglasluyinda/Case-breakerV.01`
3. Set **Root Directory** to `backend`
4. Railway detects `nixpacks.toml` and builds automatically

### Environment variables

In Railway → Variables, add every key from `backend/.env.example`:

| Variable | Where to get it |
|---|---|
| `NODE_ENV` | Set to `production` |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `JWT_SECRET` | Supabase → Project Settings → API → JWT Settings |
| `R2_ACCOUNT_ID` | Cloudflare → R2 → Manage API Tokens |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 → API Token |
| `R2_SECRET_ACCESS_KEY` | Cloudflare → R2 → API Token |
| `R2_BUCKET` | Your R2 bucket name |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks (see below) |
| `STRIPE_PRO_PRICE_ID` | Stripe → Products → Pro price ID |
| `FLW_PUBLIC_KEY` | Flutterwave → Settings → API Keys |
| `FLW_SECRET_KEY` | Flutterwave → Settings → API Keys |
| `FLW_WEBHOOK_HASH` | Flutterwave → Webhooks → Secret hash |
| `APP_URL` | Your Vercel frontend URL (set after step 2) |
| `CORS_ORIGINS` | Same as `APP_URL` |

### Health check

Railway uses `GET /health` (configured in `railway.json`). After deploy, confirm:
```
curl https://<your-railway-url>/health
# → {"status":"ok","version":"0.1.0","env":"production","uptime":12}
```

### Stripe webhook

1. Stripe → Developers → Webhooks → Add endpoint
2. URL: `https://<your-railway-url>/checkout/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → paste as `STRIPE_WEBHOOK_SECRET` in Railway

### Flutterwave webhook

1. Flutterwave dashboard → Settings → Webhooks
2. URL: `https://<your-railway-url>/checkout/flutterwave/webhook`
3. Set **Secret Hash** → paste same value as `FLW_WEBHOOK_HASH` in Railway

---

## 2. Frontend — Vercel

### Create the project

1. Go to [vercel.com](https://vercel.com) → Add New Project → Import from GitHub
2. Select `Douglasluyinda/Case-breakerV.01`
3. Set **Root Directory** to `frontend`
4. Vercel detects `vercel.json` — framework is Vite

### Environment variables

In Vercel → Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Railway backend URL (no trailing slash) |

### Custom domain (optional)

Vercel → Domains → Add `casebreaker.deutschwithdoug.com` or similar.
Update `APP_URL` and `CORS_ORIGINS` in Railway to match.

---

## 3. Post-deploy checklist

- [ ] `GET /health` returns `{"status":"ok"}`
- [ ] Frontend loads at Vercel URL
- [ ] Register a test account
- [ ] Buy a test product with Stripe test card `4242 4242 4242 4242`
- [ ] Confirm order appears in `/dashboard`
- [ ] Download link works
- [ ] Subscribe to Pro → confirm subscription in Supabase `subscriptions` table
- [ ] Cancel subscription → confirm `cancel_at_period_end = true`

---

## 4. Database migrations

Run migrations in order against your Supabase project:

```bash
# In Supabase SQL editor, run each file in order:
docs/migrations/001_initial_schema.sql
docs/migrations/002_products.sql
docs/migrations/003_orders.sql
docs/migrations/004_subscriptions.sql
```

Or use the Supabase CLI:
```bash
supabase db push
```
