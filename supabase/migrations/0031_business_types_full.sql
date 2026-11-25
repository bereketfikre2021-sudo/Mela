-- MELA 0031: Expand businesses.type check constraint to match all
-- BusinessType values defined in the frontend (types.ts / businessConfig.ts).
--
-- Previous constraint (0011) only allowed:
--   retail, fnb, bakery, service, cosmetics, salon
--
-- Missing types that cause error 23514 on insert:
--   fastfood, baltina, personal

alter table public.businesses
  drop constraint if exists businesses_type_check;

alter table public.businesses
  add constraint businesses_type_check
    check (type in (
      'retail',
      'fnb',
      'fastfood',
      'bakery',
      'service',
      'cosmetics',
      'salon',
      'baltina',
      'personal'
    ));
