-- MELA 0021: Restore admin SELECT bypass policies.
--
-- Migration 0019 dropped these because the admin was using the same anon-key
-- client as the customer app, causing data leakage. That issue is now resolved:
-- the admin panel loads in a completely separate React tree only when
-- window.location.pathname starts with /admin, and the customer-facing pages
-- never query these tables cross-owner.
--
-- Restoring these policies lets the admin use the anon-key client for reads
-- (authenticated as an admin user), eliminating the need for VITE_SUPABASE_SERVICE_ROLE_KEY
-- in the browser bundle.

create policy if not exists "admin select all businesses"
  on public.businesses for select using (public.is_admin());

create policy if not exists "admin select all products"
  on public.products for select using (public.is_admin());

create policy if not exists "admin select all sales"
  on public.sales for select using (public.is_admin());

create policy if not exists "admin select all sale items"
  on public.sale_items for select using (public.is_admin());

create policy if not exists "admin select all expenses"
  on public.expenses for select using (public.is_admin());

create policy if not exists "admin select all customers"
  on public.customers for select using (public.is_admin());

create policy if not exists "admin select all suppliers"
  on public.suppliers for select using (public.is_admin());

create policy if not exists "admin select all inventory"
  on public.inventory_movements for select using (public.is_admin());

create policy if not exists "admin select all purchases"
  on public.purchases for select using (public.is_admin());

create policy if not exists "admin select all purchase items"
  on public.purchase_items for select using (public.is_admin());

create policy if not exists "admin select all subscriptions"
  on public.subscriptions for select using (public.is_admin());

create policy if not exists "admin select all payment submissions"
  on public.payment_submissions for select using (public.is_admin());

create policy if not exists "admin select all staff"
  on public.staff_members for select using (public.is_admin());

create policy if not exists "admin select all activity log"
  on public.activity_log for select using (public.is_admin());
