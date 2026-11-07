-- MELA Phase 2.3: sales + sale_items tables with atomic checkout RPC.
-- All writes go through the complete_sale() function — never via direct inserts.

-- ── sales ────────────────────────────────────────────────────────────────────

create table if not exists public.sales (
  id             uuid        primary key default gen_random_uuid(),
  owner_id       uuid        not null references auth.users(id) on delete cascade,
  sale_number    text        not null,
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  total          numeric(12,2) not null check (total >= 0),
  payment_method text        not null check (payment_method in ('cash','telebirr','bank_transfer')),
  payment_status text        not null default 'paid' check (payment_status in ('paid','pending','cancelled')),
  sold_at        timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- sale_number unique per owner
create unique index if not exists sales_owner_sale_number_key
  on public.sales (owner_id, sale_number);

create index if not exists sales_owner_id_idx on public.sales (owner_id);
create index if not exists sales_owner_sold_at_idx on public.sales (owner_id, sold_at desc);

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

alter table public.sales enable row level security;

create policy "owners select own sales"
  on public.sales for select using (owner_id = auth.uid());

create policy "owners insert own sales"
  on public.sales for insert with check (owner_id = auth.uid());

create policy "owners update own sales"
  on public.sales for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owners delete own sales"
  on public.sales for delete using (owner_id = auth.uid());

-- ── sale_items ────────────────────────────────────────────────────────────────

create table if not exists public.sale_items (
  id              uuid        primary key default gen_random_uuid(),
  sale_id         uuid        not null references public.sales(id) on delete cascade,
  product_id      uuid        references public.products(id) on delete set null,
  -- Snapshots so history is preserved even if the product changes later.
  product_name    text        not null,
  unit_price      numeric(12,2) not null check (unit_price >= 0),
  quantity        numeric(12,3) not null check (quantity > 0),
  line_total      numeric(12,2) not null check (line_total >= 0),
  created_at      timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);

-- RLS: accessible only when the parent sale belongs to auth.uid().
alter table public.sale_items enable row level security;

create policy "owners select own sale items"
  on public.sale_items for select
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and s.owner_id = auth.uid()
    )
  );

create policy "owners insert own sale items"
  on public.sale_items for insert
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and s.owner_id = auth.uid()
    )
  );

create policy "owners delete own sale items"
  on public.sale_items for delete
  using (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and s.owner_id = auth.uid()
    )
  );

-- ── complete_sale() RPC ───────────────────────────────────────────────────────
-- Atomic checkout: validates stock, creates sale + items, deducts stock.
-- Called from the frontend with the anon key via supabase.rpc().
-- Security-definer runs with the function owner's privileges, but every
-- write is still owner-scoped (p_owner_id = auth.uid() enforced inside).
--
-- p_owner_id      : must equal auth.uid() (enforced; rejects if not)
-- p_sale_number   : client-generated unique reference (e.g. "S-0001")
-- p_payment_method: 'cash' | 'telebirr' | 'bank_transfer'
-- p_items         : JSON array of {product_id, quantity}

create or replace function public.complete_sale(
  p_owner_id       uuid,
  p_sale_number    text,
  p_payment_method text,
  p_items          jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id   uuid;
  v_subtotal  numeric(12,2) := 0;
  v_total     numeric(12,2) := 0;
  v_item      jsonb;
  v_product   record;
  v_qty       numeric(12,3);
  v_line      numeric(12,2);
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

  -- 4. Lock products for update, validate stock, accumulate totals.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id
    for update;  -- row lock prevents concurrent oversell

    if not found then
      raise exception 'Product not found: %', v_item->>'product_id';
    end if;

    if v_product.stock_quantity < v_qty then
      raise exception 'Insufficient stock for "%". Available: %, requested: %',
        v_product.name, v_product.stock_quantity, v_qty;
    end if;

    v_line     := round(v_product.selling_price * v_qty, 2);
    v_subtotal := v_subtotal + v_line;
  end loop;

  v_total := v_subtotal; -- extend here for discounts/tax in a later phase

  -- 5. Insert sale row.
  insert into public.sales
    (owner_id, sale_number, subtotal, total, payment_method, payment_status)
  values
    (p_owner_id, p_sale_number, v_subtotal, v_total, p_payment_method, 'paid')
  returning id into v_sale_id;

  -- 6. Insert sale_items and deduct stock.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::numeric;

    select * into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and owner_id = p_owner_id;

    v_line := round(v_product.selling_price * v_qty, 2);

    insert into public.sale_items
      (sale_id, product_id, product_name, unit_price, quantity, line_total)
    values
      (v_sale_id, v_product.id, v_product.name, v_product.selling_price, v_qty, v_line);

    update public.products
    set stock_quantity = stock_quantity - v_qty
    where id = v_product.id;
  end loop;

  return jsonb_build_object('sale_id', v_sale_id, 'total', v_total);
end;
$$;

-- Grant execute to authenticated users only.
revoke execute on function public.complete_sale(uuid,text,text,jsonb) from public;
grant  execute on function public.complete_sale(uuid,text,text,jsonb) to authenticated;
