import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '../design-system/LoadingState'
import { supabase } from '../lib/supabase'
import { consumeSSODestination } from '../admin/lib/AdminAuthContext'

/**
 * AuthCallbackPage — PKCE code exchange for both customer and admin SSO flows.
 *
 * Flow detection:
 *  - Admin SSO:    consumeSSODestination() returns '/admin/' (allowlisted,
 *                  timestamped). After session is established the admin auth
 *                  context re-runs checkIsAdmin() — SSO does NOT grant admin
 *                  privileges automatically.
 *  - Customer:     No SSO destination stored → navigate to '/app'.
 *  - Error:        Show the actual error; never silently redirect to homepage.
 *
 * Open redirect prevention: consumeSSODestination() validates against an
 * internal-path allowlist and rejects stale (>10 min) entries.
 */
export function AuthCallbackPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      navigate('/login', { replace: true })
      return
    }

    // Read (and immediately clear) the SSO destination before any async work,
    // so it's consumed even if the exchange fails.
    const ssoDestination = consumeSSODestination()

    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ data, error }) => {
        if (error) {
          // Surface the actual error — do not silently fall back to homepage
          console.error('[AuthCallback] PKCE exchange failed:', error.message)
          setErrorMsg(error.message)
          return
        }

        if (!data.session) {
          setErrorMsg('No session returned after code exchange.')
          return
        }

        // Admin SSO: valid, allowlisted, recent destination → go to admin
        if (ssoDestination) {
          navigate(ssoDestination, { replace: true })
          return
        }

        // Customer flow: route guards handle onboarding vs /app
        navigate('/app', { replace: true })
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Unknown error during authentication.'
        console.error('[AuthCallback] Unexpected error:', msg)
        setErrorMsg(msg)
      })
  }, [navigate])

  if (errorMsg) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-4">
        <div className="w-full max-w-md rounded-xl border border-danger bg-danger-soft p-5 text-sm text-danger">
          <p className="font-semibold">Authentication error</p>
          <p className="mt-1 font-mono text-xs break-all">{errorMsg}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="text-sm text-primary hover:underline"
        >
          Return to login
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner size="lg" label={t('common.loading')} />
    </div>
  )
}
