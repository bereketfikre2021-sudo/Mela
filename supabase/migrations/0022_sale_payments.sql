-- MELA F3: Customer receivables and credit sales.
--
-- Adds partial-payment support to sales:
--   - sales.amount_paid  tracks cumulative payments received
--   - sales.payment_status gains a 'partial' value (was paid|pending|cancelled)
--   - sale_payments is an immutable payment ledger (append-only via RLS)
--   - record_sale_payment() atomically records payments and updates balances
--
-- The complete_sale() RPC is updated so that:
--   - cash sales still set amount_paid = total (fully paid)
--   - non-cash sales set amount_paid = 0  (unpaid / credit)
--   - 'pending' is now used only as an alias for 'unpaid' on new non-cash sales
--     (existing 'pending' rows continue to work; the UI maps them to unpaid)
--
-- Walk-in sales (no customer_id) are supported throughout.
-- NOTE: authored, not applied. Apply to production only with approval.

-- ── 1. Extend sales ───────────────────────────────────────────────────────────

-- Add amount_paid column (default 0, so all existing rows start fully consistent
-- with their current payment_status via the trigger below).
alter table public.sales
  add column if not exists amount_paid numeric(12,2) not null default 0
    check (amount_paid >= 0 and amount_paid <= total);

-- Extend the payment_status check to allow 'partial'.
-- Postgres requires dropping and re-adding the constraint.
alter table public.sales drop constraint if exists sales_payment_status_check;
alter table public.sales
  add constraint sales_payment_status_check
  check (payment_status in ('paid','partial','pending','cancelled'));

-- Back-fill amount_paid for existing rows so the data is immediately consistent:
-- paid → amount_paid = total; everything else → 0.
update public.sales
  set amount_paid = total
  where payment_status = 'paid' and amount_paid = 0;

-- ── 2. sale_payments ledger ───────────────────────────────────────────────────

create table if not exists public.sale_payments (
  id              uuid          primary key default gen_random_uuid(),
  owner_id        uuid          not null references auth.users(id) on delete cascade,
  sale_id         uuid          not null references public.sales(id) on delete cascade,
  customer_id     uuid          references public.customers(id) on delete set null,
  customer_name   text,                                       -- snapshot at time of payment
  amount          numeric(12,2) not null check (amount > 0),
  payment_method  text          not null
    check (payment_method in ('cash','telebirr','cbe_birr','bank_transfer')),
  payment_date    date          not null default current_date,
  note            text          check (note is null or char_length(trim(note)) <= 1000),
  idempotency_key uuid          not null default gen_random_uuid(),
  created_at      timestamptz   not null default now()
);

create unique index if not exists sale_payments_owner_idempotency_key
  on public.sale_payments (owner_id, idempotency_key);
create index if not exists sale_payments_owner_idx
  on public.sale_payments (owner_id);
create index if not exists sale_payments_sale_idx
  on public.sale_payments (sale_id);
create index if not exists sale_payments_customer_idx
  on public.sale_payments (owner_id, customer_id)
  where customer_id is not null;

alter table public.sale_payments enable row level security;

-- Append-only: owners may select and insert; no update/delete allowed.
create policy "owners select own sale payments"
  on public.sale_payments for select using (owner_id = auth.uid());
create policy "owners insert own sale payments"
  on public.sale_payments for insert with check (owner_id = auth.uid());
-- No update / delete policies → RLS denies both → immutable ledger.

-- ── 3. record_sale_payment() RPC ─────────────────────────────────────────────
-- Atomically:
--   1. Idempotency check — replay returns original result.
--   2. Lock and validate the sale (ownership, not cancelled, balance > 0).
--   3. Cap payment at the remaining balance (overpay is rejected).
--   4. Insert sale_payments row (the outflow record).
--   5. Update sales.amount_paid and derive the new payment_status:
--        amount_paid >= total → 'paid'
--        amount_paid > 0     → 'partial'
--        amount_paid = 0     → 'pending'  (unchanged from before first payment)
--
-- The server derives payment_status; the frontend never sends or stores it.

create or replace function public.record_sale_payment(
  p_owner_id        uuid,
  p_sale_id         uuid,
  p_amount          numeric(12,2),
  p_payment_method  text,
  p_payment_date    date,
  p_note            text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_sale       public.sales%rowtype;
  v_balance    numeric(12,2);
  v_new_paid   numeric(12,2);
  v_new_status text;
  v_existing   public.sale_payments%rowtype;
begin
  -- Auth check.
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- Idempotency: a replay of the same key returns the original result.
  select * into v_existing
  from public.sale_payments
  where owner_id = p_owner_id and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'payment_id',     v_existing.id,
      'sale_id',        v_existing.sale_id,
      'amount_paid',    null,
      'balance_due',    null,
      'payment_status', null,
      'already_exists', true
    );
  end if;

  -- Validate inputs.
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_payment_method not in ('cash','telebirr','cbe_birr','bank_transfer') then
    raise exception 'Invalid payment method';
  end if;

  -- Lock the sale and validate.
  select * into v_sale
  from public.sales
  where id = p_sale_id and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Sale not found or not owned by caller';
  end if;

  if v_sale.payment_status = 'cancelled' then
    raise exception 'Cannot record a payment against a cancelled sale';
  end if;

  v_balance := v_sale.total - v_sale.amount_paid;

  if v_balance <= 0 then
    raise exception 'This sale is already fully paid';
  end if;

  if p_amount > v_balance + 0.005 then   -- 0.005 tolerance for float rounding
    raise exception 'Payment amount (%) exceeds the remaining balance (%)',
      p_amount, v_balance;
  end if;

  -- Cap at balance to absorb any rounding dust.
  declare
    v_capped_amount numeric(12,2) := least(p_amount, v_balance);
  begin
    v_new_paid := v_sale.amount_paid + v_capped_amount;

    -- Derive status server-side — frontend never controls this.
    v_new_status := case
      when v_new_paid >= v_sale.total then 'paid'
      when v_new_paid  > 0            then 'partial'
      else                                 'pending'
    end;

    -- Insert the outflow record.
    insert into public.sale_payments
      (owner_id, sale_id, customer_id, customer_name, amount, payment_method, payment_date, note, idempotency_key)
    values
      (p_owner_id, v_sale.id, v_sale.customer_id, v_sale.customer_name,
       v_capped_amount, p_payment_method, p_payment_date, p_note, p_idempotency_key)
    returning id into v_payment_id;

    -- Update the sale balance and status atomically.
    update public.sales
    set amount_paid = v_new_paid, payment_status = v_new_status
    where id = v_sale.id;

    return jsonb_build_object(
      'payment_id',     v_payment_id,
      'sale_id',        v_sale.id,
      'amount_paid',    v_new_paid,
      'balance_due',    v_sale.total - v_new_paid,
      'payment_status', v_new_status,
      'already_exists', false
    );
  end;
end;
$$;

revoke execute on function public.record_sale_payment(uuid,uuid,numeric,text,date,text,uuid) from public;
grant  execute on function public.record_sale_payment(uuid,uuid,numeric,text,date,text,uuid) to authenticated;

-- ── 4. Update complete_sale() to initialise amount_paid ──────────────────────
-- cash   → amount_paid = total  (fully paid at checkout)
-- other  → amount_paid = 0      (credit / unpaid)
-- This replaces the version from 0015. All logic from 0015 is preserved.

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
  v_amount_paid     numeric(12,2);
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

  if p_payment_method not in ('cash','telebirr','cbe_birr','bank_transfer') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if not public.check_monthly_sales_limit(p_owner_id) then
    raise exception 'Plan limit reached: monthly sales limit exceeded. Upgrade to Premium for unlimited sales.';
  end if;

  v_idempotency_key := coalesce(p_idempotency_key, gen_random_uuid());

  select id, total into v_existing
  from public.sales
  where owner_id = p_owner_id and idempotency_key = v_idempotency_key;

  if found then
    return jsonb_build_object(
      'sale_id',        v_existing.id,
      'total',          v_existing.total,
      'already_exists', true
    );
  end if;

  -- cash → paid + full amount_paid; non-cash → pending + zero amount_paid
  if p_payment_method = 'cash' then
    v_payment_status := 'paid';
  else
    v_payment_status := 'pending';
  end if;

  if p_customer_id is not null then
    if not exists (
      select 1 from public.customers
      where id = p_customer_id and owner_id = p_owner_id
    ) then
      raise exception 'Customer not found or not owned by caller';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;
    if v_qty <= 0 then raise exception 'Quantity must be greater than zero'; end if;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id
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

  v_total       := v_subtotal;
  v_amount_paid := case when v_payment_status = 'paid' then v_total else 0 end;

  insert into public.sales (
    owner_id, sale_number, subtotal, total, amount_paid,
    payment_method, payment_status, idempotency_key,
    customer_name, customer_id, notes
  )
  values (
    p_owner_id, p_sale_number, v_subtotal, v_total, v_amount_paid,
    p_payment_method, v_payment_status, v_idempotency_key,
    nullif(trim(coalesce(p_customer_name,'')), ''), p_customer_id, p_notes
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid and owner_id = p_owner_id;

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
