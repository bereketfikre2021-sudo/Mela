/**
 * Expense data access — Phase 3.1.
 *
 * Thin wrappers over the shared Supabase anon-key client.
 * All queries are owner-scoped by RLS (owner_id = auth.uid()).
 */
import { supabase } from '../../lib/supabase'
import type { Expense, ExpenseInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/** Fetch all expenses for the authenticated owner, newest-date first. */
export async function getExpenses(): Result<Expense[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Expense[]) ?? [], error: null }
}

/** Create a new expense. owner_id is enforced server-side by RLS. */
export async function createExpense(
  input: ExpenseInput,
  ownerId: string
): Result<Expense> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...input, owner_id: ownerId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Expense, error: null }
}

/** Update an existing expense, scoped by id + owner_id. */
export async function updateExpense(
  id: string,
  patch: Partial<ExpenseInput>,
  ownerId: string
): Result<Expense> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Expense, error: null }
}

/** Delete an expense, scoped by id + owner_id. */
export async function deleteExpense(
  id: string,
  ownerId: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured.' } }
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
  return { error: error ? { message: error.message } : null }
}
