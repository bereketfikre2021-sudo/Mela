import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '../design-system/LoadingState'
import { supabase } from '../lib/supabase'
import { SSO_DESTINATION_KEY } from '../admin/lib/AdminAuthContext'

/**
 * Completes OAuth / PKCE redirect for both customer and admin SSO flows.
 *
 * Customer flow  — navigates to /app (route guards handle onboarding).
 * Admin SSO flow — sessionStorage key SSO_DESTINATION_KEY is set to '/admin'
 *                  before the redirect; this callback detects it and navigates
 *                  there instead. The admin auth context re-runs checkIsAdmin()
 *                  on mount — SSO does NOT automatically grant admin access.
 */
export function AuthCallbackPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) {
      navigate('/login', { replace: true })
      return
    }

    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          // Clear any pending SSO destination on error
          try { sessionStorage.removeItem(SSO_DESTINATION_KEY) } catch { /* ignore */ }
          navigate('/login', { replace: true })
          return
        }

        // Check if this was an admin SSO flow
        let destination = '/app'
        try {
          const stored = sessionStorage.getItem(SSO_DESTINATION_KEY)
          if (stored) {
            destination = stored
            sessionStorage.removeItem(SSO_DESTINATION_KEY)
          }
        } catch { /* sessionStorage unavailable — default to /app */ }

        navigate(destination, { replace: true })
      })
      .catch(() => {
        try { sessionStorage.removeItem(SSO_DESTINATION_KEY) } catch { /* ignore */ }
        navigate('/login', { replace: true })
      })
  }, [navigate])

  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner size="lg" label={t('common.loading')} />
    </div>
  )
}
