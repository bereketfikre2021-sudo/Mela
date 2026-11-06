-- MELA Phase 1: business profile + row-level security.
-- Phase 1 = a single business per owner. An owner can only access their own row.

create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 2 and 100),
  type        text not null check (type in ('retail', 'fnb', 'bakery', 'service')),
  owner_name  text not null check (char_length(trim(owner_name)) between 2 and 100),
  phone       text not null check (char_length(trim(phone)) between 7 and 20),
  language    text not null default 'en' check (language in ('en', 'am')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Phase 1: exactly one business per owner (DB-enforced).
create unique index if not exists businesses_owner_id_key
  on public.businesses (owner_id);

-- Keep updated_at current.
create or replace function public.set_updated_at()
  returns trigger language plpgsql as $$
  begin
    new.updated_at := now();
    return new;
  end;
  $$;

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- Row-level security: an owner can only access their own business row.
alter table public.businesses enable row level security;

create policy "owners select own business"
  on public.businesses for select
  using (owner_id = auth.uid());

create policy "owners insert own business"
  on public.businesses for insert
  with check (owner_id = auth.uid());

create policy "owners update own business"
  on public.businesses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owners delete own business"
  on public.businesses for delete
  using (owner_id = auth.uid());
