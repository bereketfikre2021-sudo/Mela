/**
 * AdminAuthContext — manages admin session and gate check.
 * Uses the anon-key supabase client for auth + is_admin check.
 * Does NOT import anything from the customer-facing app except supabase.ts.
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
  signOut: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue>({
  status: 'loading',
  user: null,
  signInWithGoogle: async () => { /* no-op */ },
  signOut: async () => { /* no-op */ },
})

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}

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
      // sign them out immediately so they don't retain a session
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

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return
    const base = import.meta.env.VITE_APP_URL || window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${base}/admin/auth/callback` },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setStatus('unauthenticated')
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({ status, user, signInWithGoogle, signOut }),
    [status, user, signInWithGoogle, signOut]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}
