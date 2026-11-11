-- MELA F2: supplier payments — track purchase payment status, supplier
-- outstanding balances, partial supplier payments and payment history.
--
-- Inventory purchases remain separate from operating expenses. Recording a
-- supplier payment never creates an expense or a new purchase; it only records
-- a cash/bank outflow (supplier_payments) and reduces the purchase balance.
-- COGS continues to be recognised only when inventory is sold (via the existing
-- sale_items.unit_cost snapshot); purchases are not expensed here.
--
-- NOTE: authored, not applied. Apply to the Supabase project only with approval.

-- 1. Track how much of each purchase has been paid. Payment status and balance
--    are derived from amount_paid vs total_cost (computed in the UI / queries),
--    so there is no redundant status column to keep in sync.
alter table public.purchases
  add column if not exists amount_paid numeric(12,2) not null default 0
    check (amount_paid >= 0 and amount_paid <= total_cost);

-- 2. Immutable supplier payment ledger.
create table if not exists public.supplier_payments (
  id              uuid          primary key default gen_random_uuid(),
  owner_id        uuid          not null references auth.users(id) on delete cascade,
  purchase_id     uuid          not null references public.purchases(id) on delete cascade,
  supplier_id     uuid          references public.suppliers(id) on delete set null,
  supplier_name   text          not null,                       -- snapshot from the purchase
  amount          numeric(12,2) not null check (amount > 0),
  payment_method  text          not null check (payment_method in ('cash','telebirr','cbe_birr','bank_transfer')),
  payment_date    date          not null default current_date,
  note            text          check (note is null or char_length(trim(note)) <= 1000),
  idempotency_key uuid          not null default gen_random_uuid(),
  created_at      timestamptz   not null default now()
);

create unique index if not exists supplier_payments_owner_idempotency_key
  on public.supplier_payments (owner_id, idempotency_key);
create index if not exists supplier_payments_owner_idx
  on public.supplier_payments (owner_id);
create index if not exists supplier_payments_purchase_idx
  on public.supplier_payments (purchase_id);

alter table public.supplier_payments enable row level security;

-- Ledger is append-only: owners may select and insert; updates and deletes are
-- denied to preserve payment history and prevent tampering / duplicate edits.
create policy "owners select own supplier payments"
  on public.supplier_payments for select using (owner_id = auth.uid());
create policy "owners insert own supplier payments"
  on public.supplier_payments for insert with check (owner_id = auth.uid());
-- No update / delete policies ⇒ RLS denies both ⇒ immutable ledger.

-- 3. Atomic, idempotent payment recording.
--    - Idempotency key dedupes replays (never a duplicate payment).
--    - Locks the purchase, caps the payment at the remaining balance.
--    - Inserts supplier_payments (the outflow) and reduces purchases.amount_paid.
--    - Never writes to expenses and never inserts a new purchase.
create or replace function public.record_supplier_payment(
  p_owner_id        uuid,
  p_purchase_id     uuid,
  p_amount          numeric(12,2),
  p_payment_method  text,
  p_payment_date    date,
  p_note            text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_purchase   public.purchases%rowtype;
  v_balance    numeric(12,2);
  v_new_paid   numeric(12,2);
  v_existing   public.supplier_payments%rowtype;
begin
  -- 1. Caller must be the authenticated owner.
  if auth.uid() is null or auth.uid() <> p_owner_id then
    raise exception 'Unauthorized';
  end if;

  -- 2. Idempotency: a replay of the same key returns the original result.
  select * into v_existing
  from public.supplier_payments
  where owner_id = p_owner_id and idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'payment_id',     v_existing.id,
      'purchase_id',    v_existing.purchase_id,
      'amount_paid',    null,
      'balance_due',    null,
      'already_exists', true
    );
  end if;

  -- 3. Validate amount + method.
  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_payment_method not in ('cash','telebirr','cbe_birr','bank_transfer') then
    raise exception 'Invalid payment method';
  end if;

  -- 4. Lock the purchase, validate ownership + remaining balance.
  select * into v_purchase
  from public.purchases
  where id = p_purchase_id and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Purchase not found or not owned by caller';
  end if;

  v_balance := v_purchase.total_cost - v_purchase.amount_paid;

  if v_balance <= 0 then
    raise exception 'This purchase is already fully paid';
  end if;

  if p_amount > v_balance then
    raise exception 'Payment exceeds outstanding balance';
  end if;

  v_new_paid := v_purchase.amount_paid + p_amount;

  -- 5. Record the outflow (never an expense, never a new purchase).
  insert into public.supplier_payments
    (owner_id, purchase_id, supplier_id, supplier_name, amount, payment_method, payment_date, note, idempotency_key)
  values
    (p_owner_id, v_purchase.id, v_purchase.supplier_id, v_purchase.supplier_name, p_amount, p_payment_method, p_payment_date, p_note, p_idempotency_key)
  returning id into v_payment_id;

  -- 6. Reduce the purchase balance.
  update public.purchases
  set amount_paid = v_new_paid
  where id = v_purchase.id;

  return jsonb_build_object(
    'payment_id',     v_payment_id,
    'purchase_id',    v_purchase.id,
    'amount_paid',    v_new_paid,
    'balance_due',    v_purchase.total_cost - v_new_paid,
    'already_exists', false
  );
end;
$$;

revoke execute on function public.record_supplier_payment(uuid,uuid,numeric,text,date,text,uuid) from public;
grant  execute on function public.record_supplier_payment(uuid,uuid,numeric,text,date,text,uuid) to authenticated;
