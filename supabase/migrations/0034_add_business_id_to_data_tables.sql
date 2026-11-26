-- MELA 0034: Add business_id to all core data tables for multi-business isolation.
alter table public.products          add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.sales             add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.expenses          add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.customers         add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.suppliers         add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.purchases         add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.inventory_movements add column if not exists business_id uuid references public.businesses(id) on delete cascade;
alter table public.income_entries    add column if not exists business_id uuid references public.businesses(id) on delete cascade;

create index if not exists products_business_id_idx            on public.products (business_id);
create index if not exists sales_business_id_idx               on public.sales (business_id);
create index if not exists expenses_business_id_idx            on public.expenses (business_id);
create index if not exists customers_business_id_idx           on public.customers (business_id);
create index if not exists suppliers_business_id_idx           on public.suppliers (business_id);
create index if not exists purchases_business_id_idx           on public.purchases (business_id);
create index if not exists inventory_movements_business_id_idx on public.inventory_movements (business_id);
create index if not exists income_entries_business_id_idx      on public.income_entries (business_id);
