-- Apply once in Supabase SQL Editor before deploying Avirzo v2.17.5.
-- Stores only HMAC-hashed IPs, never raw IP addresses or bearer tokens.
create table if not exists public.avirzo_security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  status_code integer,
  route text not null,
  ip_hash text,
  user_agent text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.avirzo_security_events enable row level security;
revoke all on public.avirzo_security_events from anon, authenticated;
grant select, insert, update, delete on public.avirzo_security_events to service_role;
create index if not exists avirzo_security_events_created_idx on public.avirzo_security_events(created_at desc);
create index if not exists avirzo_security_events_type_created_idx on public.avirzo_security_events(event_type, created_at desc);
create index if not exists avirzo_security_events_user_created_idx on public.avirzo_security_events(user_id, created_at desc) where user_id is not null;
create index if not exists avirzo_security_events_ip_created_idx on public.avirzo_security_events(ip_hash, created_at desc) where ip_hash is not null;

-- Admin-only operational queries (run in Supabase SQL Editor as project owner).
-- Recent suspicious activity by IP hash:
-- select ip_hash, event_type, count(*) as events, count(distinct user_id) as accounts,
--        min(created_at) as first_seen, max(created_at) as last_seen
-- from public.avirzo_security_events
-- where created_at > now() - interval '24 hours' and ip_hash is not null
-- group by ip_hash, event_type having count(*) >= 10
-- order by events desc;
-- Recent rejected requests:
-- select created_at, event_type, status_code, user_id, route, details
-- from public.avirzo_security_events order by created_at desc limit 100;
