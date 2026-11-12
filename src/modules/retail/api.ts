/**
 * Retail data access — Phase 2.1.
 *
 * Thin wrappers over the shared Supabase anon-key client.
 * All queries are owner-scoped by RLS (owner_id = auth.uid()).
 * The client is null when env vars are not configured; each function
 * returns a clear error in that case.
 */
import { supabase } from '../../lib/supabase'
import type { Product, ProductInput } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/** Fetch all products for the authenticated owner, newest first. */
export async function getProducts(): Result<Product[]> {
  if (!supabase) return noClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], error: null }
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('owner_id', user.id)          // explicit filter — defence-in-depth on top of RLS
    .order('created_at', { ascending: false })
    .limit(10000)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Product[]) ?? [], error: null }
}

/** Create a new product. owner_id is injected server-side via RLS + auth.uid(). */
export async function createProduct(
  input: ProductInput,
  ownerId: string
): Result<Product> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('products')
    .insert({ ...input, owner_id: ownerId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Product, error: null }
}

/** Update an existing product, scoped by id + owner_id. */
export async function updateProduct(
  id: string,
  patch: Partial<ProductInput>,
  ownerId: string
): Result<Product> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Product, error: null }
}

/** Delete a product, scoped by id + owner_id. */
export async function deleteProduct(
  id: string,
  ownerId: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured.' } }
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
  return { error: error ? { message: error.message } : null }
}
