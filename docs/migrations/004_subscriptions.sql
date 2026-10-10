-- ── Migration 004: subscriptions table ─────────────────────────────────────────
-- Run after 003_orders.sql.
-- Tracks Pro-tier SaaS subscriptions managed via Stripe Billing.

-- ── Enums ──────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.subscription_tier as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum (
    'trialing', 'active', 'past_due', 'cancelled', 'unpaid', 'incomplete'
  );
exception when duplicate_object then null; end $$;

-- ── Table ──────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  tier                    public.subscription_tier not null default 'pro',
  status                  public.subscription_status not null default 'active',
  stripe_customer_id      text,
  stripe_subscription_id  text unique,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  cancelled_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_stripe_sub_idx on public.subscriptions (stripe_subscription_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ── Updated-at trigger ────────────────────────────────────────────────────────
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.subscriptions enable row level security;

-- Users can read their own subscription
create policy "users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only service role can insert / update subscriptions (done by webhook handler)
create policy "service role manages subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
