import { supabase } from '../../lib/supabase'
import type { Expense, ExpenseInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>
function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getExpenses(businessId?: string): Result<Expense[]> {
  if (!supabase) return noClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  let q = supabase.from('expenses').select('*').eq('owner_id', user.id).order('expense_date', { ascending: false }).order('created_at', { ascending: false }).limit(10000)
  if (businessId) q = q.eq('business_id', businessId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Expense[]) ?? [], error: null }
}

export async function createExpense(input: ExpenseInput, ownerId: string, businessId?: string): Result<Expense> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.from('expenses').insert({ ...input, owner_id: ownerId, ...(businessId ? { business_id: businessId } : {}) }).select('*').single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Expense, error: null }
}

export async function updateExpense(id: string, patch: Partial<ExpenseInput>, ownerId: string): Result<Expense> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.from('expenses').update(patch).eq('id', id).eq('owner_id', ownerId).select('*').single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Expense, error: null }
}

export async function deleteExpense(id: string, ownerId: string): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured.' } }
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('owner_id', ownerId)
  return { error: error ? { message: error.message } : null }
}
