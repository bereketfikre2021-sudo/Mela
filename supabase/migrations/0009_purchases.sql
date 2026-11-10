-- MELA Phase 6.3: purchases + purchase_items tables with atomic receive_purchase() RPC.
-- All stock updates and inventory movement recording happen inside the RPC.
-- Frontend never writes to products.stock_quantity or inventory_movements directly.

-- ── purchases ─────────────────────────────────────────────────────────────────

create table if not exists public.purchases (
  id               uuid          primary key default gen_random_uuid(),
  owner_id         uuid          not null references auth.users(id) on delete cascade,
  supplier_id      uuid          references public.suppliers(id) on delete set null,
  supplier_name    text          not null,                    -- snapshot
  purchase_date    date          not null default current_date,
  total_cost       numeric(12,2) not null check (total_cost >= 0),
  notes            text          check (notes is null or char_length(trim(notes)) <= 1000),
  idempotency_key  uuid          not null default gen_random_uuid(),
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

create unique index if not exists purchases_owner_idempotency_key
  on public.purchases (owner_id, idempotency_key);

create index if not exists purchases_owner_id_idx
  on public.purchases (owner_id);

create index if not exists purchases_owner_date_idx
  on public.purchases (owner_id, purchase_date desc);

drop trigger if exists purchases_set_updated_at on public.purchases;
create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

alter table public.purchases enable row level security;

create policy "owners select own purchases"
  on public.purchases for select using (owner_id = auth.uid());
create policy "owners insert own purchases"
  on public.purchases for insert with check (owner_id = auth.uid());
create policy "owners update own purchases"
  on public.purchases for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete own purchases"
  on public.purchases for delete using (owner_id = auth.uid());

-- ── purchase_items ────────────────────────────────────────────────────────────

create table if not exists public.purchase_items (
  id           uuid          primary key default gen_random_uuid(),
  purchase_id  uuid          not null references public.purchases(id) on delete cascade,
  product_id   uuid          references public.products(id) on delete set null,
  product_name text          not null,           -- snapshot
  quantity     numeric(12,3) not null check (quantity > 0),
  unit_cost    numeric(12,2) not null check (unit_cost >= 0),
  line_total   numeric(12,2) not null check (line_total >= 0),
  created_at   timestamptz   not null default now()
);

create index if not exists purchase_items_purchase_id_idx
  on public.purchase_items (purchase_id);

-- RLS: readable/insertable only when the parent purchase belongs to auth.uid()
alter table public.purchase_items enable row level security;

create policy "owners select own purchase items"
  on public.purchase_items for select
  using (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.owner_id = auth.uid()
    )
  );

create policy "owners insert own purchase items"
  on public.purchase_items for insert
  with check (
    exists (
      select 1 from public.purchases p
      where p.id = purchase_id and p.owner_id = auth.uid()
    )
  );

-- ── receive_purchase() RPC ────────────────────────────────────────────────────
-- Atomically:
--   1. Idempotency check (returns existing result on replay).
--   2. Snapshot supplier name.
--   3. Lock products, validate ownership.
--   4. Insert purchases row.
--   5. Insert purchase_items rows.
--   6. Increase product stock_quantity.
--   7. Optionally update product cost_price (when new unit cost differs).
--   8. Insert inventory_movements rows (type = 'purchase').
--
-- p_owner_id        : must equal auth.uid()
-- p_supplier_id     : nullable; name is always snapshotted
-- p_purchase_date   : ISO date string (YYYY-MM-DD)
-- p_notes           : nullable
-- p_idempotency_key : client-generated UUID; replay returns the original result
-- p_items           : [{product_id, quantity, unit_cost}]

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
      -- Update cost_price to the latest purchase cost (common SMB practice)
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
