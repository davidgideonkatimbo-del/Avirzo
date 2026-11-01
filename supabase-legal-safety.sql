-- Avirzo v2.18.0 — legal consent + content reports.
-- Run once in the Supabase SQL editor. Safe to re-run. Does not modify auth.users.

create table if not exists public.avirzo_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_version text not null,
  likeness_confirmed boolean not null default false,
  accepted_at timestamptz not null default now()
);
alter table public.avirzo_consents enable row level security;
drop policy if exists "avirzo_consents_select_own" on public.avirzo_consents;
create policy "avirzo_consents_select_own" on public.avirzo_consents for select to authenticated using (auth.uid() = user_id);
-- Writes happen only through the server (service role).

create table if not exists public.avirzo_content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  project_id text,
  reason text not null default 'other',
  details text,
  status text not null default 'open' check (status in ('open','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now()
);
alter table public.avirzo_content_reports enable row level security;
-- No client policies: reports are readable only by the service role / dashboard.
create index if not exists avirzo_content_reports_status_idx on public.avirzo_content_reports(status, created_at desc);

-- Review open reports:
-- select created_at, reason, project_id, details from public.avirzo_content_reports where status = 'open' order by created_at desc;
