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
 * Gate for authenticated app routes that require a business profile.
 * - loading session  → spinner
 * - unauthenticated   → /login
 * - profile loading   → spinner
 * - no profile        → /onboarding
 * - profile present   → render children
 */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { status, profileStatus, profile } = useAuth()

  // Phase 13 audit: guard order loading→unauthenticated→profileLoading→noProfile is correct — no race window. ✅
  if (status === 'loading') return <AuthLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (profileStatus === 'loading') return <AuthLoading />
  if (!profile) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

/**
 * Gate for the onboarding route.
 * - loading session   → spinner
 * - unauthenticated    → /login
 * - profile loading    → spinner
 * - profile exists      → /app (onboarding already complete)
 * - no profile          → render children
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { status, profileStatus, profile } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (profileStatus === 'loading') return <AuthLoading />
  if (profile) return <Navigate to="/app" replace />
  return <>{children}</>
}

/**
 * Gate for public-only routes (login / register). Authenticated users are sent
 * to the app (or onboarding if they have no profile yet).
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status, profileStatus, profile } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') {
    if (profileStatus === 'loading') return <AuthLoading />
    return <Navigate to={profile ? '/app' : '/onboarding'} replace />
  }
  return <>{children}</>
}
