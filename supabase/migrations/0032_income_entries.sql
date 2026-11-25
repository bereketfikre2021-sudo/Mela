-- MELA 0032: income_entries table for personal finance tracking.
--
-- Personal accounts record income (salary, freelance, rental, etc.)
-- here instead of using the sales/POS flow which is designed for
-- product-based businesses.

create table if not exists public.income_entries (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references auth.users(id) on delete cascade,
  source       text        not null
                             check (source in (
                               'salary', 'freelance', 'business',
                               'rental', 'gift', 'investment', 'other'
                             )),
  amount       numeric(12,2) not null check (amount > 0),
  note         text,
  received_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists income_entries_owner_received_idx
  on public.income_entries (owner_id, received_at desc);

drop trigger if exists income_entries_set_updated_at on public.income_entries;
create trigger income_entries_set_updated_at
  before update on public.income_entries
  for each row execute function public.set_updated_at();

alter table public.income_entries enable row level security;

create policy "owners select own income"
  on public.income_entries for select
  using (owner_id = auth.uid());

create policy "owners insert own income"
  on public.income_entries for insert
  with check (owner_id = auth.uid());

create policy "owners update own income"
  on public.income_entries for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners delete own income"
  on public.income_entries for delete
  using (owner_id = auth.uid());
