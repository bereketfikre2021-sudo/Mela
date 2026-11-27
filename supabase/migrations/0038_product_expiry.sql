-- MELA 0038: Product expiry date + advance warning.
--
-- expiry_date:        optional YYYY-MM-DD
-- expiry_warning_days: how many days before expiry to start warning (default 30)

alter table public.products
  add column if not exists expiry_date          date,
  add column if not exists expiry_warning_days  int default 30;
