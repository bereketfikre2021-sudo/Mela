-- MELA Phase 12: Staff members, permissions, and activity log.
--
-- Design:
--  - Owner creates staff with a name + 4-digit PIN.
--  - Each staff member gets a synthetic Supabase Auth account created by the
--    create-staff-member Edge Function (service_role only — never the frontend).
--  - Permissions stored as jsonb on staff_members; role presets are defaults only,
--    owner can toggle any permission individually.
--  - activity_log records who performed key operations (NULL = owner acting directly).
--  - Staff is a Premium-only feature (max_staff = 0 on free, 999 on premium).
--  - Deactivated staff lose access immediately (their auth account is disabled via Edge Function).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add max_staff to plan_limits (migration 0013 created this table)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.plan_limits
  add column if not exists max_staff integer not null default 0;

update public.plan_limits set max_staff = 0   where plan = 'free';
update public.plan_limits set max_staff = 999 where plan = 'premium';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. staff_members
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.staff_members (
  id              uuid        primary key default gen_random_uuid(),
  owner_id        uuid        not null references auth.users(id)   on delete cascade,
  business_id     uuid        not null references public.businesses(id) on delete cascade,
  name            text        not null check (char_length(trim(name)) between 1 and 100),
  role            text        not null check (role in ('manager','cashier','inventory','accountant')),
  permissions     jsonb       not null default '{}',
  pin_hash        text        not null,           -- SHA-256 hex of the 4-digit PIN
  synthetic_email text        not null unique,    -- {slug}-{ts}.{biz_prefix}@mela.internal
  auth_user_id    uuid        unique,             -- set after Edge Function creates the Supabase Auth user
  status          text        not null default 'active'
                    check (status in ('active','deactivated')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists staff_owner_idx     on public.staff_members (owner_id);
create index if not exists staff_business_idx  on public.staff_members (business_id);
create index if not exists staff_email_idx     on public.staff_members (synthetic_email);

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
  before update on public.staff_members
  for each row execute function public.set_updated_at();

alter table public.staff_members enable row level security;

-- Owner can see and manage their own staff.
create policy "owners select own staff"
  on public.staff_members for select
  using (owner_id = auth.uid());

create policy "owners update own staff"
  on public.staff_members for update
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- INSERT is handled by the Edge Function (service_role bypasses RLS).
-- DELETE is handled by the delete_staff() RPC below.

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. activity_log
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.activity_log (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references auth.users(id)   on delete cascade,
  business_id  uuid        not null references public.businesses(id) on delete cascade,
  performed_by uuid        references public.staff_members(id) on delete set null,
  -- NULL = owner acted directly (pre-Phase-12 rows and owner-direct actions)
  action_type  text        not null
                 check (action_type in (
                   'sale','expense','stock_adjustment','purchase',
                   'sale_cancellation','staff_created','staff_deactivated','staff_deleted'
                 )),
  reference_id uuid,          -- sale_id, expense_id, etc.
  details      jsonb,          -- snapshot (amounts, product names, etc.)
  created_at   timestamptz not null default now()
);

create index if not exists activity_log_owner_date_idx
  on public.activity_log (owner_id, created_at desc);
create index if not exists activity_log_performed_by_idx
  on public.activity_log (owner_id, performed_by);
create index if not exists activity_log_action_type_idx
  on public.activity_log (owner_id, action_type);

alter table public.activity_log enable row level security;

-- Owner can read all activity logs for their business.
create policy "owners select own activity log"
  on public.activity_log for select
  using (owner_id = auth.uid());

-- Logs are written only by RPCs (security definer). No direct client insert.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Helper: add_activity_log()
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.add_activity_log(
  p_owner_id     uuid,
  p_business_id  uuid,
  p_performed_by uuid,
  p_action_type  text,
  p_reference_id uuid  default null,
  p_details      jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_log
    (owner_id, business_id, performed_by, action_type, reference_id, details)
  values
    (p_owner_id, p_business_id, p_performed_by, p_action_type, p_reference_id, p_details);
end;
$$;

grant execute on function public.add_activity_log(uuid,uuid,uuid,text,uuid,jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. check_staff_limit()
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.check_staff_limit(p_owner_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_max   int;
begin
  select count(*) into v_count
  from public.staff_members
  where owner_id = p_owner_id and status = 'active';

  select max_staff into v_max
  from public.plan_limits
  where plan = public.get_effective_plan(p_owner_id);

  return v_count < v_max;
end;
$$;

grant execute on function public.check_staff_limit(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. check_staff_permission()
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.check_staff_permission(
  p_owner_id   uuid,
  p_staff_id   uuid,
  p_permission text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select owner_id, status, permissions
    into v_row
  from public.staff_members
  where id = p_staff_id;

  if not found then return false; end if;
  if v_row.owner_id <> p_owner_id then return false; end if;
  if v_row.status <> 'active' then return false; end if;

  return coalesce((v_row.permissions ->> p_permission)::boolean, false);
end;
$$;

grant execute on function public.check_staff_permission(uuid,uuid,text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. get_default_permissions()
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.get_default_permissions(p_role text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  case p_role
    when 'manager' then
      return jsonb_build_object(
        'pos',                      true,
        'cancel_sale',              true,
        'manage_products',          true,
        'stock_adjustments',        true,
        'receive_purchases',        true,
        'manage_customers',         true,
        'manage_suppliers',         true,
        'manage_expenses',          true,
        'view_reports',             true,
        'manage_staff',             false,
        'manage_subscription',      false,
        'manage_business_settings', false
      );
    when 'cashier' then
      return jsonb_build_object(
        'pos',                      true,
        'cancel_sale',              false,
        'manage_products',          false,
        'stock_adjustments',        false,
        'receive_purchases',        false,
        'manage_customers',         true,
        'manage_suppliers',         false,
        'manage_expenses',          false,
        'view_reports',             false,
        'manage_staff',             false,
        'manage_subscription',      false,
        'manage_business_settings', false
      );
    when 'inventory' then
      return jsonb_build_object(
        'pos',                      false,
        'cancel_sale',              false,
        'manage_products',          true,
        'stock_adjustments',        true,
        'receive_purchases',        true,
        'manage_customers',         false,
        'manage_suppliers',         true,
        'manage_expenses',          false,
        'view_reports',             false,
        'manage_staff',             false,
        'manage_subscription',      false,
        'manage_business_settings', false
      );
    when 'accountant' then
      return jsonb_build_object(
        'pos',                      false,
        'cancel_sale',              false,
        'manage_products',          false,
        'stock_adjustments',        false,
        'receive_purchases',        false,
        'manage_customers',         false,
        'manage_suppliers',         false,
        'manage_expenses',          true,
        'view_reports',             true,
        'manage_staff',             false,
        'manage_subscription',      false,
        'manage_business_settings', false
      );
    else
      -- Unknown role: deny everything
      return jsonb_build_object(
        'pos',                      false,
        'cancel_sale',              false,
        'manage_products',          false,
        'stock_adjustments',        false,
        'receive_purchases',        false,
        'manage_customers',         false,
        'manage_suppliers',         false,
        'manage_expenses',          false,
        'view_reports',             false,
        'manage_staff',             false,
        'manage_subscription',      false,
        'manage_business_settings', false
      );
  end case;
end;
$$;

grant execute on function public.get_default_permissions(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. deactivate_staff() RPC
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.deactivate_staff(
  p_owner_id  uuid,
  p_staff_id  uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff record;
  v_biz   record;
begin
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  select * into v_staff
  from public.staff_members
  where id = p_staff_id and owner_id = p_owner_id;

  if not found then
    raise exception 'Staff member not found';
  end if;

  if v_staff.status = 'deactivated' then
    return; -- idempotent
  end if;

  update public.staff_members
  set status = 'deactivated'
  where id = p_staff_id and owner_id = p_owner_id;

  -- Log the action
  select id into v_biz from public.businesses where owner_id = p_owner_id limit 1;
  perform public.add_activity_log(
    p_owner_id, v_biz.id, null,
    'staff_deactivated', p_staff_id,
    jsonb_build_object('staff_name', v_staff.name, 'role', v_staff.role)
  );
end;
$$;

revoke execute on function public.deactivate_staff(uuid,uuid) from public;
grant  execute on function public.deactivate_staff(uuid,uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. reactivate_staff() RPC
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.reactivate_staff(
  p_owner_id uuid,
  p_staff_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- Check staff limit before reactivating
  if not public.check_staff_limit(p_owner_id) then
    raise exception 'Staff limit reached for your plan';
  end if;

  update public.staff_members
  set status = 'active'
  where id = p_staff_id and owner_id = p_owner_id;

  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

revoke execute on function public.reactivate_staff(uuid,uuid) from public;
grant  execute on function public.reactivate_staff(uuid,uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. delete_staff() RPC
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_staff(
  p_owner_id uuid,
  p_staff_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff record;
  v_biz   record;
begin
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  select * into v_staff
  from public.staff_members
  where id = p_staff_id and owner_id = p_owner_id;

  if not found then
    raise exception 'Staff member not found';
  end if;

  -- Log before delete so performed_by ref is still valid
  select id into v_biz from public.businesses where owner_id = p_owner_id limit 1;
  perform public.add_activity_log(
    p_owner_id, v_biz.id, null,
    'staff_deleted', p_staff_id,
    jsonb_build_object('staff_name', v_staff.name, 'role', v_staff.role)
  );

  delete from public.staff_members
  where id = p_staff_id and owner_id = p_owner_id;
end;
$$;

revoke execute on function public.delete_staff(uuid,uuid) from public;
grant  execute on function public.delete_staff(uuid,uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. update_staff_permissions() RPC
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.update_staff_permissions(
  p_owner_id    uuid,
  p_staff_id    uuid,
  p_permissions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  update public.staff_members
  set permissions = p_permissions
  where id = p_staff_id and owner_id = p_owner_id;

  if not found then
    raise exception 'Staff member not found';
  end if;
end;
$$;

revoke execute on function public.update_staff_permissions(uuid,uuid,jsonb) from public;
grant  execute on function public.update_staff_permissions(uuid,uuid,jsonb) to authenticated;
