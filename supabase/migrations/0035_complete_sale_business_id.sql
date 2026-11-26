-- MELA 0035: Add p_business_id parameter to complete_sale() and
-- receive_purchase() so sales and purchases are tagged to the correct
-- business when a user owns multiple businesses.

-- ── complete_sale() ───────────────────────────────────────────────────────────
create or replace function public.complete_sale(
  p_owner_id        uuid,
  p_business_id     uuid,
  p_sale_number     text,
  p_payment_method  text,
  p_items           jsonb,
  p_idempotency_key uuid    default null,
  p_customer_name   text    default null,
  p_customer_id     uuid    default null,
  p_notes           text    default null
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
  if p_payment_method not in ('cash','telebirr','cbe_birr','bank_transfer') then
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
  insert into public.sales (
    owner_id, business_id, sale_number, subtotal, total,
    payment_method, payment_status, idempotency_key,
    customer_name, customer_id, notes
  )
  values (
    p_owner_id, p_business_id, p_sale_number, v_subtotal, v_total,
    p_payment_method, v_payment_status, v_idempotency_key,
    p_customer_name, p_customer_id, p_notes
  )
  returning id into v_sale_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::numeric;
    select * into v_product from public.products
    where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id;
    v_line        := round(v_product.selling_price * v_qty, 2);
    v_stock_after := v_product.stock_quantity - v_qty;
    insert into public.sale_items (sale_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_product.selling_price, v_product.cost_price, v_qty, v_line);
    update public.products set stock_quantity = v_stock_after where id = v_product.id and owner_id = p_owner_id;
    insert into public.inventory_movements (owner_id, business_id, product_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_id)
    values (p_owner_id, p_business_id, v_product.id, v_product.name, 'sale', -v_qty, v_product.stock_quantity, v_stock_after, v_sale_id);
  end loop;
  return jsonb_build_object('sale_id', v_sale_id, 'total', v_total, 'payment_status', v_payment_status, 'already_exists', false);
end;
$$;
revoke execute on function public.complete_sale(uuid,uuid,text,text,jsonb,uuid,text,uuid,text) from public;
grant  execute on function public.complete_sale(uuid,uuid,text,text,jsonb,uuid,text,uuid,text) to authenticated;
