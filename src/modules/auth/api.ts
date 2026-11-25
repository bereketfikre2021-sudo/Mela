import type { AuthResponse } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { Business, BusinessInput, UserProfile } from './types'

/**
 * Auth + business-profile data access.
 *
 * Every function is a thin wrapper over the shared Supabase client.
 * When the client is unavailable (env vars not configured), a clear error
 * is returned in the Supabase-style `{ error }` shape.
 */

function clientUnavailableError() {
  return {
    error: { message: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' }
  } as const
}

/** Register a new owner with email + password. */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  if (!supabase) return clientUnavailableError() as unknown as AuthResponse
  return supabase.auth.signUp({ email, password })
}

/** Sign an owner in with email + password. */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  if (!supabase) return clientUnavailableError() as unknown as AuthResponse
  return supabase.auth.signInWithPassword({ email, password })
}

/** Sign the current owner out. */
export async function signOut(): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: null }
  const { error } = await supabase.auth.signOut()
  return { error: error ? { message: error.message } : null }
}

/** Begin Google OAuth. */
export async function signInWithGoogle(): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: clientUnavailableError().error.message } }
  const base = import.meta.env.VITE_APP_URL || window.location.origin
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${base}/auth/callback` }
  })
  return { error: error ? { message: error.message } : null }
}

/** Load ALL businesses owned by a user. */
export async function getBusinesses(
  userId: string
): Promise<{ data: Business[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: clientUnavailableError().error.message } }
  const { data, error } = await supabase
    .from('businesses')
    .select('id, owner_id, name, type, owner_name, phone, language, closing_time, created_at, updated_at')
    .eq('owner_id', userId)
  if (error) {
    console.error('[api] getBusinesses error:', error.message, error)
    return { data: [], error: { message: error.message } }
  }
  // Sort client-side by created_at ascending to avoid PostgREST order issues
  const sorted = ((data as Business[]) ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  return { data: sorted, error: null }
}

/** Load the user_profiles row (active_business_id). */
export async function getUserProfile(
  userId: string
): Promise<{ data: UserProfile | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: clientUnavailableError().error.message } }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as UserProfile | null) ?? null, error: null }
}

/**
 * Set the active business in user_profiles (upsert).
 * This is the cloud-synced equivalent of a "last selected business" preference.
 */
export async function setActiveBusiness(
  userId: string,
  businessId: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: clientUnavailableError().error.message } }
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, active_business_id: businessId }, { onConflict: 'user_id' })
  return { error: error ? { message: error.message } : null }
}

/** Create the owner's business profile. RLS requires owner_id = auth.uid(). */
export async function createBusiness(
  input: BusinessInput,
  userId: string
): Promise<{ data: Business | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: clientUnavailableError().error.message } }
  const { data, error } = await supabase
    .from('businesses')
    .insert({ ...input, owner_id: userId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Business, error: null }
}

/** Update a business profile, scoped by id + owner_id. */
export async function updateBusiness(
  id: string,
  patch: Partial<BusinessInput>,
  userId: string
): Promise<{ data: Business | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: clientUnavailableError().error.message } }
  const { data, error } = await supabase
    .from('businesses')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', userId)
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as Business, error: null }
}

/**
 * Send a magic-link (OTP) email so the user can log in without a password.
 */
export async function sendMagicLink(
  email: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: clientUnavailableError().error.message } }
  const base = import.meta.env.VITE_APP_URL || window.location.origin
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${base}/auth/callback` },
  })
  return { error: error ? { message: error.message } : null }
}

/** Map a raw Supabase auth error message to a localized user-facing string. */
export function mapAuthError(t: (key: string) => string, message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('invalid login') || msg.includes('invalid credentials')) return t('auth.errors.invalidCredentials')
  if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('user already'))
    return t('auth.errors.emailInUse')
  if (msg.includes('email not confirmed') || msg.includes('not confirmed')) return t('auth.errors.emailNotConfirmed')
  if (msg.includes('maximum of 3')) return t('auth.errors.businessLimitReached')
  return t('auth.errors.generic')
}

// ---------------------------------------------------------------------------
// Legacy single-business helper kept for backward-compat during transition.
// Returns the first business in the list (or null). Prefer getBusinesses().
// ---------------------------------------------------------------------------
export async function getBusiness(
  userId: string
): Promise<{ data: Business | null; error: { message: string } | null }> {
  const { data, error } = await getBusinesses(userId)
  if (error) return { data: null, error }
  return { data: data[0] ?? null, error: null }
}
