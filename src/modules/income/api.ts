/**
 * Income data access — personal finance.
 */
import { supabase } from '../../lib/supabase'
import type { IncomeEntry, IncomeInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/** Fetch all income entries for the authenticated owner, newest first. */
export async function getIncomeEntries(): Result<IncomeEntry[]> {
  if (!supabase) return noClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  const { data, error } = await supabase
    .from('income_entries')
    .select('*')
    .eq('owner_id', user.id)
    .order('received_at', { ascending: false })
    .limit(1000)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as IncomeEntry[]) ?? [], error: null }
}

/** Record a new income entry. */
export async function createIncomeEntry(
  input: IncomeInput,
  ownerId: string
): Result<IncomeEntry> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('income_entries')
    .insert({ ...input, owner_id: ownerId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as IncomeEntry, error: null }
}

/** Delete an income entry. */
export async function deleteIncomeEntry(
  id: string,
  ownerId: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured.' } }
  const { error } = await supabase
    .from('income_entries')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
  return { error: error ? { message: error.message } : null }
}
