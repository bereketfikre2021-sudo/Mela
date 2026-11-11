-- MELA 0020: 7-day free trial for all users.
--
-- Every business gets a 7-day full-Premium trial on signup.
-- After 7 days: 3-day grace period, then full block.
-- During trial: get_effective_plan() returns 'premium'.
-- Existing users: get 7 days from the time this migration runs.

-- ── 1. Add trial_ends_at to subscriptions ────────────────────────────────────

alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;

-- ── 2. Set trial for all existing users (7 days from now) ────────────────────

update public.subscriptions
set trial_ends_at = now() + interval '7 days'
where trial_ends_at is null;

-- ── 3. Update trigger: new businesses get 7-day trial ────────────────────────

create or replace function public.create_subscription_on_business_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (owner_id, plan, status, trial_ends_at)
  values (NEW.owner_id, 'free', 'active', now() + interval '7 days')
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
