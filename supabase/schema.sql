-- =============================================================
--  Crypto Reco — database schema (Supabase / Postgres)
--  Run this in the Supabase SQL Editor once, before deploying.
-- =============================================================

create extension if not exists "pgcrypto";

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  company     text,
  needs       text,
  -- CRM pipeline stage
  status      text not null default 'new'
              check (status in ('new','contacted','qualified','won','lost')),
  source      text not null default 'website',
  ip          text,
  user_agent  text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

-- Row Level Security ON, with NO public policies.
-- The API uses the service-role key (server-side only), which bypasses RLS,
-- so the table is completely inaccessible from the public anon key. 
alter table public.leads enable row level security;
