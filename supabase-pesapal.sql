-- Avirzo v2.19.0 — Pesapal payments (cards + mobile money). Run once in the Supabase SQL editor. Safe to re-run.
-- Plans are prepaid: avirzo_billing_accounts.current_period_end is the end of the paid period (provider = 'pesapal').

create table if not exists public.avirzo_pesapal_orders (
  merchant_reference text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('plan','pack')),
  item_id text not null,
  amount numeric not null check (amount > 0),
  currency text not null,
  credits integer,
  plan_days integer,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','reversed','mismatch')),
  order_tracking_id text,
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.avirzo_pesapal_orders enable row level security;
drop policy if exists "avirzo_pesapal_orders_select_own" on public.avirzo_pesapal_orders;
create policy "avirzo_pesapal_orders_select_own" on public.avirzo_pesapal_orders for select to authenticated using (auth.uid() = user_id);
-- Writes happen only through the server (service role).
create index if not exists avirzo_pesapal_orders_user_idx on public.avirzo_pesapal_orders(user_id, created_at desc);
create unique index if not exists avirzo_pesapal_orders_tracking_uidx on public.avirzo_pesapal_orders(order_tracking_id) where order_tracking_id is not null;

-- A pack payment can only ever add credits once, even if a retry races a crashed attempt.
create unique index if not exists avirzo_credit_ledger_unique_pesapal_pack
  on public.avirzo_credit_ledger(user_id, reason)
  where reason like 'pesapal_pack:%';

-- Orders needing attention:
-- select created_at, merchant_reference, kind, item_id, amount, currency, status from public.avirzo_pesapal_orders where status in ('mismatch','reversed','processing') order by created_at desc;
