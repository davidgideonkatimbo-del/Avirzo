-- Apply once in the Supabase SQL Editor before deploying v2.17.5.
-- Global provider spend guard. Each generation reserves a conservative estimated cost before calling Runway.
-- Reservations/charges count against a UTC daily ceiling; released reservations do not.
create table if not exists public.avirzo_provider_budget_ledger (
  job_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_date date not null,
  amount_usd numeric(12,4) not null check (amount_usd > 0),
  state text not null default 'reserved' check (state in ('reserved','charged','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.avirzo_provider_budget_ledger enable row level security;
revoke all on public.avirzo_provider_budget_ledger from anon, authenticated;
create index if not exists avirzo_provider_budget_date_state_idx on public.avirzo_provider_budget_ledger(budget_date, state);

create or replace function public.reserve_avirzo_provider_budget(
  p_job_id uuid, p_user_id uuid, p_amount_usd numeric, p_budget_usd numeric, p_budget_date date
) returns table(allowed boolean, used_usd numeric)
language plpgsql security definer set search_path = public as $$
declare current_used numeric; existing_state text;
begin
  if p_amount_usd is null or p_amount_usd <= 0 or p_budget_usd is null or p_budget_usd <= 0 then
    return query select false, 0::numeric; return;
  end if;
  -- Serialize reservations for the same UTC budget day so concurrent requests cannot overspend it.
  perform pg_advisory_xact_lock(hashtext('avirzo-provider-budget'), hashtext(p_budget_date::text));
  select state into existing_state from public.avirzo_provider_budget_ledger where job_id = p_job_id;
  if existing_state in ('reserved','charged') then
    select coalesce(sum(amount_usd),0) into current_used from public.avirzo_provider_budget_ledger
      where budget_date = p_budget_date and state in ('reserved','charged');
    return query select true, current_used; return;
  elsif existing_state = 'released' then
    return query select false, 0::numeric; return;
  end if;
  select coalesce(sum(amount_usd),0) into current_used from public.avirzo_provider_budget_ledger
    where budget_date = p_budget_date and state in ('reserved','charged');
  if current_used + p_amount_usd > p_budget_usd then
    return query select false, current_used; return;
  end if;
  insert into public.avirzo_provider_budget_ledger(job_id,user_id,budget_date,amount_usd,state)
    values (p_job_id,p_user_id,p_budget_date,p_amount_usd,'reserved');
  return query select true, current_used + p_amount_usd;
end; $$;

create or replace function public.settle_avirzo_provider_budget(p_job_id uuid, p_state text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_state not in ('charged','released') then return false; end if;
  update public.avirzo_provider_budget_ledger set state = p_state, updated_at = now()
    where job_id = p_job_id and state = 'reserved';
  return found;
end; $$;
revoke execute on function public.reserve_avirzo_provider_budget(uuid,uuid,numeric,numeric,date) from public, anon, authenticated;
revoke execute on function public.settle_avirzo_provider_budget(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_avirzo_provider_budget(uuid,uuid,numeric,numeric,date) to service_role;
grant execute on function public.settle_avirzo_provider_budget(uuid,text) to service_role;


-- Job-keyed marker prevents asynchronous provider failures from restoring the same free scene more than once.
create table if not exists public.avirzo_job_usage_refunds (
  job_id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, window_start timestamptz not null, created_at timestamptz not null default now()
);
alter table public.avirzo_job_usage_refunds enable row level security;
revoke all on public.avirzo_job_usage_refunds from anon, authenticated;
create or replace function public.refund_avirzo_job_usage(p_job_id uuid, p_user_id uuid, p_kind text, p_window_start timestamptz)
returns boolean language plpgsql security definer set search_path = public as $$
declare inserted_count integer;
begin
  insert into public.avirzo_job_usage_refunds(job_id,user_id,kind,window_start)
    values (p_job_id,p_user_id,p_kind,p_window_start) on conflict (job_id) do nothing;
  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then return false; end if;
  update public.avirzo_usage_counters set count = greatest(0,count - 1)
    where user_id = p_user_id and kind = p_kind and window_start = p_window_start;
  return true;
end; $$;
revoke execute on function public.refund_avirzo_job_usage(uuid,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.refund_avirzo_job_usage(uuid,uuid,text,timestamptz) to service_role;

notify pgrst, 'reload schema';
