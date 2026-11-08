import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import i18n from '../../locales/i18n'
import { supabase } from '../../lib/supabase'
import { getBusiness, signOut as signOutApi, updateBusiness } from './api'
import type { Business } from './types'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'
type ProfileStatus = 'loading' | 'loaded' | 'error'

interface AuthContextValue {
  status: AuthStatus
  user: User | null
  profile: Business | null
  profileStatus: ProfileStatus
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/**
 * Auth provider for MELA Phase 1.
 *
 * Owns three concerns:
 *  - Session: `status` reflects whether Supabase has a session. The null
 *    client (env not configured) is treated as unauthenticated.
 *  - Profile: the owner's single business row, fetched on sign-in.
 *  - Language: when a profile loads, the profile's `language` is applied to
 *    i18n once. When the user later switches language (and a profile exists),
 *    the new choice is persisted back to the row.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Business | null>(null)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')

  // Track the user id whose profile we last fetched so getSession() and the
  // onAuthStateChange INITIAL_SESSION event don't double-fetch.
  const fetchedUserIdRef = useRef<string | null>(null)
  // Live refs for the language listener (which is registered once).
  const profileRef = useRef<Business | null>(null)
  const userRef = useRef<User | null>(null)
  profileRef.current = profile
  userRef.current = user

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileStatus('loading')
    const { data, error } = await getBusiness(userId)
    if (error) {
      setProfile(null)
      setProfileStatus('error')
      return
    }
    setProfile(data)
    setProfileStatus('loaded')
  }, [])

  const refreshProfile = useCallback(async () => {
    if (userRef.current) await fetchProfile(userRef.current.id)
  }, [fetchProfile])

  // Establish the session: getSession() for the initial value, then
  // onAuthStateChange to react to sign-in / sign-out / refresh.
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
          void fetchProfile(session.user.id)
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
          void fetchProfile(session.user.id)
        }
      // Phase 13 audit: SIGNED_OUT handler clears fetchedUserIdRef, user, profile, status, profileStatus correctly. ✅
      } else if (event === 'SIGNED_OUT') {
        fetchedUserIdRef.current = null
        setUser(null)
        setProfile(null)
        setStatus('unauthenticated')
        setProfileStatus('loaded')
      }
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Apply the profile's language to i18n once after it loads (when it differs
  // from the current i18n language). Because we set it TO profile.language, the
  // languageChanged listener below sees no diff and does not re-persist.
  useEffect(() => {
    if (profile && profile.language !== i18n.language) {
      void i18n.changeLanguage(profile.language)
    }
  }, [profile])

  // Persist language changes back to the business row when a profile exists
  // and the new language differs from the stored one.
  useEffect(() => {
    const handler = (lng: string) => {
      const p = profileRef.current
      const u = userRef.current
      if (p && u && lng !== p.language) {
        const next: Business = { ...p, language: lng as Business['language'] }
        setProfile(next)
        profileRef.current = next
        void updateBusiness(p.id, { language: lng as Business['language'] }, u.id)
      }
    }
    i18n.on('languageChanged', handler)
    return () => {
      i18n.off('languageChanged', handler)
    }
  }, [])

  const signOut = useCallback(async () => {
    await signOutApi()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, profile, profileStatus, refreshProfile, signOut }),
    [status, user, profile, profileStatus, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
