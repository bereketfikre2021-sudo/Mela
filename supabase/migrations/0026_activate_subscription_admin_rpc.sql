-- MELA 0026: Allow admin users to call activate_subscription via anon key.
--
-- Previously the function was service_role only, requiring VITE_SUPABASE_SERVICE_ROLE_KEY
-- in the browser bundle — a security risk. Instead we:
--   1. Add an is_admin() guard inside the function so only admins can execute it.
--   2. Grant execute to authenticated so the anon-key client can call it.
--   3. Keep the security definer so it can still write to subscriptions/payment_submissions.

create or replace function public.activate_subscription(
  p_owner_id              uuid,
  p_plan                  text,
  p_billing_cycle         text,
  p_payment_submission_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_end timestamptz;
begin
  -- Only admins may activate subscriptions
  if not public.is_admin() then
    raise exception 'Permission denied.';
  end if;

  -- Validate plan
  if p_plan <> 'premium' then
    raise exception 'Invalid plan: %. Only premium activations are supported.', p_plan;
  end if;

  -- Validate billing cycle
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'Invalid billing_cycle: %. Must be monthly or yearly.', p_billing_cycle;
  end if;

  -- Calculate period end
  if p_billing_cycle = 'monthly' then
    v_period_end := now() + interval '30 days';
  else
    v_period_end := now() + interval '365 days';
  end if;

  -- Upsert subscription
  insert into public.subscriptions
    (owner_id, plan, status, current_period_start, current_period_end, grace_ends_at)
  values
    (p_owner_id, 'premium', 'active', now(), v_period_end, null)
  on conflict (owner_id) do update
    set plan                 = 'premium',
        status               = 'active',
        current_period_start = now(),
        current_period_end   = v_period_end,
        grace_ends_at        = null,
        updated_at           = now();

  -- Approve the payment submission
  update public.payment_submissions
  set status      = 'approved',
      reviewed_at = now()
  where id = p_payment_submission_id;
end;
$$;

-- Revoke from public, keep service_role, add authenticated
revoke all   on function public.activate_subscription(uuid, text, text, uuid) from public;
grant  execute on function public.activate_subscription(uuid, text, text, uuid) to authenticated;
grant  execute on function public.activate_subscription(uuid, text, text, uuid) to service_role;
