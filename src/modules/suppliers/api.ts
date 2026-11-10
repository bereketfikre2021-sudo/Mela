import { supabase } from '../../lib/supabase'
import type { Supplier, SupplierInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getSuppliers(): Result<Supplier[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
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
