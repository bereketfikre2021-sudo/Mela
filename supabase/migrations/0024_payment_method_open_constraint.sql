-- MELA 0024: Remove hardcoded payment_method check constraint.
--
-- The constraint only allowed ('telebirr', 'cbe_birr', 'bank_transfer').
-- Now that payment methods are admin-configurable with custom IDs, any
-- non-empty string should be accepted. We keep a simple length check.

alter table public.payment_submissions
  drop constraint if exists payment_submissions_payment_method_check;

alter table public.payment_submissions
  add constraint payment_submissions_payment_method_check
    check (char_length(trim(payment_method)) >= 1);
