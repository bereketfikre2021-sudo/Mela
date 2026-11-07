-- MELA Phase 3.1: expenses table + row-level security.
-- Each expense row is owned by the business owner (owner_id = auth.users.id).
-- Prices are always server-supplied ETB values; categories are free-text
-- constrained to a fixed allowed list at the application layer.

create table if not exists public.expenses (
  id           uuid          primary key default gen_random_uuid(),
  owner_id     uuid          not null references auth.users(id) on delete cascade,
  title        text          not null check (char_length(trim(title)) between 1 and 200),
  amount       numeric(12,2) not null check (amount > 0),
  category     text          not null check (char_length(trim(category)) between 1 and 50),
  description  text          check (description is null or char_length(trim(description)) <= 500),
  expense_date date          not null default current_date,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

-- Fast owner-scoped queries
create index if not exists expenses_owner_id_idx
  on public.expenses (owner_id);

-- Date-range queries (newest-first default)
create index if not exists expenses_owner_date_idx
  on public.expenses (owner_id, expense_date desc);

-- Category filter
create index if not exists expenses_owner_category_idx
  on public.expenses (owner_id, category);

-- Reuse the trigger function created in migration 0001.
drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- Row-level security: owners can only access their own expenses.
alter table public.expenses enable row level security;

create policy "owners select own expenses"
  on public.expenses for select
  using (owner_id = auth.uid());

create policy "owners insert own expenses"
  on public.expenses for insert
  with check (owner_id = auth.uid());

create policy "owners update own expenses"
  on public.expenses for update
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners delete own expenses"
  on public.expenses for delete
  using (owner_id = auth.uid());
