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
import { adminSupabase } from './adminSupabase'

const db = adminSupabase

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

export const SSO_DESTINATION_KEY = 'mela_admin_sso_destination'

/** Allowlist of valid SSO destinations — prevents open redirect attacks. */
const ALLOWED_SSO_DESTINATIONS = ['/admin', '/admin/', '/admin/dashboard']

/** Store with timestamp so stale entries don't misdirect unrelated flows. */
export function storeSSODestination(destination: string): void {
  try {
    sessionStorage.setItem(SSO_DESTINATION_KEY, JSON.stringify({
      path:      destination,
      timestamp: Date.now(),
    }))
  } catch { /* sessionStorage unavailable */ }
}

/** Read, validate, and clear the SSO destination. Returns null if stale/missing/disallowed. */
export function consumeSSODestination(): string | null {
  try {
    const raw = sessionStorage.getItem(SSO_DESTINATION_KEY)
    sessionStorage.removeItem(SSO_DESTINATION_KEY)
    if (!raw) return null
    const { path, timestamp } = JSON.parse(raw) as { path: string; timestamp: number }
    // Reject if stored more than 10 minutes ago
    if (Date.now() - timestamp > 10 * 60 * 1000) return null
    // Allowlist check — never redirect to an external URL
    if (!ALLOWED_SSO_DESTINATIONS.includes(path)) return null
    return path
  } catch {
    return null
  }
}

async function checkIsAdmin(userId: string): Promise<boolean> {
  if (!db) return false
  const { data, error } = await db
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
      await db?.auth.signOut()
    }
  }, [])

  useEffect(() => {
    if (!db) { setStatus('unauthenticated'); return }

    db.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void verify(session.user)
      } else {
        setStatus('unauthenticated')
      }
    })

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void verify(session.user)
      } else {
        setUser(null)
        setStatus('unauthenticated')
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [verify])

  const signInWithGoogle = useCallback(async () => {
    if (!db) return
    const base = import.meta.env.VITE_APP_URL || window.location.origin
    await db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/admin/auth/callback` },
    })
  }, [])

  const signInWithSSO = useCallback(async (): Promise<{ error: string | null }> => {
    if (!db) return { error: 'Supabase client is not configured.' }

    try { localStorage.setItem('mela_sso_dest', '/admin/') } catch { /* ignore */ }

    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await db.auth.signInWithOAuth({
      provider: 'custom:central-admin' as Parameters<typeof db.auth.signInWithOAuth>[0]['provider'],
      options: {
        redirectTo,
        scopes: 'openid email',
        skipBrowserRedirect: false,
      },
    })

    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const signOut = useCallback(async () => {
    if (!db) return
    await db.auth.signOut()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({ status, user, signInWithGoogle, signInWithSSO, signOut }),
    [status, user, signInWithGoogle, signInWithSSO, signOut]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
