-- MELA 0023: Fix site_settings for admin upsert.
--
-- PROBLEM: The admin Payment Methods page saves payment_methods_json via
-- an upsert, but site_settings only had an UPDATE policy for admins — no
-- INSERT policy. When the row doesn't exist (payment_methods_json was never
-- seeded in production), the upsert's INSERT half is blocked by RLS and
-- silently does nothing.
--
-- FIX:
--   1. Add an INSERT policy so admins can insert new setting rows.
--   2. Ensure payment_methods_json row exists with an empty default.

-- 1. Admin INSERT policy on site_settings
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'site_settings'
    and policyname = 'admin insert site settings'
  ) then
    execute 'create policy "admin insert site settings"
      on public.site_settings for insert
      to authenticated
      with check (public.is_admin())';
  end if;
end$$;

-- 2. Ensure the payment_methods_json row exists (idempotent)
insert into public.site_settings (key, value, updated_at)
values ('payment_methods_json', '', now())
on conflict (key) do nothing;
