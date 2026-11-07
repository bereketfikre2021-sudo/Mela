-- MELA Phase 2.3 verification fixes.
--
-- Fix 1: Idempotency key on sales.
--   A client-supplied UUID sent with every checkout attempt. The unique index
--   means a retry with the same key is rejected (the first insert wins) rather
--   than creating a duplicate sale. The key is separate from the human-readable
--   sale_number so both can be indexed independently.
--
-- Fix 2: Payment-status logic.
--   Cash → 'paid' immediately.
--   Telebirr / bank_transfer → 'pending' until the owner marks them paid.
--   The complete_sale() RPC is replaced below with the corrected logic.

-- ── Add idempotency_key column ────────────────────────────────────────────────
alter table public.sales
  add column if not exists idempotency_key uuid not null default gen_random_uuid();

-- Unique per owner so two owners can never collide, and a retry from the same
-- client is caught by the duplicate-key error and returns a clear message.
create unique index if not exists sales_owner_idempotency_key
  on public.sales (owner_id, idempotency_key);

-- ── Replace complete_sale() with corrected version ────────────────────────────
create or replace function public.complete_sale(
  p_owner_id        uuid,
  p_sale_number     text,
  p_payment_method  text,
  p_items           jsonb,
  p_idempotency_key uuid default null   -- optional; generated server-side if omitted
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

  -- 4. Idempotency: if a key was supplied and we already processed it, return
  --    the existing result instead of creating a duplicate.
  v_idempotency_key := coalesce(p_idempotency_key, gen_random_uuid());

  select id, total into v_existing
  from public.sales
  where owner_id = p_owner_id
    and idempotency_key = v_idempotency_key;

  if found then
    -- Already processed — return the original result idempotently.
    return jsonb_build_object(
      'sale_id',         v_existing.id,
      'total',           v_existing.total,
      'already_exists',  true
    );
  end if;

  -- 5. Determine payment status.
  --    Cash = paid immediately.
  --    Telebirr / bank_transfer = pending until confirmed by the owner.
  v_payment_status := case
    when p_payment_method = 'cash' then 'paid'
    else 'pending'
  end;

  -- 6. Lock products for update, verify ownership + stock, accumulate totals.
  --    The owner_id = p_owner_id filter ensures a product from another owner
  --    is treated as "not found" and raises an exception.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    if v_qty <= 0 then
      raise exception 'Quantity must be greater than zero';
    end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id       -- cross-owner access rejected here
    for update;                        -- row lock prevents concurrent oversell

    if not found then
      raise exception 'Product not found or not owned by caller: %',
        v_item->>'product_id';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Insufficient stock for "%". Available: %, requested: %',
        v_product.name, v_product.stock_quantity, v_qty;
    end if;

    -- Use DB-side price: client-supplied prices are never trusted.
    v_line     := round(v_product.selling_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
  end loop;

  v_total := v_subtotal; -- extend here for discounts/tax in a later phase

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

  -- 8. Insert sale_items and deduct stock atomically.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    -- Re-fetch (already locked above; this is within the same transaction).
    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id;

    v_line := round(v_product.selling_price * v_qty, 2);

    -- Snapshot name and price at sale time — preserved even if product is later
    -- edited or deleted.
    insert into public.sale_items
      (sale_id, product_id, product_name, unit_price, quantity, line_total)
    values
      (v_sale_id, v_product.id, v_product.name, v_product.selling_price, v_qty, v_line);

    -- Deduct stock. The check constraint on products (stock_quantity >= 0) acts
    -- as a final safety net against any race condition not caught by the row lock.
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

-- Re-apply grants (CREATE OR REPLACE resets them).
revoke execute on function public.complete_sale(uuid,text,text,jsonb,uuid) from public;
grant  execute on function public.complete_sale(uuid,text,text,jsonb,uuid) to authenticated;
