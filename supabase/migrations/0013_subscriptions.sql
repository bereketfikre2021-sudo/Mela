-- MELA Phase 11 Stage 1: Subscription database foundation.
-- Creates plan_limits, subscriptions, payment_submissions tables,
-- activate_subscription() and enforcement RPCs, and wires limit checks
-- into existing INSERT policies and atomic RPCs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_limits
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.plan_limits (
  plan                     text    primary key,
  max_products             int     not null,
  max_sales_per_month      int     not null,
  max_customers            int     not null,
  max_suppliers            int     not null,
  max_purchases_per_month  int     not null,
  inventory_history_days   int     not null,
  advanced_reports         bool    not null default false,
  updated_at               timestamptz not null default now()
);

-- Seed plan rows (idempotent: do nothing on conflict)
insert into public.plan_limits
  (plan, max_products, max_sales_per_month, max_customers, max_suppliers,
   max_purchases_per_month, inventory_history_days, advanced_reports, updated_at)
values
  ('free',    50,         100,         50,         5,  10,         30,   false, now()),
  ('premium', 2147483647, 2147483647, 2147483647, 2147483647, 2147483647, 3650, true,  now())
on conflict (plan) do nothing;

alter table public.plan_limits enable row level security;

-- All authenticated users can read plan config (global reference data)
create policy "authenticated read plan limits"
  on public.plan_limits for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. subscriptions
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.subscriptions (
  id                   uuid        primary key default gen_random_uuid(),
  owner_id             uuid        not null unique references auth.users(id) on delete cascade,
  plan                 text        not null default 'free'
                         check (plan in ('free', 'premium')),
  status               text        not null default 'active'
                         check (status in ('active', 'pending_payment', 'grace', 'expired', 'cancelled')),
  current_period_start timestamptz,
  current_period_end   timestamptz,
  grace_ends_at        timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_owner_id_idx
  on public.subscriptions (owner_id);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function set_updated_at();

alter table public.subscriptions enable row level security;

create policy "owners select own subscription"
  on public.subscriptions for select
  using (owner_id = auth.uid());

-- No INSERT/UPDATE/DELETE from frontend — managed by RPCs and triggers only.

-- Trigger: create a free subscription when a new business is registered.
create or replace function public.create_subscription_on_business_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (owner_id, plan, status)
  values (NEW.owner_id, 'free', 'active')
  on conflict (owner_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists trg_business_subscription on public.businesses;
create trigger trg_business_subscription
  after insert on public.businesses
  for each row execute function public.create_subscription_on_business_insert();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. payment_submissions
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.payment_submissions (
  id                    uuid           primary key default gen_random_uuid(),
  owner_id              uuid           not null references auth.users(id) on delete cascade,
  plan                  text           not null check (plan in ('premium')),
  billing_cycle         text           not null check (billing_cycle in ('monthly', 'yearly')),
  amount_etb            numeric(10,2)  not null check (amount_etb > 0),
  payment_method        text           not null
                          check (payment_method in ('telebirr', 'cbe_birr', 'bank_transfer')),
  transaction_reference text           not null
                          check (char_length(trim(transaction_reference)) between 4 and 100),
  status                text           not null default 'pending'
                          check (status in ('pending', 'approved', 'rejected')),
  submitted_at          timestamptz    not null default now(),
  reviewed_at           timestamptz,
  reviewer_notes        text,
  chapa_tx_ref          text,          -- nullable stub for future Chapa integration
  created_at            timestamptz    not null default now(),
  updated_at            timestamptz    not null default now()
);

create index if not exists idx_payment_submissions_owner_submitted
  on public.payment_submissions (owner_id, submitted_at desc);

drop trigger if exists payment_submissions_set_updated_at on public.payment_submissions;
create trigger payment_submissions_set_updated_at
  before update on public.payment_submissions
  for each row execute function set_updated_at();

alter table public.payment_submissions enable row level security;

create policy "owners select own payment submissions"
  on public.payment_submissions for select
  using (owner_id = auth.uid());

create policy "owners insert own payment submissions"
  on public.payment_submissions for insert
  with check (owner_id = auth.uid() and status = 'pending');

-- No UPDATE/DELETE from frontend.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. activate_subscription() RPC (service_role only)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.activate_subscription(
  p_owner_id             uuid,
  p_plan                 text,
  p_billing_cycle        text,
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

revoke all on function public.activate_subscription(uuid, text, text, uuid) from public;
revoke all on function public.activate_subscription(uuid, text, text, uuid) from authenticated;
grant  execute on function public.activate_subscription(uuid, text, text, uuid) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Enforcement functions
-- ─────────────────────────────────────────────────────────────────────────────

-- get_effective_plan(): returns 'premium' or 'free' based on subscription state.
create or replace function public.get_effective_plan(p_owner_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan         text;
  v_status       text;
  v_grace_ends   timestamptz;
begin
  select plan, status, grace_ends_at
    into v_plan, v_status, v_grace_ends
  from public.subscriptions
  where owner_id = p_owner_id;

  if not found then
    return 'free';
  end if;

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

-- check_product_limit(): true when the owner is below their plan's product cap.
create or replace function public.check_product_limit(p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count       int;
  v_max         int;
begin
  select count(*) into v_count
  from public.products
  where owner_id = p_owner_id;

  select max_products into v_max
  from public.plan_limits
  where plan = public.get_effective_plan(p_owner_id);

  return v_count < v_max;
end;
$$;

grant execute on function public.check_product_limit(uuid) to authenticated;

-- check_customer_limit(): true when the owner is below their plan's customer cap.
create or replace function public.check_customer_limit(p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_max   int;
begin
  select count(*) into v_count
  from public.customers
  where owner_id = p_owner_id;

  select max_customers into v_max
  from public.plan_limits
  where plan = public.get_effective_plan(p_owner_id);

  return v_count < v_max;
end;
$$;

grant execute on function public.check_customer_limit(uuid) to authenticated;

-- check_supplier_limit(): true when the owner is below their plan's supplier cap.
create or replace function public.check_supplier_limit(p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_max   int;
begin
  select count(*) into v_count
  from public.suppliers
  where owner_id = p_owner_id;

  select max_suppliers into v_max
  from public.plan_limits
  where plan = public.get_effective_plan(p_owner_id);

  return v_count < v_max;
end;
$$;

grant execute on function public.check_supplier_limit(uuid) to authenticated;

-- check_monthly_sales_limit(): true when this month's sales are below the cap.
create or replace function public.check_monthly_sales_limit(p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_max   int;
begin
  select count(*) into v_count
  from public.sales
  where owner_id  = p_owner_id
    and created_at >= date_trunc('month', now())
    and created_at <  date_trunc('month', now()) + interval '1 month';

  select max_sales_per_month into v_max
  from public.plan_limits
  where plan = public.get_effective_plan(p_owner_id);

  return v_count < v_max;
end;
$$;

grant execute on function public.check_monthly_sales_limit(uuid) to authenticated;

-- check_monthly_purchases_limit(): true when this month's purchases are below the cap.
create or replace function public.check_monthly_purchases_limit(p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_max   int;
begin
  select count(*) into v_count
  from public.purchases
  where owner_id  = p_owner_id
    and created_at >= date_trunc('month', now())
    and created_at <  date_trunc('month', now()) + interval '1 month';

  select max_purchases_per_month into v_max
  from public.plan_limits
  where plan = public.get_effective_plan(p_owner_id);

  return v_count < v_max;
end;
$$;

grant execute on function public.check_monthly_purchases_limit(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Apply enforcement to existing RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

-- products: replace INSERT policy to enforce product limit
drop policy if exists "owners insert own products" on public.products;
create policy "owners insert own products"
  on public.products for insert
  with check (owner_id = auth.uid() and check_product_limit(auth.uid()));

-- customers: replace INSERT policy to enforce customer limit
drop policy if exists "owners insert own customers" on public.customers;
create policy "owners insert own customers"
  on public.customers for insert
  with check (owner_id = auth.uid() and check_customer_limit(auth.uid()));

-- suppliers: replace INSERT policy to enforce supplier limit
drop policy if exists "owners insert own suppliers" on public.suppliers;
create policy "owners insert own suppliers"
  on public.suppliers for insert
  with check (owner_id = auth.uid() and check_supplier_limit(auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Replace complete_sale() with monthly sales limit check
--    (preserves all logic from migration 0008, adds limit guard at top)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.complete_sale(
  p_owner_id        uuid,
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
  -- Monthly sales limit enforcement
  if not check_monthly_sales_limit(p_owner_id) then
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
  where owner_id = p_owner_id
    and idempotency_key = v_idempotency_key;

  if found then
    return jsonb_build_object(
      'sale_id',        v_existing.id,
      'total',          v_existing.total,
      'already_exists', true
    );
  end if;

  v_payment_status := case
    when p_payment_method = 'cash' then 'paid'
    else 'pending'
  end;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id
    for update;

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

  insert into public.sales (
    owner_id, sale_number, subtotal, total,
    payment_method, payment_status, idempotency_key
  )
  values (
    p_owner_id, p_sale_number, v_subtotal, v_total,
    p_payment_method, v_payment_status, v_idempotency_key
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id;

    v_line        := round(v_product.selling_price * v_qty, 2);
    v_stock_after := v_product.stock_quantity - v_qty;

    insert into public.sale_items
      (sale_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
    values
      (v_sale_id, v_product.id, v_product.name, v_product.selling_price,
       v_product.cost_price, v_qty, v_line);

    update public.products
    set stock_quantity = v_stock_after
    where id = v_product.id and owner_id = p_owner_id;

    insert into public.inventory_movements
      (owner_id, product_id, product_name, movement_type, quantity_change,
       stock_before, stock_after, reference_id)
    values
      (p_owner_id, v_product.id, v_product.name, 'sale', -v_qty,
       v_product.stock_quantity, v_stock_after, v_sale_id);
  end loop;

  return jsonb_build_object(
    'sale_id',        v_sale_id,
    'total',          v_total,
    'payment_status', v_payment_status,
    'already_exists', false
  );
end;
$$;

revoke execute on function public.complete_sale(uuid,text,text,jsonb,uuid) from public;
grant  execute on function public.complete_sale(uuid,text,text,jsonb,uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Replace receive_purchase() with monthly purchases limit check
--    (preserves all logic from migration 0009, adds limit guard at top)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.receive_purchase(
  p_owner_id        uuid,
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
  -- Monthly purchases limit enforcement
  if not check_monthly_purchases_limit(p_owner_id) then
    raise exception 'Monthly purchases limit reached. Upgrade to Premium for unlimited purchases.';
  end if;

  -- 1. Caller must be authenticated owner.
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- 2. Validate items.
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Purchase must have at least one item';
  end if;

  -- 3. Idempotency check.
  select id, total_cost into v_existing
  from public.purchases
  where owner_id = p_owner_id
    and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'purchase_id',   v_existing.id,
      'total_cost',    v_existing.total_cost,
      'already_exists', true
    );
  end if;

  -- 4. Resolve supplier name snapshot.
  if p_supplier_id is not null then
    select name into v_supplier_name
    from public.suppliers
    where id = p_supplier_id and owner_id = p_owner_id;

    if not found then
      raise exception 'Supplier not found or not owned by caller';
    end if;
  end if;

  -- 5. Lock products, validate ownership, accumulate total.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;

    if v_qty <= 0       then raise exception 'Quantity must be greater than zero'; end if;
    if v_unit_cost < 0  then raise exception 'Unit cost must be zero or greater';  end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id
    for update;

    if not found then
      raise exception 'Product not found or not owned by caller: %', v_item->>'product_id';
    end if;

    v_line       := round(v_unit_cost * v_qty, 2);
    v_total_cost := v_total_cost + v_line;
  end loop;

  -- 6. Insert purchase row.
  insert into public.purchases
    (owner_id, supplier_id, supplier_name, purchase_date, total_cost, notes, idempotency_key)
  values
    (p_owner_id, p_supplier_id, v_supplier_name, p_purchase_date, v_total_cost, p_notes, p_idempotency_key)
  returning id into v_purchase_id;

  -- 7. Insert items, update stock, record movements.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;
    v_line      := round(v_unit_cost * v_qty, 2);

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id;

    v_stock_after := v_product.stock_quantity + v_qty;

    -- purchase_items row (snapshot name)
    insert into public.purchase_items
      (purchase_id, product_id, product_name, quantity, unit_cost, line_total)
    values
      (v_purchase_id, v_product.id, v_product.name, v_qty, v_unit_cost, v_line);

    -- Increase stock
    update public.products
    set
      stock_quantity = v_stock_after,
      cost_price     = v_unit_cost
    where id = v_product.id and owner_id = p_owner_id;

    -- Record purchase movement
    insert into public.inventory_movements
      (owner_id, product_id, product_name, movement_type, quantity_change,
       stock_before, stock_after, reference_id)
    values
      (p_owner_id, v_product.id, v_product.name, 'purchase', v_qty,
       v_product.stock_quantity, v_stock_after, v_purchase_id);
  end loop;

  return jsonb_build_object(
    'purchase_id',    v_purchase_id,
    'total_cost',     v_total_cost,
    'already_exists', false
  );
end;
$$;

revoke execute on function public.receive_purchase(uuid,uuid,date,text,uuid,jsonb) from public;
grant  execute on function public.receive_purchase(uuid,uuid,date,text,uuid,jsonb) to authenticated;
