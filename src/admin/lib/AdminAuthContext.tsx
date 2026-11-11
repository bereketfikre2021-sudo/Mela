/**
 * AdminAuthContext — manages admin session and gate check.
 * Uses the anon-key supabase client for auth + is_admin check.
 * Does NOT import anything from the customer-facing app except supabase.ts.
 *
 * Auth methods:
 *  - signInWithGoogle()  — existing Google OAuth
 *  - signInWithSSO()     — Central Admin OIDC via custom:central-admin provider
 *                          PKCE flow; redirects to window.location.origin/auth/callback
 *                          Stores intended destination in sessionStorage before redirect.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type AdminAuthStatus = 'loading' | 'admin' | 'denied' | 'unauthenticated'

interface AdminAuthContextValue {
  status: AdminAuthStatus
  user: User | null
  signInWithGoogle: () => Promise<void>
  signInWithSSO: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  status: 'loading',
  user: null,
  signInWithGoogle: async () => { /* no-op */ },
  signInWithSSO:    async () => ({ error: null }),
  signOut:          async () => { /* no-op */ },
})

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}

/** SSO destination key stored in sessionStorage before the OAuth redirect. */
export const SSO_DESTINATION_KEY = 'mela_admin_sso_destination'

async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  return !error && data !== null
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AdminAuthStatus>('loading')
  const [user,   setUser]   = useState<User | null>(null)

  const verify = useCallback(async (u: User) => {
    const ok = await checkIsAdmin(u.id)
    setUser(u)
    setStatus(ok ? 'admin' : 'denied')
    if (!ok) {
      await supabase?.auth.signOut()
    }
  }, [])

  useEffect(() => {
    if (!supabase) { setStatus('unauthenticated'); return }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void verify(session.user)
      } else {
        setStatus('unauthenticated')
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void verify(session.user)
      } else {
        setUser(null)
        setStatus('unauthenticated')
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [verify])

  // ── Existing Google sign-in (unchanged) ───────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return
    const base = import.meta.env.VITE_APP_URL || window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/admin/auth/callback` },
    })
  }, [])

  // ── Central Admin SSO via custom OIDC provider ────────────────────────────
  const signInWithSSO = useCallback(async (): Promise<{ error: string | null }> => {
    if (!supabase) return { error: 'Supabase client is not configured.' }

    try {
      sessionStorage.setItem(SSO_DESTINATION_KEY, '/admin')
    } catch { /* ignore */ }

    // Per spec: window.location.origin + /auth/callback, no extra query params
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'custom:central-admin' as Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
      options: {
        redirectTo,
        scopes: 'openid email',
        skipBrowserRedirect: false,
        // No queryParams — PKCE is handled automatically by Supabase JS v2
      },
    })

    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({ status, user, signInWithGoogle, signInWithSSO, signOut }),
    [status, user, signInWithGoogle, signInWithSSO, signOut]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
