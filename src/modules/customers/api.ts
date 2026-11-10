import { supabase } from '../../lib/supabase'
import type { Customer, CustomerInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

export async function getCustomers(): Result<Customer[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
    .limit(10000)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Customer[]) ?? [], error: null }
}

export async function createCustomer(input: CustomerInput, ownerId: string): Result<Customer> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...input, owner_id: ownerId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Customer, error: null }
}

export async function updateCustomer(id: string, patch: Partial<CustomerInput>, ownerId: string): Result<Customer> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('customers')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Customer, error: null }
}

export async function deleteCustomer(id: string, ownerId: string): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured.' } }
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
  return { error: error ? { message: error.message } : null }
}
