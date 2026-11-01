-- =====================================================================
-- OPTIONAL one-time migration. Run ONLY if all of these are true:
--   1. you previously ran an OLDER Avirzo script in this same Supabase project, and
--   2. the tables public.projects / public.assets / public.jobs /
--      public.usage_counters / public.worker_heartbeats are AVIRZO's (not another app's), and
--   3. you want to keep that data.
-- If you never ran the old script, or you use a fresh Supabase project, SKIP this file.
-- Afterwards run supabase.sql (it is idempotent and finishes the job).
-- Each rename is skipped automatically if the target name already exists.
-- =====================================================================
do $$
begin
  if to_regclass('public.projects') is not null and to_regclass('public.avirzo_projects') is null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='projects' and column_name='payload') then
    alter table public.projects rename to avirzo_projects;
  end if;
  if to_regclass('public.assets') is not null and to_regclass('public.avirzo_assets') is null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='assets' and column_name='storage_path') then
    alter table public.assets rename to avirzo_assets;
  end if;
  if to_regclass('public.jobs') is not null and to_regclass('public.avirzo_jobs') is null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='jobs' and column_name='provider_task_id') then
    alter table public.jobs rename to avirzo_jobs;
  end if;
  if to_regclass('public.usage_counters') is not null and to_regclass('public.avirzo_usage_counters') is null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='usage_counters' and column_name='window_start') then
    alter table public.usage_counters rename to avirzo_usage_counters;
  end if;
  if to_regclass('public.worker_heartbeats') is not null and to_regclass('public.avirzo_worker_heartbeats') is null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='worker_heartbeats' and column_name='service_name') then
    alter table public.worker_heartbeats rename to avirzo_worker_heartbeats;
  end if;
end $$;
