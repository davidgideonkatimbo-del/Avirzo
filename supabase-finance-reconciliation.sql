-- Avirzo v2.17.8: durable finance alert retries and Runway invoice reconciliation.
-- Apply after supabase-cross-instance-guardrails.sql and supabase-provider-budget.sql.

alter table public.avirzo_provider_budget_alerts
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists delivery_status text not null default 'pending'
    check (delivery_status in ('pending','sending','delivered','failed','dead_letter')),
  add column if not exists attempt_count integer not null default 0 check (attempt_count >= 0),
  add column if not exists last_attempt_at timestamptz,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_error text;
update public.avirzo_provider_budget_alerts
  set delivery_status = case when delivered_at is not null then 'delivered' else 'pending' end
  where delivery_status is null or (delivered_at is not null and delivery_status <> 'delivered');
create index if not exists avirzo_budget_alert_retry_idx
  on public.avirzo_provider_budget_alerts(next_attempt_at, claimed_at)
  where delivered_at is null and attempt_count < 8;

drop function if exists public.claim_avirzo_budget_alert(date,integer,numeric,numeric);

create or replace function public.claim_avirzo_budget_alert(
  p_budget_date date, p_threshold integer, p_used_usd numeric, p_budget_usd numeric
) returns table(claimed boolean, alert_id uuid)
language plpgsql security definer set search_path = public as $$
declare inserted_count integer; result_id uuid;
begin
  if p_budget_date is null or p_threshold not in (70,85,95,100)
     or p_used_usd is null or p_used_usd < 0 or p_budget_usd is null or p_budget_usd <= 0 then
    return query select false, null::uuid; return;
  end if;
  insert into public.avirzo_provider_budget_alerts(budget_date,threshold_percent,used_usd,budget_usd,delivery_status,next_attempt_at)
    values (p_budget_date,p_threshold,p_used_usd,p_budget_usd,'pending',now())
    on conflict (budget_date,threshold_percent) do nothing;
  get diagnostics inserted_count = row_count;
  select id into result_id from public.avirzo_provider_budget_alerts
    where budget_date = p_budget_date and threshold_percent = p_threshold;
  return query select inserted_count = 1, result_id;
end; $$;
revoke execute on function public.claim_avirzo_budget_alert(date,integer,numeric,numeric) from public, anon, authenticated;
grant execute on function public.claim_avirzo_budget_alert(date,integer,numeric,numeric) to service_role;


-- Claim one delivery attempt atomically. The webhook call happens only after this
-- RPC succeeds, preventing the web process and optional worker from sending together.
create or replace function public.claim_avirzo_budget_alert_delivery(p_budget_date date, p_threshold integer)
returns table(claimed boolean, id uuid, budget_date date, threshold_percent integer,
              used_usd numeric, budget_usd numeric, attempt_count integer)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.avirzo_provider_budget_alerts a
     set delivery_status = 'sending', attempt_count = a.attempt_count + 1,
         last_attempt_at = now(), next_attempt_at = now() + interval '10 minutes', last_error = null
   where a.budget_date = p_budget_date and a.threshold_percent = p_threshold
     and a.delivered_at is null and a.attempt_count < 8
     and a.delivery_status in ('pending','failed','sending')
     and a.next_attempt_at <= now()
  returning true, a.id, a.budget_date, a.threshold_percent, a.used_usd, a.budget_usd, a.attempt_count;
end; $$;
revoke execute on function public.claim_avirzo_budget_alert_delivery(date,integer) from public, anon, authenticated;
grant execute on function public.claim_avirzo_budget_alert_delivery(date,integer) to service_role;

-- This function only discovers due rows. The per-row delivery RPC above does the
-- actual atomic claim and protects against concurrent web/worker retry loops.
create or replace function public.claim_avirzo_budget_alert_retries(p_limit integer default 10)
returns table(budget_date date, threshold_percent integer)
language sql security definer set search_path = public as $$
  select a.budget_date, a.threshold_percent
  from public.avirzo_provider_budget_alerts a
  where a.delivered_at is null and a.attempt_count < 8
    and a.delivery_status in ('pending','failed','sending')
    and a.next_attempt_at <= now()
  order by a.next_attempt_at, a.claimed_at
  limit greatest(1, least(coalesce(p_limit,10),50));
$$;
revoke execute on function public.claim_avirzo_budget_alert_retries(integer) from public, anon, authenticated;
grant execute on function public.claim_avirzo_budget_alert_retries(integer) to service_role;

create table if not exists public.avirzo_runway_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id text not null,
  source_hash text not null,
  source_line_id text,
  provider_task_id text,
  job_id uuid references public.avirzo_jobs(id) on delete set null,
  usage_date timestamptz,
  description text,
  currency text not null default 'USD',
  actual_cost_usd numeric(12,6) not null check (actual_cost_usd >= 0),
  raw_line jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique(invoice_id, source_hash)
);
alter table public.avirzo_runway_invoice_lines enable row level security;
revoke all on public.avirzo_runway_invoice_lines from anon, authenticated;
grant select, insert, update on public.avirzo_runway_invoice_lines to service_role;
create index if not exists avirzo_runway_invoice_job_idx on public.avirzo_runway_invoice_lines(job_id);
create index if not exists avirzo_runway_invoice_date_idx on public.avirzo_runway_invoice_lines(usage_date);

notify pgrst, 'reload schema';
