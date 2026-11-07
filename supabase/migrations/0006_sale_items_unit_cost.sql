-- MELA Phase 3.2: add unit_cost snapshot to sale_items.
--
-- unit_cost records the product's cost_price at checkout time so gross profit
-- can be calculated from historical data. The column is nullable:
--   - NULL on rows created before this migration (cost cannot be reconstructed).
--   - NULL on new sales where the product had no cost_price set.
--   - A positive value on new sales where cost_price was known.
-- Never back-fill from the current product cost — that would misrepresent history.

alter table public.sale_items
  add column if not exists unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0);

-- ── Replace complete_sale() to capture cost snapshot ─────────────────────────
-- All idempotency, payment-status, and ownership behaviour from 0004 is preserved.
-- The only change is step 8: unit_cost is now snapshotted from the product row.

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
begin
  -- 1. Caller must be the authenticated owner.
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- 2. Validate payment method.
  if p_payment_method not in ('cash','telebirr','bank_transfer') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;

  -- 3. Validate items array.
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- 4. Idempotency check.
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

  -- 5. Payment status: cash = paid, non-cash = pending.
  v_payment_status := case
    when p_payment_method = 'cash' then 'paid'
    else 'pending'
  end;

  -- 6. Lock product rows, verify ownership + stock, accumulate totals.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    if v_qty <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id
    for update;

    if not found then
      raise exception 'Product not found or not owned by caller: %',
        v_item->>'product_id';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Insufficient stock for "%". Available: %, requested: %',
        v_product.name, v_product.stock_quantity, v_qty;
    end if;

    v_line     := round(v_product.selling_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
  end loop;

  v_total := v_subtotal;

  -- 7. Insert sale row.
  insert into public.sales (
    owner_id, sale_number, subtotal, total,
    payment_method, payment_status, idempotency_key
  )
  values (
    p_owner_id, p_sale_number, v_subtotal, v_total,
    p_payment_method, v_payment_status, v_idempotency_key
  )
  returning id into v_sale_id;

  -- 8. Insert sale_items with cost snapshot, then deduct stock.
  --    unit_cost is snapshotted from the product's current cost_price.
  --    It is NULL when no cost_price was recorded — this is correct and honest;
  --    never substitute a default or estimated value.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id;

    v_line := round(v_product.selling_price * v_qty, 2);

    insert into public.sale_items
      (sale_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
    values
      (v_sale_id,
       v_product.id,
       v_product.name,
       v_product.selling_price,
       v_product.cost_price,   -- snapshot; NULL is valid and expected
       v_qty,
       v_line);

    update public.products
    set stock_quantity = stock_quantity - v_qty
    where id = v_product.id
      and owner_id = p_owner_id;
  end loop;

  return jsonb_build_object(
    'sale_id',        v_sale_id,
    'total',          v_total,
    'payment_status', v_payment_status,
    'already_exists', false
  );
end;
$$;

-- Re-apply grants.
revoke execute on function public.complete_sale(uuid,text,text,jsonb,uuid) from public;
grant  execute on function public.complete_sale(uuid,text,text,jsonb,uuid) to authenticated;
