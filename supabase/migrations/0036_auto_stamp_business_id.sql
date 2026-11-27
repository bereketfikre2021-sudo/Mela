-- MELA 0036: Auto-stamp business_id on insert as a safety net.
--
-- If the app inserts a row without business_id (e.g. older code path,
-- offline sync, or any future regression), the trigger resolves it from
-- the user's active_business_id in user_profiles, falling back to their
-- oldest business. This ensures NO data is ever orphaned with NULL business_id.

create or replace function public.auto_stamp_business_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  -- Only act when business_id is not supplied
  if NEW.business_id is not null then
    return NEW;
  end if;

  -- Try user_profiles.active_business_id first
  select active_business_id into v_business_id
  from public.user_profiles
  where user_id = NEW.owner_id
  limit 1;

  -- Fallback: oldest business for this owner
  if v_business_id is null then
    select id into v_business_id
    from public.businesses
    where owner_id = NEW.owner_id
    order by created_at asc
    limit 1;
  end if;

  NEW.business_id := v_business_id;
  return NEW;
end;
$$;

-- Apply to all core data tables
drop trigger if exists trg_auto_stamp_business_id on public.products;
create trigger trg_auto_stamp_business_id
  before insert on public.products
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.sales;
create trigger trg_auto_stamp_business_id
  before insert on public.sales
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.expenses;
create trigger trg_auto_stamp_business_id
  before insert on public.expenses
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.customers;
create trigger trg_auto_stamp_business_id
  before insert on public.customers
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.suppliers;
create trigger trg_auto_stamp_business_id
  before insert on public.suppliers
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.purchases;
create trigger trg_auto_stamp_business_id
  before insert on public.purchases
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.inventory_movements;
create trigger trg_auto_stamp_business_id
  before insert on public.inventory_movements
  for each row execute function public.auto_stamp_business_id();

drop trigger if exists trg_auto_stamp_business_id on public.income_entries;
create trigger trg_auto_stamp_business_id
  before insert on public.income_entries
  for each row execute function public.auto_stamp_business_id();

-- Also stamp existing NULL rows now
update public.products p set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = p.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = p.owner_id
) where p.business_id is null;

update public.sales s set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = s.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = s.owner_id
) where s.business_id is null;

update public.expenses e set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = e.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = e.owner_id
) where e.business_id is null;

update public.customers c set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = c.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = c.owner_id
) where c.business_id is null;

update public.suppliers s set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = s.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = s.owner_id
) where s.business_id is null;

update public.purchases p set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = p.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = p.owner_id
) where p.business_id is null;

update public.inventory_movements i set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = i.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = i.owner_id
) where i.business_id is null;

update public.income_entries ie set business_id = (
  select coalesce(up.active_business_id, (select id from public.businesses where owner_id = ie.owner_id order by created_at asc limit 1))
  from public.user_profiles up where up.user_id = ie.owner_id
) where ie.business_id is null;
