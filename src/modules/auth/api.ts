import type { AuthResponse } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase'
import type { Business, BusinessInput } from './types'

/**
 * Auth + business-profile data access for MELA Phase 1.
 *
 * Every function is a thin wrapper over the shared Supabase client in
 * `src/lib/supabase.ts`. The client uses the anon key only; no service-role
 * key is ever referenced here. When the client is unavailable (env vars not
 * configured), a clear error is returned in the Supabase-style `{ error }`
 * shape so callers can fall back to their generic error handling.
 */

/** Returned when the Supabase client is unavailable (env not configured). */
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

/** Begin Google OAuth. Supabase redirects to Google; the app resumes at /auth/callback. */
export async function signInWithGoogle(): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.' } }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })
  return { error: error ? { message: error.message } : null }
}

/** Load the business profile for a user (one per owner in Phase 1). */
export async function getBusiness(
  userId: string
): Promise<{ data: Business | null; error: { message: string } | null }> {
  if (!supabase) return { data: null, error: { message: clientUnavailableError().error.message } }
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Business | null) ?? null, error: null }
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

/** Update the owner's business profile, scoped to the owner by id + owner_id. */
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
 * Supabase sends the link to the given email; clicking it redirects to /auth/callback.
 */
export async function sendMagicLink(
  email: string
): Promise<{ error: { message: string } | null }> {
  if (!supabase) return { error: { message: clientUnavailableError().error.message } }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
  return t('auth.errors.generic')
}
