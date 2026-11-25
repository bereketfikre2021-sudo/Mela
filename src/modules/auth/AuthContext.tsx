import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import i18n from '../../locales/i18n'
import { supabase } from '../../lib/supabase'
import {
  getBusinesses,
  getUserProfile,
  setActiveBusiness,
  signOut as signOutApi,
  updateBusiness,
} from './api'
import type { Business } from './types'

type AuthStatus    = 'loading' | 'authenticated' | 'unauthenticated'
type ProfileStatus = 'loading' | 'loaded' | 'error'

interface AuthContextValue {
  status:         AuthStatus
  user:           User | null
  // All businesses owned by this user (up to 3)
  businesses:     Business[]
  // The currently active business (selected by the user)
  activeBusiness: Business | null
  profileStatus:  ProfileStatus
  // Switch the active business – persists to cloud via user_profiles
  switchBusiness: (businessId: string) => Promise<void>
  refreshProfile: () => Promise<void>
  signOut:        () => Promise<void>
  // Convenience alias kept for components that only care about one profile
  profile:        Business | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/**
 * AuthProvider – multi-business edition.
 *
 * Owns four concerns:
 *  1. Session    – reflects whether Supabase has a session.
 *  2. Businesses – the full list of businesses owned by the signed-in user.
 *  3. Active     – which business is currently selected (synced to cloud).
 *  4. Language   – applies and persists the active business's language setting.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status,         setStatus]         = useState<AuthStatus>('loading')
  const [user,           setUser]           = useState<User | null>(null)
  const [businesses,     setBusinesses]     = useState<Business[]>([])
  const [activeBusiness, setActiveBusiness_] = useState<Business | null>(null)
  const [profileStatus,  setProfileStatus]  = useState<ProfileStatus>('loading')

  // Track the user id whose data we last fetched to avoid double-fetching.
  const fetchedUserIdRef = useRef<string | null>(null)

  // Live refs for the language listener (registered once).
  const activeBusinessRef = useRef<Business | null>(null)
  const userRef           = useRef<User | null>(null)
  activeBusinessRef.current = activeBusiness
  userRef.current           = user

  // ── Core fetch ────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (userId: string) => {
    setProfileStatus('loading')

    // Fetch businesses and user profile in parallel.
    // getUserProfile is best-effort – a missing row is not an error.
    const [bizResult, profileResult] = await Promise.all([
      getBusinesses(userId),
      getUserProfile(userId),
    ])

    if (bizResult.error) {
      // Log so it shows up in the console instead of failing silently.
      console.error('[AuthContext] getBusinesses error:', bizResult.error.message)
      setBusinesses([])
      setActiveBusiness_(null)
      setProfileStatus('error')
      return
    }

    const bizList = bizResult.data
    setBusinesses(bizList)

    if (bizList.length === 0) {
      setActiveBusiness_(null)
      setProfileStatus('loaded')
      return
    }

    // Resolve active business: use cloud preference, else first in list.
    const savedId = profileResult.data?.active_business_id
    const active  = bizList.find(b => b.id === savedId) ?? bizList[0]
    setActiveBusiness_(active)
    setProfileStatus('loaded')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (userRef.current) await fetchData(userRef.current.id)
  }, [fetchData])

  // ── Session ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setStatus('unauthenticated')
      setProfileStatus('loaded')
      return
    }

    let active = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        setStatus('authenticated')
        if (fetchedUserIdRef.current !== session.user.id) {
          fetchedUserIdRef.current = session.user.id
          void fetchData(session.user.id)
        }
      } else {
        setStatus('unauthenticated')
        setProfileStatus('loaded')
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      if (!active) return
      if (session?.user) {
        setUser(session.user)
        setStatus('authenticated')
        if (fetchedUserIdRef.current !== session.user.id) {
          fetchedUserIdRef.current = session.user.id
          void fetchData(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        fetchedUserIdRef.current = null
        setUser(null)
        setBusinesses([])
        setActiveBusiness_(null)
        setStatus('unauthenticated')
        setProfileStatus('loaded')
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [fetchData])

  // ── Language: apply active business language once after load ──────────────
  useEffect(() => {
    if (activeBusiness && activeBusiness.language !== i18n.language) {
      void i18n.changeLanguage(activeBusiness.language)
    }
  }, [activeBusiness])

  // ── Language: persist changes back to the active business row ─────────────
  useEffect(() => {
    const handler = (lng: string) => {
      const biz = activeBusinessRef.current
      const u   = userRef.current
      if (biz && u && lng !== biz.language) {
        const next: Business = { ...biz, language: lng as Business['language'] }
        setActiveBusiness_(next)
        activeBusinessRef.current = next
        // Also update in the businesses list
        setBusinesses(prev => prev.map(b => b.id === next.id ? next : b))
        void updateBusiness(biz.id, { language: lng as Business['language'] }, u.id)
      }
    }
    i18n.on('languageChanged', handler)
    return () => { i18n.off('languageChanged', handler) }
  }, [])

  // ── switchBusiness ────────────────────────────────────────────────────────
  const switchBusiness = useCallback(async (businessId: string) => {
    const target = businesses.find(b => b.id === businessId)
    if (!target || !userRef.current) return
    setActiveBusiness_(target)
    // Persist to cloud (fire and forget – UI is already updated)
    void setActiveBusiness(userRef.current.id, businessId)
  }, [businesses])

  // ── signOut ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await signOutApi()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      businesses,
      activeBusiness,
      profileStatus,
      switchBusiness,
      refreshProfile,
      signOut,
      // Alias for components that haven't been migrated yet
      profile: activeBusiness,
    }),
    [status, user, businesses, activeBusiness, profileStatus, switchBusiness, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
