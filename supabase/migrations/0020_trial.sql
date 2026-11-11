-- MELA 0020: 30-day free trial for all users.
--
-- Every business gets a 30-day full-Premium trial on signup.
-- After 30 days: 3-day grace period, then full block.
-- During trial: get_effective_plan() returns 'premium'.
-- Existing users who already have trial_ends_at set: NOT modified (requirement 7).
-- New rows where trial_ends_at is null: get 30 days from now.

-- ── 1. Add trial_ends_at to subscriptions ────────────────────────────────────

alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;

-- ── 2. Set trial for users who have no trial yet (30 days from now) ───────────
-- Only updates rows where trial_ends_at IS NULL.
-- Existing trial dates are preserved (requirement 7).

update public.subscriptions
set trial_ends_at = now() + interval '30 days'
where trial_ends_at is null;

-- ── 3. Update trigger: new businesses get 30-day trial ───────────────────────

create or replace function public.create_subscription_on_business_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (owner_id, plan, status, trial_ends_at)
  values (NEW.owner_id, 'free', 'active', now() + interval '30 days')
  on conflict (owner_id) do nothing;
  return NEW;
end;
$$;

-- ── 4. Update get_effective_plan() to honour trial ────────────────────────────
-- Returns 'premium' when:
--   a) paid premium subscription is active/grace, OR
--   b) trial_ends_at is in the future (free trial still running)

create or replace function public.get_effective_plan(p_owner_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_plan         text;
  v_status       text;
  v_grace_ends   timestamptz;
  v_trial_ends   timestamptz;
begin
  select plan, status, grace_ends_at, trial_ends_at
    into v_plan, v_status, v_grace_ends, v_trial_ends
  from public.subscriptions
  where owner_id = p_owner_id;

  if not found then
    return 'free';
  end if;

  -- Active trial — full premium access
  if v_trial_ends is not null and v_trial_ends > now() then
    return 'premium';
  end if;

  -- Paid premium still active/grace
  if v_plan = 'premium'
     and v_status in ('active', 'grace')
     and (v_status = 'active' or v_grace_ends > now())
  then
    return 'premium';
  end if;

  return 'free';
end;
$$;

grant execute on function public.get_effective_plan(uuid) to authenticated;

-- ── 5. Update check_*_limit functions to respect trial ────────────────────────
-- During an active trial, get_effective_plan() returns 'premium' so the
-- check_*_limit functions already use premium limits. No change needed here
-- as long as plan_limits has max_products = 2147483647 for premium.
-- This comment documents that the fix is in get_effective_plan() above.
