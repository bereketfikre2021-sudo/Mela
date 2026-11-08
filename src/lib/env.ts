/**
 * Typed access to Vite environment variables. Only variables prefixed with
 * VITE_ are exposed to the client bundle. See .env.example.
 */
export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  appUrl: import.meta.env.VITE_APP_URL as string | undefined,
} as const

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey)
}

if (import.meta.env.DEV) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) console.warn('[mela] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.')
  if (!env.appUrl) console.warn('[mela] VITE_APP_URL is not set. OAuth redirects will use window.location.origin.')
}
