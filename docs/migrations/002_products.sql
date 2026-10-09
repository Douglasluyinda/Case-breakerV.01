-- ── Migration 002: products table ─────────────────────────────────────────────
-- Run after 001_profiles.sql.

-- ── Table ──────────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  description     text,
  price_usd       numeric(10, 2) not null default 0,
  r2_key          text,                        -- Cloudflare R2 object key
  file_type       text,                        -- MIME type e.g. application/pdf
  file_size_bytes bigint,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────
create index if not exists products_slug_idx      on public.products (slug);
create index if not exists products_is_active_idx on public.products (is_active);
create index if not exists products_created_at_idx on public.products (created_at desc);

-- ── Updated-at trigger ────────────────────────────────────────────────────────
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute procedure public.handle_updated_at();
-- Note: handle_updated_at() was created in migration 001.

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.products enable row level security;

-- Anyone (incl. anonymous) can read active products
create policy "products: public read active"
  on public.products for select
  using (is_active = true);

-- Service role bypasses RLS — no write policy needed for anon/authenticated.

-- ── download_events table ─────────────────────────────────────────────────────
create table if not exists public.download_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create index if not exists download_events_user_idx    on public.download_events (user_id);
create index if not exists download_events_product_idx on public.download_events (product_id);
create index if not exists download_events_at_idx      on public.download_events (downloaded_at desc);

alter table public.download_events enable row level security;

-- Users can see their own download history
create policy "download_events: owner read"
  on public.download_events for select
  using (auth.uid() = user_id);

-- ── Grant ─────────────────────────────────────────────────────────────────────
grant select on public.products to anon, authenticated;
grant select on public.download_events to authenticated;
