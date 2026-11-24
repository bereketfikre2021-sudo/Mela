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
 *   loading session       → spinner
 *   unauthenticated       → /login
 *   profile loading       → spinner
 *   no businesses at all  → /onboarding  (create first business)
 *   active business set   → render children
 */
export function RequireBusiness({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses, activeBusiness } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (profileStatus === 'loading') return <AuthLoading />
  if (businesses.length === 0) return <Navigate to="/onboarding" replace />
  if (!activeBusiness) return <Navigate to="/select-business" replace />
  return <>{children}</>
}

/**
 * Gate for the onboarding route (creating the FIRST business).
 *
 *   loading session  → spinner
 *   unauthenticated  → /login
 *   profile loading  → spinner
 *   has businesses   → /app (already onboarded)
 *   no businesses    → render children
 */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (profileStatus === 'loading') return <AuthLoading />
  if (businesses.length > 0) return <Navigate to="/app" replace />
  return <>{children}</>
}

/**
 * Gate for adding a SECOND or THIRD business (/onboarding/new).
 * Requires auth but does NOT require zero existing businesses.
 *
 *   unauthenticated  → /login
 *   at limit (3)     → /select-business
 *   otherwise        → render children
 */
export function RequireCanAddBusiness({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (profileStatus === 'loading') return <AuthLoading />
  if (businesses.length >= 3) return <Navigate to="/select-business" replace />
  return <>{children}</>
}

/**
 * Gate for public-only routes (login / register).
 * Authenticated users are sent to the app or business picker.
 */
export function PublicOnly({ children }: { children: ReactNode }) {
  const { status, profileStatus, businesses, activeBusiness } = useAuth()

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated') {
    if (profileStatus === 'loading') return <AuthLoading />
    if (businesses.length === 0) return <Navigate to="/onboarding" replace />
    if (businesses.length > 1 && !activeBusiness) return <Navigate to="/select-business" replace />
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}
