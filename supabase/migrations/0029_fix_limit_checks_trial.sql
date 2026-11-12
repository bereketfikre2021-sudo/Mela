-- MELA 0029: Fix limit check functions to explicitly bypass during trial/premium.
--
-- The original check_*_limit functions call get_effective_plan() which returns
-- 'premium' during trial. However if the plan_limits row for 'premium' has a
-- finite max_products value OR the subscriptions row is missing/expired, the
-- insert is blocked.
--
-- Fix: return true immediately when get_effective_plan() returns 'premium'.
-- This makes all checks plan-agnostic — premium (paid or trial) = unlimited.

create or replace function public.check_product_limit(p_owner_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  -- Premium plan (paid or trial) = no limit
  if public.get_effective_plan(p_owner_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.products where owner_id = p_owner_id
  ) < (
    select max_products from public.plan_limits where plan = 'free'
  );
end; $$;

create or replace function public.check_customer_limit(p_owner_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if public.get_effective_plan(p_owner_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.customers where owner_id = p_owner_id
  ) < (
    select max_customers from public.plan_limits where plan = 'free'
  );
end; $$;

create or replace function public.check_supplier_limit(p_owner_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if public.get_effective_plan(p_owner_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.suppliers where owner_id = p_owner_id
  ) < (
    select max_suppliers from public.plan_limits where plan = 'free'
  );
end; $$;

-- Also ensure the trial is set for any users who don't have one
update public.subscriptions
set trial_ends_at = now() + interval '30 days'
where trial_ends_at is null
   or (trial_ends_at < now() and plan = 'free' and status not in ('active') );

grant execute on function public.check_product_limit(uuid)  to authenticated;
grant execute on function public.check_customer_limit(uuid) to authenticated;
grant execute on function public.check_supplier_limit(uuid) to authenticated;
