-- ── Migration 003: orders table ────────────────────────────────────────────────
-- Run after 002_products.sql.
-- An order is created by the Commerce Engine (M08) once payment is confirmed.
-- The Entitlement System (M07) reads it to decide what a user can download.

-- ── Order status enum ──────────────────────────────────────────────────────────
do $$ begin
  create type public.order_status as enum ('pending', 'completed', 'refunded', 'failed');
exception when duplicate_object then null; end $$;

-- ── Table ──────────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  status          public.order_status not null default 'pending',
  amount_usd      numeric(10, 2) not null,
  payment_provider text,                      -- 'stripe' | 'flutterwave'
  provider_ref    text,                        -- provider's charge / order ID
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint orders_unique_completed unique (user_id, product_id, status)
    deferrable initially deferred               -- allows multi-row inserts
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
create index if not exists orders_user_idx       on public.orders (user_id);
create index if not exists orders_product_idx    on public.orders (product_id);
create index if not exists orders_status_idx     on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ── Updated-at trigger ────────────────────────────────────────────────────────
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.handle_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.orders enable row level security;

-- Users can see their own orders
create policy "orders: owner read"
  on public.orders for select
  using (auth.uid() = user_id);

-- Service role bypasses RLS — Commerce Engine writes orders with service key.

-- ── Grant ─────────────────────────────────────────────────────────────────────
grant select on public.orders to authenticated;
