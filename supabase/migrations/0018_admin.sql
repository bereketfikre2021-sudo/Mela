-- MELA 0018: Admin panel foundation.
-- Creates admin_users, site_settings, is_admin() helper,
-- admin-bypass SELECT policies on all tables, and admin-editable UPDATE policies.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. admin_users — email allow-list; rows inserted via SQL editor or seed script
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.admin_users (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users(id) on delete cascade,
  email      text        not null,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "admin users can read own row"
  on public.admin_users for select
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. site_settings — operator-configurable key/value store
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('payment_telebirr_name',     ''),
  ('payment_telebirr_number',   ''),
  ('payment_cbe_birr_name',     ''),
  ('payment_cbe_birr_number',   ''),
  ('payment_bank_name',         ''),
  ('payment_bank_account_name', ''),
  ('payment_bank_account_num',  ''),
  ('plan_premium_monthly_etb',  '299'),
  ('plan_premium_yearly_etb',   '2499'),
  ('feature_flag_staff',        'true'),
  ('feature_flag_pos',          'true'),
  ('app_announcement',          ''),
  ('payment_methods_json',      '')   -- populated via admin Payment Methods page
on conflict (key) do nothing;

alter table public.site_settings enable row level security;

create policy "authenticated read site settings"
  on public.site_settings for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. is_admin() helper — used in RLS policies below
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  return exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
end;
$$;

grant execute on function public.is_admin() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin-bypass SELECT policies on all owner-scoped tables
-- ─────────────────────────────────────────────────────────────────────────────
create policy "admin select all businesses"         on public.businesses         for select using (public.is_admin());
create policy "admin select all products"           on public.products           for select using (public.is_admin());
create policy "admin select all sales"              on public.sales              for select using (public.is_admin());
create policy "admin select all sale items"         on public.sale_items         for select using (public.is_admin());
create policy "admin select all expenses"           on public.expenses           for select using (public.is_admin());
create policy "admin select all customers"          on public.customers          for select using (public.is_admin());
create policy "admin select all suppliers"          on public.suppliers          for select using (public.is_admin());
create policy "admin select all inventory"          on public.inventory_movements for select using (public.is_admin());
create policy "admin select all purchases"          on public.purchases          for select using (public.is_admin());
create policy "admin select all purchase items"     on public.purchase_items     for select using (public.is_admin());
create policy "admin select all subscriptions"      on public.subscriptions      for select using (public.is_admin());
create policy "admin select all payment submissions" on public.payment_submissions for select using (public.is_admin());
create policy "admin select all staff"              on public.staff_members      for select using (public.is_admin());
create policy "admin select all activity log"       on public.activity_log       for select using (public.is_admin());

-- Admin can update payment_submissions (reject)
create policy "admin update payment submissions"
  on public.payment_submissions for update
  using (public.is_admin()) with check (public.is_admin());

-- Admin can update subscriptions (override plan/status)
create policy "admin update subscriptions"
  on public.subscriptions for update
  using (public.is_admin()) with check (public.is_admin());

-- Admin can update plan_limits
create policy "admin update plan limits"
  on public.plan_limits for update
  using (public.is_admin()) with check (public.is_admin());

-- Admin can update site_settings
create policy "admin update site settings"
  on public.site_settings for update
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. reject_payment_submission() — admin rejects pending payment
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.reject_payment_submission(
  p_submission_id  uuid,
  p_reviewer_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  update public.payment_submissions
  set status         = 'rejected',
      reviewed_at    = now(),
      reviewer_notes = p_reviewer_notes
  where id = p_submission_id and status = 'pending';

  if not found then
    raise exception 'Submission not found or already reviewed';
  end if;
end;
$$;

grant execute on function public.reject_payment_submission(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Seed admin user — replace with real UUID after first Google sign-in
-- Run manually in SQL editor: INSERT INTO admin_users (user_id, email) VALUES ('<uuid>', '<email>');
-- ─────────────────────────────────────────────────────────────────────────────
-- (No seed here — admin inserts their own row manually)
