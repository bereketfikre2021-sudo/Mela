-- MELA Phase 14: Add customer and notes to sales.
--
-- Adds customer_name, customer_id, and notes to the sales table so that
-- service providers (and product businesses) can record who they served,
-- how they paid, and any relevant notes.
--
-- complete_sale() is updated to accept and store these optional fields.
-- All existing sales are unaffected (columns are nullable).

-- ── Add columns to sales ──────────────────────────────────────────────────────

alter table public.sales
  add column if not exists customer_name text
    check (customer_name is null or char_length(trim(customer_name)) between 1 and 200),
  add column if not exists customer_id   uuid
    references public.customers(id) on delete set null,
  add column if not exists notes         text
    check (notes is null or char_length(trim(notes)) <= 1000);

create index if not exists sales_owner_customer_idx
  on public.sales (owner_id, customer_id);

-- ── Replace complete_sale() to accept customer + notes ────────────────────────
-- Preserves ALL existing logic (idempotency, plan limits, inventory movements).
-- New parameters are optional (DEFAULT NULL) so existing callers still work.

create or replace function public.complete_sale(
  p_owner_id        uuid,
  p_sale_number     text,
  p_payment_method  text,
  p_items           jsonb,
  p_idempotency_key uuid   default null,
  p_customer_name   text   default null,
  p_customer_id     uuid   default null,
  p_notes           text   default null
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
  -- Auth check
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- Payment method validation
  if p_payment_method not in ('cash','telebirr','cbe_birr','bank_transfer') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;

  -- Items validation
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- Monthly sales limit check
  if not public.check_monthly_sales_limit(p_owner_id) then
    raise exception 'Plan limit reached: monthly sales limit exceeded. Upgrade to Premium for unlimited sales.';
  end if;

  -- Idempotency check
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

  -- Payment status
  v_payment_status := case
    when p_payment_method = 'cash' then 'paid'
    else 'pending'
  end;

  -- Validate customer_id belongs to this owner (if provided)
  if p_customer_id is not null then
    if not exists (
      select 1 from public.customers
      where id = p_customer_id and owner_id = p_owner_id
    ) then
      raise exception 'Customer not found or not owned by caller';
    end if;
  end if;

  -- Lock products, check stock, accumulate totals
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

  -- Insert sale
  insert into public.sales (
    owner_id, sale_number, subtotal, total,
    payment_method, payment_status, idempotency_key,
    customer_name, customer_id, notes
  )
  values (
    p_owner_id, p_sale_number, v_subtotal, v_total,
    p_payment_method, v_payment_status, v_idempotency_key,
    nullif(trim(coalesce(p_customer_name,'')), ''), p_customer_id, p_notes
  )
  returning id into v_sale_id;

  -- Insert items + deduct stock + record movements
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

revoke execute on function public.complete_sale(uuid,text,text,jsonb,uuid,text,uuid,text) from public;
grant  execute on function public.complete_sale(uuid,text,text,jsonb,uuid,text,uuid,text) to authenticated;
