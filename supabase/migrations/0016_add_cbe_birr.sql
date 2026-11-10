-- MELA: Add cbe_birr as a valid payment method.
-- Updates the CHECK constraint on sales.payment_method to include 'cbe_birr'.

alter table public.sales
  drop constraint if exists sales_payment_method_check;

alter table public.sales
  add constraint sales_payment_method_check
    check (payment_method in ('cash','telebirr','cbe_birr','bank_transfer'));
