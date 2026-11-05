import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from './env'

/**
 * Supabase client for MELA.
 *
 * Reads credentials from the Vite env vars (VITE_SUPABASE_URL,
 * VITE_SUPABASE_ANON_KEY). The client is only created when both are present;
 * otherwise it is `null`, so the app keeps working without a configured backend
 * (e.g. when running the design-system preview).
 *
 * Phase 0 does not perform any queries — authentication and data access are
 * introduced in Phase 1.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(env.supabaseUrl as string, env.supabaseAnonKey as string)
  : null

if (!isSupabaseConfigured() && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[mela] Supabase env vars not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
      'The client is unavailable until they are set.'
  )
}
