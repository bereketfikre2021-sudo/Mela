-- MELA 0019: Fix admin RLS leak.
--
-- PROBLEM: Migration 0018 added is_admin() SELECT policies on all customer
-- tables (expenses, customers, suppliers, etc.). This means any user in
-- admin_users who logs into the CUSTOMER-FACING app sees ALL users' data
-- because the anon-key client triggers these policies.
--
-- ROOT CAUSE: Admin cross-owner reads should use the service-role client
-- (which bypasses ALL RLS), not custom policies on the anon-key client.
--
-- FIX: Drop the admin SELECT bypass policies from all customer-data tables.
-- Keep only the policies needed for admin writes (reject payments, update
-- subscriptions/plan_limits/site_settings) since those genuinely need
-- an authenticated call with is_admin() check.
-- The admin panel API layer already uses adminSupabase (service-role) for
-- all cross-owner reads, so these policies were never needed.

-- ── Drop admin SELECT bypass policies from customer-data tables ───────────────

drop policy if exists "admin select all businesses"          on public.businesses;
drop policy if exists "admin select all products"            on public.products;
drop policy if exists "admin select all sales"               on public.sales;
drop policy if exists "admin select all sale items"          on public.sale_items;
drop policy if exists "admin select all expenses"            on public.expenses;
drop policy if exists "admin select all customers"           on public.customers;
drop policy if exists "admin select all suppliers"           on public.suppliers;
drop policy if exists "admin select all inventory"           on public.inventory_movements;
drop policy if exists "admin select all purchases"           on public.purchases;
drop policy if exists "admin select all purchase items"      on public.purchase_items;
drop policy if exists "admin select all subscriptions"       on public.subscriptions;
drop policy if exists "admin select all payment submissions"  on public.payment_submissions;
drop policy if exists "admin select all staff"               on public.staff_members;
drop policy if exists "admin select all activity log"        on public.activity_log;

-- Keep the write policies — these are safe because they require is_admin()
-- AND are only called from the admin panel (not from customer-facing code):
-- "admin update payment submissions"
-- "admin update subscriptions"
-- "admin update plan limits"
-- "admin update site settings"
-- These do NOT return data to the customer app — they only allow targeted
-- UPDATE operations that the admin panel explicitly triggers.

-- Verify: after running this migration, signing into the customer app with
-- an admin email should show only that admin's OWN business data.
