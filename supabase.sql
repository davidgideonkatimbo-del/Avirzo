-- =====================================================================
-- Avirzo v2.1.8 database setup  (safe to run more than once)
--
-- Designed to share a Supabase project with other apps:
--   * every table, index, trigger, constraint, policy and function is prefixed "avirzo_"
--     (or already Avirzo-specific), so nothing here touches another app's objects
--   * nothing here drops, alters or renames anything that is not Avirzo's
--   * it never edits auth.users and only adds the private storage bucket "avirzo-media"
--
-- If you previously ran an older Avirzo script in THIS project (tables named
-- projects/assets/jobs), run supabase-migrate-from-unprefixed.sql FIRST, then this file.
-- =====================================================================

-- ---------- shared helper (Avirzo's own copy; does not replace any other app's function)
create or replace function public.avirzo_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- projects
create table if not exists public.avirzo_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.avirzo_projects enable row level security;
drop policy if exists "Users can read their own Avirzo projects" on public.avirzo_projects;
drop policy if exists "Users can create their own Avirzo projects" on public.avirzo_projects;
drop policy if exists "Users can update their own Avirzo projects" on public.avirzo_projects;
drop policy if exists "Users can delete their own Avirzo projects" on public.avirzo_projects;
drop policy if exists "avirzo_projects_select_own" on public.avirzo_projects;
drop policy if exists "avirzo_projects_insert_own" on public.avirzo_projects;
drop policy if exists "avirzo_projects_update_own" on public.avirzo_projects;
drop policy if exists "avirzo_projects_delete_own" on public.avirzo_projects;
create policy "avirzo_projects_select_own" on public.avirzo_projects for select to authenticated using (auth.uid() = user_id);
create policy "avirzo_projects_insert_own" on public.avirzo_projects for insert to authenticated with check (auth.uid() = user_id);
create policy "avirzo_projects_update_own" on public.avirzo_projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "avirzo_projects_delete_own" on public.avirzo_projects for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists projects_set_updated_at on public.avirzo_projects;
drop trigger if exists avirzo_projects_set_updated_at on public.avirzo_projects;
create trigger avirzo_projects_set_updated_at
before update on public.avirzo_projects
for each row execute function public.avirzo_set_updated_at();

-- ---------- private media bucket + per-user folder policies
insert into storage.buckets (id, name, public) values ('avirzo-media','avirzo-media',false) on conflict (id) do nothing;

drop policy if exists "Avirzo media read own files" on storage.objects;
drop policy if exists "Avirzo media upload own files" on storage.objects;
drop policy if exists "Avirzo media update own files" on storage.objects;
drop policy if exists "Avirzo media delete own files" on storage.objects;
create policy "Avirzo media read own files" on storage.objects for select to authenticated
  using (bucket_id = 'avirzo-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avirzo media upload own files" on storage.objects for insert to authenticated
  with check (bucket_id = 'avirzo-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avirzo media update own files" on storage.objects for update to authenticated
  using (bucket_id = 'avirzo-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avirzo-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Avirzo media delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'avirzo-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- assets (generated / uploaded / exported media registry)
create table if not exists public.avirzo_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null references public.avirzo_projects(id) on delete cascade,
  kind text not null check (kind in ('video','audio','image','export')),
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  source_provider text,
  provider_task_id text,
  created_at timestamptz not null default now()
);
alter table public.avirzo_assets add column if not exists provider_task_id text;

alter table public.avirzo_assets enable row level security;
drop policy if exists "Users can read their own Avirzo assets" on public.avirzo_assets;
drop policy if exists "Users can create their own Avirzo assets" on public.avirzo_assets;
drop policy if exists "Users can delete their own Avirzo assets" on public.avirzo_assets;
drop policy if exists "avirzo_assets_select_own" on public.avirzo_assets;
drop policy if exists "avirzo_assets_insert_own" on public.avirzo_assets;
drop policy if exists "avirzo_assets_delete_own" on public.avirzo_assets;
create policy "avirzo_assets_select_own" on public.avirzo_assets for select to authenticated using (auth.uid() = user_id);
create policy "avirzo_assets_insert_own" on public.avirzo_assets for insert to authenticated
  with check (auth.uid() = user_id and split_part(storage_path, '/', 1) = auth.uid()::text);
create policy "avirzo_assets_delete_own" on public.avirzo_assets for delete to authenticated using (auth.uid() = user_id);
-- Assets are immutable after creation: no UPDATE policy.

create index if not exists avirzo_assets_user_project_idx on public.avirzo_assets(user_id, project_id, created_at desc);
create unique index if not exists avirzo_assets_user_provider_task_uidx on public.avirzo_assets(user_id, provider_task_id) where provider_task_id is not null;

-- ---------- durable jobs
create table if not exists public.avirzo_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.avirzo_projects(id) on delete set null,
  type text not null,
  status text not null default 'queued',
  provider_task_id text,
  progress integer not null default 0 check (progress between 0 and 100),
  result_asset_id uuid,
  error text,
  payload jsonb,
  attempts integer not null default 0,
  locked_at timestamptz,
  worker_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.avirzo_jobs add column if not exists payload jsonb;
alter table public.avirzo_jobs add column if not exists attempts integer not null default 0;
alter table public.avirzo_jobs add column if not exists locked_at timestamptz;
alter table public.avirzo_jobs add column if not exists worker_id text;

-- Constraints are scoped to avirzo_jobs only (never matched by bare name across the database).
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.avirzo_jobs'::regclass and contype = 'c'
      and conname in ('jobs_type_check','jobs_status_check','avirzo_jobs_type_check','avirzo_jobs_status_check')
  loop
    execute format('alter table public.avirzo_jobs drop constraint %I', c.conname);
  end loop;
  alter table public.avirzo_jobs add constraint avirzo_jobs_type_check check (type in ('video_generation','character_performance','film_export'));
  alter table public.avirzo_jobs add constraint avirzo_jobs_status_check check (status in ('queued','running','succeeded','failed','canceled','dead_letter'));
end $$;

do $$
begin
  update public.avirzo_jobs j set result_asset_id = null
  where result_asset_id is not null and not exists (select 1 from public.avirzo_assets a where a.id = j.result_asset_id);
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.avirzo_jobs'::regclass and contype = 'f' and confrelid = 'public.avirzo_assets'::regclass
  ) then
    alter table public.avirzo_jobs add constraint avirzo_jobs_result_asset_fkey
      foreign key (result_asset_id) references public.avirzo_assets(id) on delete set null;
  end if;
end $$;

create index if not exists avirzo_jobs_user_project_created_idx on public.avirzo_jobs(user_id, project_id, created_at desc);
create index if not exists avirzo_jobs_provider_task_idx on public.avirzo_jobs(provider_task_id);
create index if not exists avirzo_jobs_worker_queue_idx on public.avirzo_jobs(status, type, created_at);

alter table public.avirzo_jobs enable row level security;
drop policy if exists "jobs_select_own" on public.avirzo_jobs;
drop policy if exists "jobs_insert_own" on public.avirzo_jobs;
drop policy if exists "jobs_update_own" on public.avirzo_jobs;
drop policy if exists "avirzo_jobs_select_own" on public.avirzo_jobs;
create policy "avirzo_jobs_select_own" on public.avirzo_jobs for select to authenticated using (auth.uid() = user_id);
-- Clients may only READ jobs. All writes go through the server (service role).
revoke insert, update, delete on public.avirzo_jobs from anon, authenticated;

drop trigger if exists jobs_set_updated_at on public.avirzo_jobs;
drop trigger if exists avirzo_jobs_set_updated_at on public.avirzo_jobs;
create trigger avirzo_jobs_set_updated_at
before update on public.avirzo_jobs
for each row execute function public.avirzo_set_updated_at();

-- ---------- worker claim (database-level locking; callable only by the server's service role)
drop function if exists public.claim_avirzo_job(text[]);
create function public.claim_avirzo_job(requested_types text[])
returns setof public.avirzo_jobs
language plpgsql
security definer
set search_path = public
as $$
declare claimed public.avirzo_jobs;
begin
  -- Recover jobs whose worker vanished (lock not renewed for 30 minutes).
  update public.avirzo_jobs
  set status = case when attempts >= 3 then 'dead_letter' else 'queued' end,
      locked_at = null, worker_id = null,
      error = case when attempts >= 3 then 'Maximum worker attempts reached.' else error end,
      updated_at = now()
  where status = 'running'
    and type = any(requested_types)
    and locked_at is not null
    and locked_at < now() - interval '30 minutes';

  select * into claimed
  from public.avirzo_jobs
  where status = 'queued'
    and type = any(requested_types)
  order by created_at
  for update skip locked
  limit 1;

  if claimed.id is null then
    return;
  end if;

  update public.avirzo_jobs
  set status = 'running', progress = greatest(progress, 1), attempts = attempts + 1,
      locked_at = now(), worker_id = concat('worker-', gen_random_uuid()::text), updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

-- ---------- worker heartbeat + durable usage quotas
create table if not exists public.avirzo_worker_heartbeats (
  service_name text primary key,
  worker_id text not null,
  project_ref text,
  last_seen_at timestamptz not null default now()
);
alter table public.avirzo_worker_heartbeats enable row level security;
revoke all on public.avirzo_worker_heartbeats from anon, authenticated;

create table if not exists public.avirzo_usage_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (user_id, kind, window_start)
);
alter table public.avirzo_usage_counters enable row level security;
drop policy if exists "usage_select_own" on public.avirzo_usage_counters;
drop policy if exists "avirzo_usage_select_own" on public.avirzo_usage_counters;
create policy "avirzo_usage_select_own" on public.avirzo_usage_counters for select to authenticated using (auth.uid() = user_id);
revoke all on public.avirzo_usage_counters from anon, authenticated;
grant select on public.avirzo_usage_counters to authenticated;

drop function if exists public.consume_avirzo_usage(uuid, text, timestamptz, integer);
create function public.consume_avirzo_usage(p_user_id uuid, p_kind text, p_window_start timestamptz, p_limit integer)
returns table(allowed boolean, current_count integer, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare new_count integer;
begin
  insert into public.avirzo_usage_counters(user_id, kind, window_start, count) values (p_user_id, p_kind, p_window_start, 1)
  on conflict (user_id, kind, window_start) do update set count = avirzo_usage_counters.count + 1
  returning count into new_count;
  if new_count > p_limit then
    update public.avirzo_usage_counters set count = count - 1
    where user_id = p_user_id and kind = p_kind and window_start = p_window_start;
    return query select false, new_count - 1, greatest(1, ceil(extract(epoch from (p_window_start + case when p_kind = 'generation' then interval '1 year' else interval '1 hour' end - now())))::integer);
  else
    return query select true, new_count, greatest(1, ceil(extract(epoch from (p_window_start + case when p_kind = 'generation' then interval '1 year' else interval '1 hour' end - now())))::integer);
  end if;
end;
$$;

-- Worker-only functions: never callable by browsers.
revoke execute on function public.claim_avirzo_job(text[]) from public, anon, authenticated;
revoke execute on function public.consume_avirzo_usage(uuid, text, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.claim_avirzo_job(text[]) to service_role;
grant execute on function public.consume_avirzo_usage(uuid, text, timestamptz, integer) to service_role;

-- Make PostgREST pick up the new tables/functions immediately.
notify pgrst, 'reload schema';

-- =====================================================================
-- v2.3 premium workspace layer: collaboration + billing
-- =====================================================================
create table if not exists public.avirzo_project_members (
  project_id uuid not null references public.avirzo_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','commenter','viewer')),
  created_at timestamptz not null default now(),
  primary key (project_id,user_id)
);
alter table public.avirzo_project_members enable row level security;
drop policy if exists "avirzo_project_members_select" on public.avirzo_project_members;
create policy "avirzo_project_members_select" on public.avirzo_project_members for select to authenticated using (
  auth.uid() = user_id or exists (select 1 from public.avirzo_projects p where p.id = project_id and p.user_id = auth.uid())
);
revoke insert, update, delete on public.avirzo_project_members from anon, authenticated;

create table if not exists public.avirzo_project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.avirzo_projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','commenter','viewer')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index if not exists avirzo_project_invites_project_email_idx on public.avirzo_project_invites(project_id,lower(email));
alter table public.avirzo_project_invites enable row level security;
revoke all on public.avirzo_project_invites from anon, authenticated;

create table if not exists public.avirzo_billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','creator','studio')),
  status text not null default 'active',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.avirzo_billing_accounts enable row level security;
drop policy if exists "avirzo_billing_accounts_select_own" on public.avirzo_billing_accounts;
create policy "avirzo_billing_accounts_select_own" on public.avirzo_billing_accounts for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.avirzo_billing_accounts from anon, authenticated;
create index if not exists avirzo_project_members_user_idx on public.avirzo_project_members(user_id,project_id);

create or replace function public.avirzo_project_role(p_project_id uuid, p_user_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case when p.user_id = p_user_id then 'owner' else coalesce(m.role,'') end
  from public.avirzo_projects p
  left join public.avirzo_project_members m on m.project_id = p.id and m.user_id = p_user_id
  where p.id = p_project_id;
$$;
-- The two-argument form accepts any user id, so it must never be callable by browsers (it would reveal who belongs to which project).
revoke all on function public.avirzo_project_role(uuid,uuid) from public, anon, authenticated;
grant execute on function public.avirzo_project_role(uuid,uuid) to service_role;

-- Browsers (and RLS policies) use this caller-bound form: it can only ever answer "what is MY role on this project?".
create or replace function public.avirzo_my_project_role(p_project_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select public.avirzo_project_role(p_project_id, auth.uid());
$$;
revoke all on function public.avirzo_my_project_role(uuid) from public, anon;
grant execute on function public.avirzo_my_project_role(uuid) to authenticated, service_role;

drop policy if exists "avirzo_projects_select_own" on public.avirzo_projects;
drop policy if exists "avirzo_projects_update_own" on public.avirzo_projects;
drop policy if exists "avirzo_projects_delete_own" on public.avirzo_projects;
create policy "avirzo_projects_select_own" on public.avirzo_projects for select to authenticated using (public.avirzo_my_project_role(id) <> '');
create policy "avirzo_projects_update_own" on public.avirzo_projects for update to authenticated using (public.avirzo_my_project_role(id) in ('owner','editor')) with check (public.avirzo_my_project_role(id) in ('owner','editor'));
create policy "avirzo_projects_delete_own" on public.avirzo_projects for delete to authenticated using (public.avirzo_my_project_role(id) = 'owner');

-- Shared project media access follows the same project role model.
drop policy if exists "avirzo_assets_select_own" on public.avirzo_assets;
drop policy if exists "avirzo_assets_insert_own" on public.avirzo_assets;
drop policy if exists "avirzo_assets_delete_own" on public.avirzo_assets;
create policy "avirzo_assets_select_own" on public.avirzo_assets for select to authenticated using (
  user_id = auth.uid() or (project_id is not null and public.avirzo_my_project_role(project_id) <> '')
);
create policy "avirzo_assets_insert_own" on public.avirzo_assets for insert to authenticated with check (
  user_id = auth.uid() and split_part(storage_path, '/', 1) = auth.uid()::text
);
create policy "avirzo_assets_delete_own" on public.avirzo_assets for delete to authenticated using (
  user_id = auth.uid() or (project_id is not null and public.avirzo_my_project_role(project_id) in ('owner','editor'))
);

drop policy if exists "avirzo_jobs_select_own" on public.avirzo_jobs;
create policy "avirzo_jobs_select_own" on public.avirzo_jobs for select to authenticated using (
  user_id = auth.uid() or (project_id is not null and public.avirzo_my_project_role(project_id) <> '')
);

-- ---------- premium production workflow: versions, comments, approvals
create table if not exists public.avirzo_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.avirzo_projects(id) on delete cascade,
  version_number integer not null,
  label text not null default 'Version',
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(project_id,version_number)
);
alter table public.avirzo_project_versions enable row level security;
drop policy if exists "avirzo_project_versions_access" on public.avirzo_project_versions;
create policy "avirzo_project_versions_access" on public.avirzo_project_versions for select to authenticated using (public.avirzo_my_project_role(project_id) <> '');
revoke insert, update, delete on public.avirzo_project_versions from anon, authenticated;

create table if not exists public.avirzo_project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.avirzo_projects(id) on delete cascade,
  scene_id text,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.avirzo_project_comments enable row level security;
drop policy if exists "avirzo_project_comments_access" on public.avirzo_project_comments;
create policy "avirzo_project_comments_access" on public.avirzo_project_comments for select to authenticated using (public.avirzo_my_project_role(project_id) <> '');
revoke insert, update, delete on public.avirzo_project_comments from anon, authenticated;

create table if not exists public.avirzo_scene_approvals (
  project_id uuid not null references public.avirzo_projects(id) on delete cascade,
  scene_id text not null,
  status text not null default 'draft' check(status in ('draft','review','approved','locked')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key(project_id,scene_id)
);
alter table public.avirzo_scene_approvals enable row level security;
drop policy if exists "avirzo_scene_approvals_access" on public.avirzo_scene_approvals;
create policy "avirzo_scene_approvals_access" on public.avirzo_scene_approvals for select to authenticated using (public.avirzo_my_project_role(project_id) <> '');
revoke insert, update, delete on public.avirzo_scene_approvals from anon, authenticated;

create index if not exists avirzo_versions_project_idx on public.avirzo_project_versions(project_id,version_number desc);
create index if not exists avirzo_comments_project_idx on public.avirzo_project_comments(project_id,created_at);

-- =====================================================================
-- v2.8.3 security & billing patch (safe to run more than once)
-- =====================================================================

-- Project ownership can never change (an editor could otherwise update user_id and take the project).
create or replace function public.avirzo_projects_lock_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Project ownership cannot be changed.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists avirzo_projects_lock_owner on public.avirzo_projects;
create trigger avirzo_projects_lock_owner
before update on public.avirzo_projects
for each row execute function public.avirzo_projects_lock_owner();

-- Invites are upserted on (project_id, email); PostgREST needs a plain unique index on exactly those columns
-- (the earlier lower(email) expression index does not match, which made invitations fail).
create unique index if not exists avirzo_project_invites_project_email_uidx on public.avirzo_project_invites(project_id, email);
drop index if exists public.avirzo_project_invites_project_email_idx;

-- Billing: ignore stale/out-of-order Stripe events, and remember processed event ids.
alter table public.avirzo_billing_accounts add column if not exists last_event_created bigint not null default 0;
create table if not exists public.avirzo_billing_events (
  event_id text primary key,
  event_type text not null,
  created_at timestamptz not null default now()
);
alter table public.avirzo_billing_events enable row level security;
revoke all on public.avirzo_billing_events from anon, authenticated;

notify pgrst, 'reload schema';
