-- MELA 0039: subscription_billing_options table.
-- Replaces hardcoded prices. Admin manages options; frontend reads dynamically.

create table if not exists public.subscription_billing_options (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null check (char_length(trim(name)) between 1 and 100),
  duration_months int        not null check (duration_months >= 1),
  price_etb      numeric(10,2) not null check (price_etb > 0),
  is_active      boolean     not null default true,
  is_featured    boolean     not null default false,
  display_order  int         not null default 0,
  badge_text     text,                             -- e.g. "Best value", "Popular"
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists billing_options_set_updated_at on public.subscription_billing_options;
create trigger billing_options_set_updated_at
  before update on public.subscription_billing_options
  for each row execute function public.set_updated_at();

-- RLS: customers can read active options; only admins can write
alter table public.subscription_billing_options enable row level security;

create policy "authenticated read active billing options"
  on public.subscription_billing_options for select
  to authenticated
  using (is_active = true);

-- Admin write policies use the is_admin() helper (from migration 0018)
create policy "admins full access billing options"
  on public.subscription_billing_options
  using (public.is_admin())
  with check (public.is_admin());

-- ── Seed initial options ──────────────────────────────────────────────────────
insert into public.subscription_billing_options
  (name, duration_months, price_etb, is_active, is_featured, display_order, badge_text)
values
  ('Monthly',     1,  399,   true, false, 1, null),
  ('Quarterly',   3,  1099,  true, false, 2, 'Save 8%'),
  ('Half-yearly', 6,  2099,  true, true,  3, 'Most popular'),
  ('Yearly',      12, 3599,  true, false, 4, 'Best value')
on conflict do nothing;

-- ── Snapshot: add billing_option_id + price snapshot to payment_submissions ──
alter table public.payment_submissions
  add column if not exists billing_option_id uuid references public.subscription_billing_options(id) on delete set null,
  add column if not exists quoted_price_etb  numeric(10,2);

-- ── Update activate_subscription() to handle duration_months ──────────────────
create or replace function public.activate_subscription(
  p_business_id              uuid,
  p_billing_option_id        uuid,
  p_payment_submission_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_end    timestamptz;
  v_owner_id      uuid;
  v_duration      int;
  v_plan          text := 'premium';
begin
  -- Resolve duration from billing option
  select duration_months into v_duration
  from public.subscription_billing_options
  where id = p_billing_option_id and is_active = true;

  if not found then
    raise exception 'Invalid or inactive billing option: %', p_billing_option_id;
  end if;

  select owner_id into v_owner_id from public.businesses where id = p_business_id;

  v_period_end := now() + (v_duration || ' months')::interval;

  insert into public.subscriptions
    (business_id, owner_id, plan, status, current_period_start, current_period_end, grace_ends_at)
  values
    (p_business_id, v_owner_id, v_plan, 'active', now(), v_period_end, null)
  on conflict (business_id) do update
    set plan                 = v_plan,
        status               = 'active',
        current_period_start = now(),
        current_period_end   = v_period_end,
        grace_ends_at        = null,
        updated_at           = now();

  -- Approve payment and stamp snapshot
  update public.payment_submissions
  set status             = 'approved',
      reviewed_at        = now(),
      billing_option_id  = p_billing_option_id
  where id = p_payment_submission_id;
end;
$$;
revoke all on function public.activate_subscription(uuid, uuid, uuid) from public;
revoke all on function public.activate_subscription(uuid, uuid, uuid) from authenticated;
grant  execute on function public.activate_subscription(uuid, uuid, uuid) to service_role;

-- Keep old 4-arg signature working for backward compat
create or replace function public.activate_subscription(
  p_business_id              uuid,
  p_plan                     text,
  p_billing_cycle            text,
  p_payment_submission_id    uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_end  timestamptz;
  v_owner_id    uuid;
begin
  select owner_id into v_owner_id from public.businesses where id = p_business_id;
  v_period_end := case p_billing_cycle
    when 'monthly'  then now() + interval '30 days'
    when 'quarterly' then now() + interval '90 days'
    when 'biannual'  then now() + interval '180 days'
    else now() + interval '365 days'
  end;
  insert into public.subscriptions
    (business_id, owner_id, plan, status, current_period_start, current_period_end, grace_ends_at)
  values
    (p_business_id, 'premium', 'active', now(), v_period_end, null)
  on conflict (business_id) do update
    set plan = 'premium', status = 'active',
        current_period_start = now(), current_period_end = v_period_end,
        grace_ends_at = null, updated_at = now();
  update public.payment_submissions
  set status = 'approved', reviewed_at = now()
  where id = p_payment_submission_id;
end;
$$;
revoke all on function public.activate_subscription(uuid, text, text, uuid) from public;
revoke all on function public.activate_subscription(uuid, text, text, uuid) from authenticated;
grant  execute on function public.activate_subscription(uuid, text, text, uuid) to service_role;

-- ── RPC: get_active_billing_options() — public read for subscription page ─────
create or replace function public.get_active_billing_options()
returns table (
  id             uuid,
  name           text,
  duration_months int,
  price_etb      numeric,
  is_featured    boolean,
  display_order  int,
  badge_text     text
)
language sql
security definer
stable
set search_path = public
as $$
  select id, name, duration_months, price_etb, is_featured, display_order, badge_text
  from public.subscription_billing_options
  where is_active = true
  order by display_order asc, created_at asc;
$$;
grant execute on function public.get_active_billing_options() to authenticated, anon;
