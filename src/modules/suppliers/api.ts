import { supabase } from '../../lib/supabase'
import type { Supplier, SupplierInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getSuppliers(): Result<Supplier[]> {
  if (!supabase) return noClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('owner_id', user.id)
    .order('name', { ascending: true })
    .limit(10000)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Supplier[]) ?? [], error: null }
}

export async function createSupplier(input: SupplierInput, ownerId: string): Result<Supplier> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...input, owner_id: ownerId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Supplier, error: null }
}

export async function updateSupplier(id: string, patch: Partial<SupplierInput>, ownerId: string): Result<Supplier> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('suppliers')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Supplier, error: null }
}

export async function deleteSupplier(id: string, ownerId: string): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured.' } }
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
  return { error: error ? { message: error.message } : null }
}

// ── Supplier outstanding balances (F2) ─────────────────────────────────────────
// One query over purchases; outstanding = Σ (total_cost − amount_paid) for each
// supplier's not-fully-paid purchases. Purchases are inventory acquisitions, not
// expenses, so this never touches the expenses table.

export interface SupplierOutstanding {
  supplierId: string
  amount: number
}

export async function getSupplierOutstanding(): Result<SupplierOutstanding[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('purchases')
    .select('supplier_id, total_cost, amount_paid')
    .not('supplier_id', 'is', null)
    .limit(10000)
  if (error) return { data: null, error: { message: error.message } }
  const rows = (data as { supplier_id: string; total_cost: number; amount_paid: number }[]) ?? []
  const map = new Map<string, number>()
  for (const r of rows) {
    const balance = (r.total_cost ?? 0) - (r.amount_paid ?? 0)
    if (balance > 0) {
      map.set(r.supplier_id, (map.get(r.supplier_id) ?? 0) + balance)
    }
  }
  return { data: [...map.entries()].map(([supplierId, amount]) => ({ supplierId, amount })), error: null }
}
