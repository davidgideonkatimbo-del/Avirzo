-- Avirzo v2.17.6: shared rate limits and one-time daily spend alerts.
-- Apply once in Supabase SQL Editor using the project owner role before deploying.

create table if not exists public.avirzo_distributed_rate_limits (
  key_hash text not null,
  window_start timestamptz not null,
  window_seconds integer not null check (window_seconds > 0),
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, window_start)
);
alter table public.avirzo_distributed_rate_limits enable row level security;
revoke all on public.avirzo_distributed_rate_limits from anon, authenticated;
grant select, insert, update, delete on public.avirzo_distributed_rate_limits to service_role;

create or replace function public.consume_avirzo_distributed_rate_limit(
  p_key_hash text, p_window_start timestamptz, p_window_seconds integer, p_limit integer
) returns table(allowed boolean, retry_after integer, remaining integer)
language plpgsql security definer set search_path = public as $$
declare current_hits integer; window_end timestamptz;
begin
  if p_key_hash is null or length(p_key_hash) < 32 or p_window_start is null
     or p_window_seconds is null or p_window_seconds < 1 or p_limit is null or p_limit < 1 then
    return query select false, 60, 0; return;
  end if;
  window_end := p_window_start + make_interval(secs => p_window_seconds);
  -- Lock this hashed key/window so simultaneous requests across Render instances share one count.
  perform pg_advisory_xact_lock(hashtext(p_key_hash), hashtext(p_window_start::text));
  insert into public.avirzo_distributed_rate_limits(key_hash,window_start,window_seconds,hit_count,updated_at)
    values (p_key_hash,p_window_start,p_window_seconds,1,now())
    on conflict (key_hash,window_start) do update
      set hit_count = least(public.avirzo_distributed_rate_limits.hit_count + 1, p_limit + 1),
          updated_at = now(), window_seconds = excluded.window_seconds
    returning hit_count into current_hits;
  -- Prune stale rows opportunistically without making a large delete on every request.
  if mod(abs(hashtext(p_key_hash)), 500) = 0 then
    delete from public.avirzo_distributed_rate_limits where window_start < now() - interval '2 days';
  end if;
  return query select current_hits <= p_limit,
    greatest(1, ceil(extract(epoch from (window_end - now())))::integer),
    greatest(0, p_limit - current_hits);
end; $$;
revoke execute on function public.consume_avirzo_distributed_rate_limit(text,timestamptz,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_avirzo_distributed_rate_limit(text,timestamptz,integer,integer) to service_role;

create table if not exists public.avirzo_provider_budget_alerts (
  budget_date date not null,
  threshold_percent integer not null check (threshold_percent in (70,85,95,100)),
  used_usd numeric(12,4) not null,
  budget_usd numeric(12,4) not null,
  claimed_at timestamptz not null default now(),
  delivered_at timestamptz,
  primary key (budget_date, threshold_percent)
);
alter table public.avirzo_provider_budget_alerts enable row level security;
revoke all on public.avirzo_provider_budget_alerts from anon, authenticated;
grant select, insert, update, delete on public.avirzo_provider_budget_alerts to service_role;

create or replace function public.claim_avirzo_budget_alert(
  p_budget_date date, p_threshold integer, p_used_usd numeric, p_budget_usd numeric
) returns table(claimed boolean)
language plpgsql security definer set search_path = public as $$
declare inserted_count integer;
begin
  if p_budget_date is null or p_threshold not in (70,85,95,100)
     or p_used_usd is null or p_used_usd < 0 or p_budget_usd is null or p_budget_usd <= 0 then
    return query select false; return;
  end if;
  insert into public.avirzo_provider_budget_alerts(budget_date,threshold_percent,used_usd,budget_usd)
    values (p_budget_date,p_threshold,p_used_usd,p_budget_usd) on conflict (budget_date,threshold_percent) do nothing;
  get diagnostics inserted_count = row_count;
  return query select inserted_count = 1;
end; $$;
revoke execute on function public.claim_avirzo_budget_alert(date,integer,numeric,numeric) from public, anon, authenticated;
grant execute on function public.claim_avirzo_budget_alert(date,integer,numeric,numeric) to service_role;

-- Operational hygiene: old rate-limit windows can also be cleaned manually if needed:
-- delete from public.avirzo_distributed_rate_limits where window_start < now() - interval '2 days';
notify pgrst, 'reload schema';
