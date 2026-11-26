import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spinner } from '../../design-system/LoadingState'
import { useAuth } from './AuthContext'

/** Full-height centered spinner used while auth state resolves. */
function AuthLoading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner size="lg" label="Loading" />
    </div>
  )
}

/**
 * Gate for authenticated app routes that require an active business profile.
 *
 * Flow:
 *   loading session          → spinner
 *   unauthenticated          → /login
 *   profile loading          → spinner
 *   profile error            → spinner (retry in progress, never redirect to onboarding)
 *   no businesses at all     → /onboarding  (genuinely new user)
 *   businesses exist but
 *     activeBusiness null    → spinner (transient: fetchData in flight, wait for it)
 *   active business set      → render children
 */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses, activeBusiness } = useAuth()

  if (status === 'loading')                           return <AuthLoading />
  if (status === 'unauthenticated')                   return <Navigate to="/login" replace />
  if (profileStatus === 'loading')                    return <AuthLoading />
  // On error, show spinner rather than bouncing to onboarding — AuthContext
  // will retry on next session event; a stale-cache 400 should not log users out.
  if (profileStatus === 'error')                      return <AuthLoading />
  if (businesses.length === 0)                        return <Navigate to="/onboarding" replace />
  // businesses loaded but activeBusiness not set yet — transient, wait
  if (!activeBusiness)                                return <AuthLoading />
  return <>{children}</>
}

/**
 * Gate for the onboarding route (creating the FIRST business).
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses } = useAuth()

  if (status === 'loading')             return <AuthLoading />
  if (status === 'unauthenticated')     return <Navigate to="/login" replace />
  if (profileStatus === 'loading')      return <AuthLoading />
  if (profileStatus === 'error')        return <AuthLoading />
  if (businesses.length > 0)            return <Navigate to="/app" replace />
  return <>{children}</>
}

/**
 * Gate for adding a SECOND or THIRD business (/onboarding/new).
 */
export function RequireCanAddBusiness({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses } = useAuth()

  if (status === 'loading')             return <AuthLoading />
  if (status === 'unauthenticated')     return <Navigate to="/login" replace />
  if (profileStatus === 'loading')      return <AuthLoading />
  if (profileStatus === 'error')        return <AuthLoading />
  if (businesses.length >= 3)           return <Navigate to="/select-business" replace />
  return <>{children}</>
}

/**
 * Gate for public-only routes (login / register).
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses, activeBusiness } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') {
    if (profileStatus === 'loading' || profileStatus === 'error') return <AuthLoading />
    if (businesses.length === 0)    return <Navigate to="/onboarding" replace />
    if (businesses.length > 1 && !activeBusiness) return <Navigate to="/select-business" replace />
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}
