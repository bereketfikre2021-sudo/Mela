-- MELA Phase 6.4: add low_stock_threshold to products.
--
-- low_stock_threshold is nullable; NULL means "no threshold configured"
-- (treated as disabled). A value of 0 is also treated as disabled.
-- Products are considered low-stock when:
--   low_stock_threshold > 0 AND stock_quantity <= low_stock_threshold

alter table public.products
  add column if not exists low_stock_threshold numeric(12,3)
    check (low_stock_threshold is null or low_stock_threshold >= 0);

-- No RLS change needed — products already has owner-scoped RLS.
-- No trigger change needed — set_updated_at() already fires on any UPDATE.
