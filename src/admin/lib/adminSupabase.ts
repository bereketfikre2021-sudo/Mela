/**
 * Admin Supabase client — uses the service-role key.
 * This file must ONLY be imported from src/admin/.
 * The service-role key bypasses ALL RLS policies.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url  = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key  = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined

export const adminSupabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null

if (import.meta.env.DEV && (!url || !key)) {
  console.warn('[admin] VITE_SUPABASE_SERVICE_ROLE_KEY is not set. Admin RPC calls will fail.')
}
