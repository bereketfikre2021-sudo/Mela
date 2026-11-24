-- MELA 0030: Multi-business support per user.
--
-- Changes:
--   1. user_profiles table  – stores active_business_id per auth user
--   2. Drop unique constraint on businesses.owner_id (allow many per user)
--   3. Add max 3 businesses per owner check at DB level
--   4. subscriptions  – move FK from auth.users → businesses
--   5. payment_submissions – move FK from auth.users → businesses
--   6. All limit-check RPCs updated to accept business_id
--   7. get_effective_plan() updated to accept business_id
--   8. complete_sale() / receive_purchase() updated
--   9. Trigger: create subscription per business (not per user)
--  10. RLS policies updated throughout

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_profiles  (tracks active_business_id per user, synced to cloud)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  active_business_id uuid,  -- FK added after businesses constraint is relaxed below
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

alter table public.user_profiles enable row level security;

create policy "users select own profile"
  on public.user_profiles for select
  using (user_id = auth.uid());

create policy "users insert own profile"
  on public.user_profiles for insert
  with check (user_id = auth.uid());

create policy "users update own profile"
  on public.user_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Drop the one-business-per-owner constraint
-- ─────────────────────────────────────────────────────────────────────────────
drop index if exists public.businesses_owner_id_key;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Enforce max 3 businesses per owner via DB function + trigger
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_business_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.businesses
  where owner_id = NEW.owner_id;

  if v_count >= 3 then
    raise exception 'You can register a maximum of 3 businesses per account.';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_check_business_limit on public.businesses;
create trigger trg_check_business_limit
  before insert on public.businesses
  for each row execute function public.check_business_limit();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4a. subscriptions – drop old table and recreate keyed on business_id
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger  if exists trg_business_subscription       on public.businesses;
drop trigger  if exists subscriptions_set_updated_at    on public.subscriptions;
drop function if exists public.create_subscription_on_business_insert();
drop table    if exists public.subscriptions cascade;

create table public.subscriptions (
  id                   uuid        primary key default gen_random_uuid(),
  business_id          uuid        not null unique references public.businesses(id) on delete cascade,
  owner_id             uuid        not null references auth.users(id) on delete cascade,
  plan                 text        not null default 'free'
                         check (plan in ('free', 'premium')),
  status               text        not null default 'active'
                         check (status in ('active', 'pending_payment', 'grace', 'expired', 'cancelled')),
  trial_ends_at        timestamptz,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  grace_ends_at        timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_business_id_idx on public.subscriptions (business_id);
create index if not exists subscriptions_owner_id_idx    on public.subscriptions (owner_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "owners select own subscriptions"
  on public.subscriptions for select
  using (owner_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4b. payment_submissions – drop and recreate keyed on business_id
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists payment_submissions_set_updated_at on public.payment_submissions;
drop table   if exists public.payment_submissions cascade;

create table public.payment_submissions (
  id                    uuid           primary key default gen_random_uuid(),
  business_id           uuid           not null references public.businesses(id) on delete cascade,
  owner_id              uuid           not null references auth.users(id) on delete cascade,
  plan                  text           not null check (plan in ('premium')),
  billing_cycle         text           not null check (billing_cycle in ('monthly', 'yearly')),
  amount_etb            numeric(10,2)  not null check (amount_etb > 0),
  payment_method        text           not null
                          check (payment_method in ('telebirr', 'cbe_birr', 'bank_transfer')),
  transaction_reference text           not null
                          check (char_length(trim(transaction_reference)) between 4 and 100),
  screenshot_url        text,
  status                text           not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  submitted_at          timestamptz    not null default now(),
  reviewed_at           timestamptz,
  reviewer_notes        text,
  chapa_tx_ref          text,
  created_at            timestamptz    not null default now(),
  updated_at            timestamptz    not null default now()
);

create index if not exists idx_payment_submissions_business_submitted
  on public.payment_submissions (business_id, submitted_at desc);

drop trigger if exists payment_submissions_set_updated_at on public.payment_submissions;
create trigger payment_submissions_set_updated_at
  before update on public.payment_submissions
  for each row execute function public.set_updated_at();

alter table public.payment_submissions enable row level security;

create policy "owners select own payment submissions"
  on public.payment_submissions for select
  using (owner_id = auth.uid());

create policy "owners insert own payment submissions"
  on public.payment_submissions for insert
  with check (owner_id = auth.uid() and status = 'pending');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Trigger: create a free subscription per business on insert
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.create_subscription_on_business_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (business_id, owner_id, plan, status, trial_ends_at)
  values (NEW.id, NEW.owner_id, 'free', 'active', now() + interval '30 days')
  on conflict (business_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_business_subscription on public.businesses;
create trigger trg_business_subscription
  after insert on public.businesses
  for each row execute function public.create_subscription_on_business_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. user_profiles.active_business_id FK (now that businesses is ready)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.user_profiles
  add constraint fk_active_business
  foreign key (active_business_id)
  references public.businesses(id)
  on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. get_effective_plan() – now takes business_id
--    Must drop the old signature (p_owner_id) before redefining with p_business_id
--    because PostgreSQL does not allow renaming parameters via create or replace.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.get_effective_plan(uuid) cascade;

create or replace function public.get_effective_plan(p_business_id uuid)
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
  where business_id = p_business_id;

  if not found then return 'free'; end if;

  -- Active trial → full premium access
  if v_trial_ends is not null and v_trial_ends > now() then
    return 'premium';
  end if;

  -- Paid premium still active / in grace
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Limit-check functions  – now take p_business_id instead of p_owner_id
--    Drop old signatures first (parameter rename requires drop + recreate).
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.check_product_limit(uuid) cascade;
drop function if exists public.check_customer_limit(uuid) cascade;
drop function if exists public.check_supplier_limit(uuid) cascade;
drop function if exists public.check_monthly_sales_limit(uuid) cascade;
drop function if exists public.check_monthly_purchases_limit(uuid) cascade;

create or replace function public.check_product_limit(p_business_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.businesses where id = p_business_id;
  if public.get_effective_plan(p_business_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.products where owner_id = v_owner_id
  ) < (select max_products from public.plan_limits where plan = 'free');
end; $$;
grant execute on function public.check_product_limit(uuid) to authenticated;

create or replace function public.check_customer_limit(p_business_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.businesses where id = p_business_id;
  if public.get_effective_plan(p_business_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.customers where owner_id = v_owner_id
  ) < (select max_customers from public.plan_limits where plan = 'free');
end; $$;
grant execute on function public.check_customer_limit(uuid) to authenticated;

create or replace function public.check_supplier_limit(p_business_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.businesses where id = p_business_id;
  if public.get_effective_plan(p_business_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.suppliers where owner_id = v_owner_id
  ) < (select max_suppliers from public.plan_limits where plan = 'free');
end; $$;
grant execute on function public.check_supplier_limit(uuid) to authenticated;

create or replace function public.check_monthly_sales_limit(p_business_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.businesses where id = p_business_id;
  if public.get_effective_plan(p_business_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.sales
    where owner_id  = v_owner_id
      and created_at >= date_trunc('month', now())
      and created_at <  date_trunc('month', now()) + interval '1 month'
  ) < (select max_sales_per_month from public.plan_limits where plan = 'free');
end; $$;
grant execute on function public.check_monthly_sales_limit(uuid) to authenticated;

create or replace function public.check_monthly_purchases_limit(p_business_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_owner_id uuid;
begin
  select owner_id into v_owner_id from public.businesses where id = p_business_id;
  if public.get_effective_plan(p_business_id) = 'premium' then return true; end if;
  return (
    select count(*) from public.purchases
    where owner_id  = v_owner_id
      and created_at >= date_trunc('month', now())
      and created_at <  date_trunc('month', now()) + interval '1 month'
  ) < (select max_purchases_per_month from public.plan_limits where plan = 'free');
end; $$;
grant execute on function public.check_monthly_purchases_limit(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS insert policies on products/customers/suppliers now pass business_id
--    We need a helper to resolve the caller's active business_id from their
--    auth.uid() so the with-check can call check_*_limit(business_id).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_active_business_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select active_business_id
  from public.user_profiles
  where user_id = auth.uid()
  limit 1;
$$;
grant execute on function public.get_active_business_id() to authenticated;

-- products
drop policy if exists "owners insert own products" on public.products;
create policy "owners insert own products"
  on public.products for insert
  with check (
    owner_id = auth.uid()
    and check_product_limit(public.get_active_business_id())
  );

-- customers
drop policy if exists "owners insert own customers" on public.customers;
create policy "owners insert own customers"
  on public.customers for insert
  with check (
    owner_id = auth.uid()
    and check_customer_limit(public.get_active_business_id())
  );

-- suppliers
drop policy if exists "owners insert own suppliers" on public.suppliers;
create policy "owners insert own suppliers"
  on public.suppliers for insert
  with check (
    owner_id = auth.uid()
    and check_supplier_limit(public.get_active_business_id())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. activate_subscription() – now takes business_id
--     Drop old signature first (parameter rename requires drop + recreate).
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.activate_subscription(uuid, text, text, uuid) cascade;

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
  if p_billing_cycle not in ('monthly', 'yearly') then
    raise exception 'Invalid billing_cycle: %. Must be monthly or yearly.', p_billing_cycle;
  end if;

  select owner_id into v_owner_id from public.businesses where id = p_business_id;

  if p_billing_cycle = 'monthly' then
    v_period_end := now() + interval '30 days';
  else
    v_period_end := now() + interval '365 days';
  end if;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. complete_sale() – pass business_id for limit check
--     Drop old 5-arg signature so only the new 6-arg version exists.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.complete_sale(uuid,text,text,jsonb,uuid);

create or replace function public.complete_sale(
  p_owner_id        uuid,
  p_business_id     uuid,
  p_sale_number     text,
  p_payment_method  text,
  p_items           jsonb,
  p_idempotency_key uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id         uuid;
  v_idempotency_key uuid;
  v_subtotal        numeric(12,2) := 0;
  v_total           numeric(12,2) := 0;
  v_payment_status  text;
  v_item            jsonb;
  v_product         record;
  v_qty             numeric(12,3);
  v_line            numeric(12,2);
  v_existing        record;
  v_stock_after     numeric(12,3);
begin
  if not check_monthly_sales_limit(p_business_id) then
    raise exception 'Monthly sales limit reached. Upgrade to Premium for unlimited sales.';
  end if;
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;
  if p_payment_method not in ('cash','telebirr','bank_transfer') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;
  v_idempotency_key := coalesce(p_idempotency_key, gen_random_uuid());
  select id, total into v_existing
  from public.sales
  where owner_id = p_owner_id and idempotency_key = v_idempotency_key;
  if found then
    return jsonb_build_object('sale_id', v_existing.id, 'total', v_existing.total, 'already_exists', true);
  end if;
  v_payment_status := case when p_payment_method = 'cash' then 'paid' else 'pending' end;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id for update;
    if not found then
      raise exception 'Product not found or not owned by caller: %', v_item->>'product_id';
    end if;
    if v_product.stock_quantity < v_qty then
      raise exception 'Insufficient stock for "%". Available: %, requested: %',
        v_product.name, v_product.stock_quantity, v_qty;
    end if;
    v_line     := round(v_product.selling_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
  end loop;
  v_total := v_subtotal;
  insert into public.sales (owner_id, sale_number, subtotal, total, payment_method, payment_status, idempotency_key)
  values (p_owner_id, p_sale_number, v_subtotal, v_total, p_payment_method, v_payment_status, v_idempotency_key)
  returning id into v_sale_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id;
    v_line        := round(v_product.selling_price * v_qty, 2);
    v_stock_after := v_product.stock_quantity - v_qty;
    insert into public.sale_items (sale_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_product.selling_price, v_product.cost_price, v_qty, v_line);
    update public.products set stock_quantity = v_stock_after where id = v_product.id and owner_id = p_owner_id;
    insert into public.inventory_movements (owner_id, product_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_id)
    values (p_owner_id, v_product.id, v_product.name, 'sale', -v_qty, v_product.stock_quantity, v_stock_after, v_sale_id);
  end loop;
  return jsonb_build_object('sale_id', v_sale_id, 'total', v_total, 'payment_status', v_payment_status, 'already_exists', false);
end;
$$;
revoke execute on function public.complete_sale(uuid,uuid,text,text,jsonb,uuid) from public;
grant  execute on function public.complete_sale(uuid,uuid,text,text,jsonb,uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. receive_purchase() – pass business_id for limit check
--     Drop old 6-arg signature so only the new 7-arg version exists.
-- ─────────────────────────────────────────────────────────────────────────────
drop function if exists public.receive_purchase(uuid,uuid,date,text,uuid,jsonb);

create or replace function public.receive_purchase(
  p_owner_id        uuid,
  p_business_id     uuid,
  p_supplier_id     uuid,
  p_purchase_date   date,
  p_notes           text,
  p_idempotency_key uuid,
  p_items           jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase_id   uuid;
  v_total_cost    numeric(12,2) := 0;
  v_supplier_name text := 'Unknown Supplier';
  v_item          jsonb;
  v_product       record;
  v_qty           numeric(12,3);
  v_unit_cost     numeric(12,2);
  v_line          numeric(12,2);
  v_stock_after   numeric(12,3);
  v_existing      record;
begin
  if not check_monthly_purchases_limit(p_business_id) then
    raise exception 'Monthly purchases limit reached. Upgrade to Premium for unlimited purchases.';
  end if;
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Purchase must have at least one item';
  end if;
  select id, total_cost into v_existing
  from public.purchases
  where owner_id = p_owner_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('purchase_id', v_existing.id, 'total_cost', v_existing.total_cost, 'already_exists', true);
  end if;
  if p_supplier_id is not null then
    select name into v_supplier_name from public.suppliers
    where id = p_supplier_id and owner_id = p_owner_id;
    if not found then raise exception 'Supplier not found or not owned by caller'; end if;
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    if v_qty <= 0      then raise exception 'Quantity must be greater than zero'; end if;
    if v_unit_cost < 0 then raise exception 'Unit cost must be zero or greater';  end if;
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id for update;
    if not found then
      raise exception 'Product not found or not owned by caller: %', v_item->>'product_id';
    end if;
    v_line       := round(v_unit_cost * v_qty, 2);
    v_total_cost := v_total_cost + v_line;
  end loop;
  insert into public.purchases (owner_id, supplier_id, supplier_name, purchase_date, total_cost, notes, idempotency_key)
  values (p_owner_id, p_supplier_id, v_supplier_name, p_purchase_date, v_total_cost, p_notes, p_idempotency_key)
  returning id into v_purchase_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line      := round(v_unit_cost * v_qty, 2);
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id;
    v_stock_after := v_product.stock_quantity + v_qty;
    insert into public.purchase_items (purchase_id, product_id, product_name, quantity, unit_cost, line_total)
    values (v_purchase_id, v_product.id, v_product.name, v_qty, v_unit_cost, v_line);
    update public.products set stock_quantity = v_stock_after, cost_price = v_unit_cost
    where id = v_product.id and owner_id = p_owner_id;
    insert into public.inventory_movements (owner_id, product_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_id)
    values (p_owner_id, v_product.id, v_product.name, 'purchase', v_qty, v_product.stock_quantity, v_stock_after, v_purchase_id);
  end loop;
  return jsonb_build_object('purchase_id', v_purchase_id, 'total_cost', v_total_cost, 'already_exists', false);
end;
$$;
revoke execute on function public.receive_purchase(uuid,uuid,uuid,date,text,uuid,jsonb) from public;
grant  execute on function public.receive_purchase(uuid,uuid,uuid,date,text,uuid,jsonb) to authenticated;
