-- Migration 005 — leads table
-- Stores email addresses captured by the free lead-magnet funnel.
-- No auth required to insert; the service role upserts on conflict.

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  ref         text,           -- affiliate/referral code (?ref= param)
  source      text not null default 'site',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for fast lookup by referral source
create index if not exists leads_ref_idx on public.leads (ref) where ref is not null;

-- RLS — service role can read/write; no public select
alter table public.leads enable row level security;

-- Only the service role (backend) may read leads
create policy "service role reads leads"
  on public.leads for select
  using (auth.role() = 'service_role');

-- Only the service role may update / delete
create policy "service role writes leads"
  on public.leads for all
  using (auth.role() = 'service_role');

-- Anyone may insert their own email (backend validates before calling supabaseAdmin)
-- The backend uses supabaseAdmin (service role) so this policy is effectively bypassed;
-- keep it here for future direct-client use.
create policy "anon insert leads"
  on public.leads for insert
  with check (true);
