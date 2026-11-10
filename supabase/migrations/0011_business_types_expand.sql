-- MELA Phase 9: expand allowed business_type values.
-- Adds 'cosmetics' and 'salon' to the existing check constraint on businesses.type.
-- Existing rows ('retail','fnb','bakery','service') are preserved unchanged.

alter table public.businesses
  drop constraint if exists businesses_type_check;

alter table public.businesses
  add constraint businesses_type_check
    check (type in ('retail','fnb','bakery','service','cosmetics','salon'));
