-- MELA 0025: Add screenshot_url column to payment_submissions.
--
-- Previously the app only stored the filename as transaction_reference.
-- Now screenshots are uploaded to Supabase Storage bucket 'payment-screenshots'
-- and the public URL is stored here.

alter table public.payment_submissions
  add column if not exists screenshot_url text;
