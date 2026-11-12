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
--
-- NOTE: Uses DO blocks because CREATE POLICY IF NOT EXISTS is not supported
-- on all Postgres versions used by Supabase.

do $$ begin
  if not exists (select 1 from pg_policies where tablename='businesses' and policyname='admin select all businesses') then
    execute 'create policy "admin select all businesses" on public.businesses for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='products' and policyname='admin select all products') then
    execute 'create policy "admin select all products" on public.products for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='sales' and policyname='admin select all sales') then
    execute 'create policy "admin select all sales" on public.sales for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='sale_items' and policyname='admin select all sale items') then
    execute 'create policy "admin select all sale items" on public.sale_items for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='expenses' and policyname='admin select all expenses') then
    execute 'create policy "admin select all expenses" on public.expenses for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='customers' and policyname='admin select all customers') then
    execute 'create policy "admin select all customers" on public.customers for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='suppliers' and policyname='admin select all suppliers') then
    execute 'create policy "admin select all suppliers" on public.suppliers for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='inventory_movements' and policyname='admin select all inventory') then
    execute 'create policy "admin select all inventory" on public.inventory_movements for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='purchases' and policyname='admin select all purchases') then
    execute 'create policy "admin select all purchases" on public.purchases for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='purchase_items' and policyname='admin select all purchase items') then
    execute 'create policy "admin select all purchase items" on public.purchase_items for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='subscriptions' and policyname='admin select all subscriptions') then
    execute 'create policy "admin select all subscriptions" on public.subscriptions for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='payment_submissions' and policyname='admin select all payment submissions') then
    execute 'create policy "admin select all payment submissions" on public.payment_submissions for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='staff_members' and policyname='admin select all staff') then
    execute 'create policy "admin select all staff" on public.staff_members for select using (public.is_admin())';
  end if;
end$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='activity_log' and policyname='admin select all activity log') then
    execute 'create policy "admin select all activity log" on public.activity_log for select using (public.is_admin())';
  end if;
end$$;
