-- MELA 0037: Expand billing_cycle to support quarterly and biannual.
--
-- Also seeds pricing into site_settings so the admin can change prices
-- without a code deploy.

-- ── 1. Expand billing_cycle constraint ───────────────────────────────────────
alter table public.payment_submissions
  drop constraint if exists payment_submissions_billing_cycle_check;

alter table public.payment_submissions
  add constraint payment_submissions_billing_cycle_check
    check (billing_cycle in ('monthly', 'quarterly', 'biannual', 'yearly'));

-- ── 2. Update activate_subscription() to handle new cycles ───────────────────
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
  if p_plan <> 'premium' then
    raise exception 'Invalid plan: %. Only premium activations are supported.', p_plan;
  end if;
  if p_billing_cycle not in ('monthly', 'quarterly', 'biannual', 'yearly') then
    raise exception 'Invalid billing_cycle: %. Must be monthly, quarterly, biannual, or yearly.', p_billing_cycle;
  end if;

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
    (p_business_id, v_owner_id, 'premium', 'active', now(), v_period_end, null)
  on conflict (business_id) do update
    set plan                 = 'premium',
        status               = 'active',
        current_period_start = now(),
        current_period_end   = v_period_end,
        grace_ends_at        = null,
        updated_at           = now();

  update public.payment_submissions
  set status      = 'approved',
      reviewed_at = now()
  where id = p_payment_submission_id;
end;
$$;
revoke all on function public.activate_subscription(uuid, text, text, uuid) from public;
revoke all on function public.activate_subscription(uuid, text, text, uuid) from authenticated;
grant  execute on function public.activate_subscription(uuid, text, text, uuid) to service_role;

-- ── 3. Seed pricing into site_settings (admin can update via admin panel) ────
insert into public.site_settings (key, value) values
  ('price_monthly',   '299'),
  ('price_quarterly', '799'),
  ('price_biannual',  '1499'),
  ('price_yearly',    '2499')
on conflict (key) do nothing;
