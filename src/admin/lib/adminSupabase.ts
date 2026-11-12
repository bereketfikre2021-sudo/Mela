/**
 * Admin Supabase client — anon key but with a custom header.
 *
 * The `x-admin-client: true` header is checked inside is_admin() so that
 * admin SELECT policies ONLY fire when this client is used.
 * The customer-facing app never sends this header, so admin policies
 * never bleed into customer queries even when the logged-in user is an admin.
 *
 * The service-role client (adminSupabase) is kept for future use but is
 * no longer required for core admin operations.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url     = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Admin-flagged anon client. All admin reads go through this.
 * Sets x-admin-client header so RLS can distinguish admin vs customer queries.
 */
export const adminSupabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        global: {
          headers: { 'x-admin-client': 'true' },
        },
        auth: {
          persistSession: true,
          storageKey: 'mela-admin-session',
        },
      })
    : null

if (import.meta.env.DEV && (!url || !anonKey)) {
  console.warn('[admin] Supabase env vars not set — admin client unavailable.')
}
