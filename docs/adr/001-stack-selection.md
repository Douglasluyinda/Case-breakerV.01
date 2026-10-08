# ADR 001 — Full Stack Selection

**Status:** Accepted  
**Date:** 2026-10-09  
**Author:** Luyinda (DeutschwithDoug)

---

## Context

The DeutschwithDoug × Case Breaker platform needs a complete technology stack that supports:

1. A live arcade game (already built — React 18 + Vite)
2. Digital product sales (PDFs, vocab packs, workbooks)
3. SaaS subscriptions (Case Breaker Pro)
4. A customer dashboard and entitlement system
5. Payment collection in both USD (global) and UGX (Uganda / Africa)
6. Future mobile app (Expo SDK 54 + React Native)

Constraints: solo developer, early stage, cost must stay near zero until revenue arrives, must work well for users in Uganda and across Africa (latency, payment methods, data costs).

---

## Decisions

### 1. Backend Framework — Fastify (Node.js + TypeScript)

**Chosen:** Fastify 4  
**Alternatives considered:** Express, Hono, NestJS, FastAPI (Python)

**Reasons:**
- 3–5× faster than Express for JSON throughput
- First-class TypeScript support with schema-based validation
- Rich plugin ecosystem (JWT, CORS, multipart, rate-limit)
- Same language as frontend — no context switch
- Lighter than NestJS for a solo developer
- Hono is excellent but Fastify has broader community + more examples

---

### 2. Database — PostgreSQL via Supabase

**Chosen:** PostgreSQL hosted on Supabase (free tier → Pro as needed)  
**Alternatives considered:** PlanetScale (MySQL), Neon (serverless Postgres), Railway Postgres, SQLite + Turso

**Reasons:**
- Supabase free tier includes 500 MB Postgres + Auth + Storage — zero cost to start
- Row-Level Security (RLS) fits the entitlement model perfectly
- Supabase Auth eliminates a separate auth service in early milestones
- Postgres is the right choice for relational product/order/entitlement data
- Neon is also serverless Postgres but Supabase bundles more in one dashboard
- Can migrate off Supabase later — it's just Postgres

---

### 3. Authentication — Supabase Auth (JWT)

**Chosen:** Supabase Auth  
**Alternatives considered:** Auth0, Clerk, custom bcrypt + JWT, Firebase Auth

**Reasons:**
- Included in Supabase free tier — no extra service
- Emits standard JWTs verifiable in Fastify with `@fastify/jwt`
- Supports magic link, email/password, and social logins (Google)
- Clerk has better DX but costs money from day one
- Custom JWT is fine but auth is not a differentiator — use a service

---

### 4. Frontend Hosting — Vercel

**Chosen:** Vercel  
**Alternatives considered:** Netlify, Cloudflare Pages, Railway static

**Reasons:**
- Free tier: unlimited bandwidth, 100 GB/mo, preview deployments on every PR
- Zero-config Vite detection
- Edge CDN nodes close to East Africa (via Nairobi PoP)
- Preview URLs per PR are invaluable for review
- Netlify is equivalent; Vercel chosen for slightly better Vite ergonomics

---

### 5. Backend Hosting — Railway

**Chosen:** Railway  
**Alternatives considered:** Render, Fly.io, DigitalOcean App Platform, Supabase Edge Functions

**Reasons:**
- $5/mo Hobby plan covers a Node.js service + 1 GB RAM
- Zero-config Node.js deploy from `backend/` subdirectory
- Built-in env var management and deploy previews
- Render is similar but Railway has faster cold starts
- Supabase Edge Functions are Deno-based — adds complexity for a full Fastify app
- Fly.io requires more DevOps knowledge

---

### 6. File Storage — Cloudflare R2

**Chosen:** Cloudflare R2  
**Alternatives considered:** AWS S3, Supabase Storage, DigitalOcean Spaces

**Reasons:**
- **Zero egress fees** — critical for serving digital product downloads to users in Africa where data is expensive
- S3-compatible API — no vendor lock-in
- 10 GB free forever
- Supabase Storage is backed by S3 and charges egress — ruled out for this reason
- AWS S3 has egress fees, complex IAM

---

### 7. Transactional Email — Resend

**Chosen:** Resend  
**Alternatives considered:** SendGrid, Postmark, Amazon SES, Brevo

**Reasons:**
- 3 000 emails/mo free (covers early growth)
- Developer-friendly React Email integration
- Simple API — one SDK call
- SendGrid free tier was reduced; Postmark costs money from day one
- SES requires domain verification and AWS account complexity

---

### 8. Payments — Stripe + Flutterwave (abstraction layer)

**Chosen:** Both, behind a provider abstraction interface  
**Alternatives considered:** Paddle (merchant of record), Lemon Squeezy, PayPal only

**Reasons:**
- **Stripe** — best developer experience globally, required for USD subscriptions
- **Flutterwave** — accepts MTN Mobile Money, Airtel Money, local bank cards across Africa; essential for Uganda market
- Abstraction layer means adding PayPal or other providers later requires no refactoring
- Paddle/Lemon Squeezy handle tax but take 5–10% — too expensive at low volume

**Abstraction interface (TypeScript):**
```typescript
interface PaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  verifyWebhook(payload: string, signature: string): WebhookEvent;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;
}
```

---

## Consequences

- All backend code will be TypeScript. No JavaScript files in `backend/`.
- The repo will be restructured as a monorepo (`frontend/`, `backend/`, `docs/`) — tracked in issue #8.
- Supabase project must be created before M04 (Auth) work begins.
- Railway project must be created before M03 backend scaffold is deployed.
- Cloudflare R2 bucket must be created before M05 (digital products) work begins.
- Payment provider abstraction layer is built in M08 — Stripe and Flutterwave both integrated.

---

## References

- [Issue #3 — M02-01](https://github.com/Douglasluyinda/Case-breakerV.01/issues/3)
- [Issue #4 — M02-02 Database schema](https://github.com/Douglasluyinda/Case-breakerV.01/issues/4)
- [Issue #5 — M02-03 Backend scaffold](https://github.com/Douglasluyinda/Case-breakerV.01/issues/5)
- [Issue #6 — M02-04 Deployment strategy](https://github.com/Douglasluyinda/Case-breakerV.01/issues/6)
- [Issue #7 — M02-05 OpenAPI contract](https://github.com/Douglasluyinda/Case-breakerV.01/issues/7)
- [Issue #8 — M02-06 Monorepo structure](https://github.com/Douglasluyinda/Case-breakerV.01/issues/8)
