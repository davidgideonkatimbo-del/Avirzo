-- Avirzo v2.17.11 export/job reliability migration.
-- Apply in Supabase SQL Editor before deploying v2.17.11.
alter table public.avirzo_jobs add column if not exists result_metadata jsonb;
drop function if exists public.claim_avirzo_job(text[], integer);
drop function if exists public.claim_avirzo_job(text[]);
create function public.claim_avirzo_job(requested_types text[], max_attempts integer default 3)
returns setof public.avirzo_jobs
language plpgsql
security definer
set search_path = public
as $$
declare claimed public.avirzo_jobs;
begin
  -- Recover jobs whose worker vanished (lock not renewed for 30 minutes).
  update public.avirzo_jobs
  set status = case when attempts >= greatest(1, least(coalesce(max_attempts, 3), 20)) then 'dead_letter' else 'queued' end,
      locked_at = null, worker_id = null,
      error = case when attempts >= greatest(1, least(coalesce(max_attempts, 3), 20)) then 'Maximum worker attempts reached.' else error end,
      updated_at = now()
  where status = 'running'
    and (requested_types is null or cardinality(requested_types) = 0 or type = any(requested_types))
    and locked_at is not null
    and locked_at < now() - interval '30 minutes';

  select * into claimed
  from public.avirzo_jobs j
  where j.status = 'queued'
    and (requested_types is null or cardinality(requested_types) = 0 or j.type = any(requested_types))
  -- Aging: every 5 minutes of waiting is worth one priority step, so low-priority exports are never starved.
  order by (j.priority - floor(extract(epoch from (now() - j.created_at)) / 300)) asc, j.created_at asc
  for update skip locked
  limit 1;

  if claimed.id is null then
    return;
  end if;

  update public.avirzo_jobs
  set status = 'running', progress = greatest(progress, 1), attempts = coalesce(attempts, 0) + 1,
      locked_at = now(), worker_id = concat('worker-', gen_random_uuid()::text), updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return next claimed;
end;
$$;

revoke execute on function public.claim_avirzo_job(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_avirzo_job(text[], integer) to service_role;

notify pgrst, 'reload schema';
