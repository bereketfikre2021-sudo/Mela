-- MELA Phase 2.1: products table + row-level security.
-- Each product row is owned by the business owner (owner_id = auth.users.id).
-- Phase 2.1 scope: product catalogue only (no sales/transactions).

create table if not exists public.products (
  id             uuid        primary key default gen_random_uuid(),
  owner_id       uuid        not null references auth.users(id) on delete cascade,
  name           text        not null check (char_length(trim(name)) between 1 and 150),
  sku            text        check (sku is null or char_length(trim(sku)) between 1 and 100),
  selling_price  numeric(12, 2) not null check (selling_price >= 0),
  cost_price     numeric(12, 2) check (cost_price is null or cost_price >= 0),
  stock_quantity numeric(12, 3) not null default 0 check (stock_quantity >= 0),
  unit           text        not null default 'pcs' check (char_length(trim(unit)) between 1 and 30),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Fast owner-scoped lookups
create index if not exists products_owner_id_idx on public.products (owner_id);

-- Optional SKU must be unique per owner (not globally)
create unique index if not exists products_owner_sku_key
  on public.products (owner_id, sku)
  where sku is not null;

-- Reuse the set_updated_at function created in migration 0001.
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Row-level security: owners can only access their own products.
alter table public.products enable row level security;

create policy "owners select own products"
  on public.products for select
  using (owner_id = auth.uid());

create policy "owners insert own products"
  on public.products for insert
  with check (owner_id = auth.uid());

create policy "owners update own products"
  on public.products for update
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners delete own products"
  on public.products for delete
  using (owner_id = auth.uid());
