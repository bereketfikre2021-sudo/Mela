-- MELA Phase 6.1: customers and suppliers tables with row-level security.
-- Both tables follow the same pattern as businesses and expenses:
-- owner_id references auth.users, RLS enforces per-owner isolation.

-- ── customers ─────────────────────────────────────────────────────────────────

create table if not exists public.customers (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users(id) on delete cascade,
  name       text        not null check (char_length(trim(name)) between 1 and 200),
  phone      text        check (phone is null or char_length(trim(phone)) between 5 and 30),
  email      text        check (email is null or char_length(trim(email)) <= 200),
  address    text        check (address is null or char_length(trim(address)) <= 500),
  notes      text        check (notes is null or char_length(trim(notes)) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_owner_id_idx
  on public.customers (owner_id);

-- Fast name + phone search per owner
create index if not exists customers_owner_name_idx
  on public.customers (owner_id, lower(name));

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

create policy "owners select own customers"
  on public.customers for select using (owner_id = auth.uid());
create policy "owners insert own customers"
  on public.customers for insert with check (owner_id = auth.uid());
create policy "owners update own customers"
  on public.customers for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete own customers"
  on public.customers for delete using (owner_id = auth.uid());

-- ── suppliers ─────────────────────────────────────────────────────────────────

create table if not exists public.suppliers (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null references auth.users(id) on delete cascade,
  name       text        not null check (char_length(trim(name)) between 1 and 200),
  phone      text        check (phone is null or char_length(trim(phone)) between 5 and 30),
  email      text        check (email is null or char_length(trim(email)) <= 200),
  address    text        check (address is null or char_length(trim(address)) <= 500),
  notes      text        check (notes is null or char_length(trim(notes)) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_owner_id_idx
  on public.suppliers (owner_id);

create index if not exists suppliers_owner_name_idx
  on public.suppliers (owner_id, lower(name));

drop trigger if exists suppliers_set_updated_at on public.suppliers;
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

alter table public.suppliers enable row level security;

create policy "owners select own suppliers"
  on public.suppliers for select using (owner_id = auth.uid());
create policy "owners insert own suppliers"
  on public.suppliers for insert with check (owner_id = auth.uid());
create policy "owners update own suppliers"
  on public.suppliers for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete own suppliers"
  on public.suppliers for delete using (owner_id = auth.uid());
