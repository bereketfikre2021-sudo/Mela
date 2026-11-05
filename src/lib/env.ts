/**
 * Typed access to Vite environment variables. Only variables prefixed with
 * VITE_ are exposed to the client bundle. See .env.example.
 */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
} as const

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}
