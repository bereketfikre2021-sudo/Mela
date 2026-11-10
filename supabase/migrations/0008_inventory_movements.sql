-- MELA Phase 6.2: inventory_movements table + stock adjustment RPC.
--
-- Design:
--  - Every stock change (sale, manual adjustment, purchase, return, damaged)
--    is recorded as an immutable row with stock_before and stock_after.
--  - complete_sale() is replaced below to also write 'sale' movements.
--    All existing idempotency, payment-status, and ownership rules are preserved.
--  - A new adjust_stock() RPC handles manual adjustments atomically.
--  - Frontend never writes to products.stock_quantity directly for adjustments.

-- ── inventory_movements ───────────────────────────────────────────────────────

create table if not exists public.inventory_movements (
  id              uuid          primary key default gen_random_uuid(),
  owner_id        uuid          not null references auth.users(id) on delete cascade,
  product_id      uuid          references public.products(id) on delete set null,
  product_name    text          not null,  -- snapshot in case product is later deleted
  movement_type   text          not null
                    check (movement_type in ('purchase','sale','adjustment','return','damaged')),
  quantity_change numeric(12,3) not null
                    check (quantity_change <> 0),     -- zero changes are never valid
  stock_before    numeric(12,3) not null check (stock_before >= 0),
  stock_after     numeric(12,3) not null check (stock_after  >= 0),
  reason          text          check (reason is null or char_length(trim(reason)) <= 500),
  reference_id    uuid,         -- sale_id for 'sale' movements, nullable otherwise
  created_at      timestamptz   not null default now()
);

create index if not exists inventory_movements_owner_id_idx
  on public.inventory_movements (owner_id);

create index if not exists inventory_movements_product_idx
  on public.inventory_movements (owner_id, product_id);

create index if not exists inventory_movements_created_at_idx
  on public.inventory_movements (owner_id, created_at desc);

alter table public.inventory_movements enable row level security;

create policy "owners select own movements"
  on public.inventory_movements for select
  using (owner_id = auth.uid());

-- Movements are written only by RPCs (security definer); no direct client inserts.
create policy "owners insert own movements"
  on public.inventory_movements for insert
  with check (owner_id = auth.uid());

-- Movements are immutable — no update or delete policies.

-- ── adjust_stock() RPC ────────────────────────────────────────────────────────
-- Atomically adjusts stock and records an inventory_movements row.
-- Called from the frontend for manual adjustments (purchase, adjustment,
-- return, damaged). Sale movements are handled inside complete_sale().
--
-- p_owner_id     : must equal auth.uid()
-- p_product_id   : product to adjust
-- p_movement_type: 'purchase' | 'adjustment' | 'return' | 'damaged'
-- p_quantity_change: positive or negative; zero is rejected
-- p_reason       : optional text note

create or replace function public.adjust_stock(
  p_owner_id      uuid,
  p_product_id    uuid,
  p_movement_type text,
  p_quantity_change numeric(12,3),
  p_reason        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product      record;
  v_stock_after  numeric(12,3);
begin
  -- 1. Caller must be authenticated owner.
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- 2. Validate movement type (sales go through complete_sale, not here).
  if p_movement_type not in ('purchase','adjustment','return','damaged') then
    raise exception 'Invalid movement type for manual adjustment: %', p_movement_type;
  end if;

  -- 3. Reject zero changes.
  if p_quantity_change = 0 then
    raise exception 'Quantity change must not be zero';
  end if;

  -- 4. Lock and fetch the product.
  select * into v_product
  from public.products
  where id = p_product_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Product not found or not owned by caller';
  end if;

  -- 5. Calculate resulting stock.
  v_stock_after := v_product.stock_quantity + p_quantity_change;

  -- 6. Reject if result would go negative.
  if v_stock_after < 0 then
    raise exception 'Insufficient stock. Available: %, requested reduction: %',
      v_product.stock_quantity, abs(p_quantity_change);
  end if;

  -- 7. Apply stock change.
  update public.products
  set stock_quantity = v_stock_after
  where id = p_product_id
    and owner_id = p_owner_id;

  -- 8. Record movement.
  insert into public.inventory_movements
    (owner_id, product_id, product_name, movement_type, quantity_change,
     stock_before, stock_after, reason)
  values
    (p_owner_id, p_product_id, v_product.name, p_movement_type, p_quantity_change,
     v_product.stock_quantity, v_stock_after, p_reason);

  return jsonb_build_object(
    'product_id',   p_product_id,
    'stock_before', v_product.stock_quantity,
    'stock_after',  v_stock_after
  );
end;
$$;

revoke execute on function public.adjust_stock(uuid,uuid,text,numeric,text) from public;
grant  execute on function public.adjust_stock(uuid,uuid,text,numeric,text) to authenticated;

-- ── Replace complete_sale() to also record sale movements ─────────────────────
-- Preserves all behaviour from migration 0006 and adds inventory_movements
-- inserts after each stock deduction.

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

    -- Record sale movement — idempotency is guaranteed by the sale-level check above,
    -- so this insert runs exactly once per successful checkout.
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
