-- MELA 0028: Add barcode and image_url columns to products.
--
-- These were added to the TypeScript types and ProductForm but the DB
-- migration was never written, causing 400 errors on products queries.

alter table public.products
  add column if not exists barcode   text,
  add column if not exists image_url text;
