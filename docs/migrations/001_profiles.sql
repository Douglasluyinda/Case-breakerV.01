-- ── Migration 001: profiles table ─────────────────────────────────────────────
-- Run this in your Supabase SQL editor (or via supabase db push).
-- The `auth.users` table is managed by Supabase Auth — this extends it.

-- ── Table ──────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Index ──────────────────────────────────────────────────────────────────────
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

-- ── Trigger: keep updated_at current ──────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- ── Trigger: auto-create profile on sign-up ────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: owner read"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role can do everything (backend uses service role key)
-- Note: service_role bypasses RLS by default in Supabase — no policy needed.

-- ── Grant public schema usage ──────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
