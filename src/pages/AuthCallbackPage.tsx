import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '../design-system/LoadingState'
import { supabase } from '../lib/supabase'
import { consumeSSODestination } from '../admin/lib/AdminAuthContext'

/**
 * AuthCallbackPage — handles OAuth / PKCE callback for both customer and
 * admin SSO flows.
 *
 * Strategy:
 *  Supabase JS v2 automatically detects the `code` param (or hash fragment)
 *  in the URL and exchanges it via PKCE on `getSession()`. We do NOT call
 *  `exchangeCodeForSession` manually — doing so loses the code verifier that
 *  Supabase stored before the redirect.
 *
 *  We poll `getSession()` briefly to let the SDK complete the exchange, then
 *  read the SSO destination from sessionStorage to decide where to navigate.
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

    // Read (and immediately clear) the SSO destination before any async work.
    const ssoDestination = consumeSSODestination()

    // Let Supabase JS v2 handle PKCE exchange automatically via getSession().
    // It detects the `code` in the URL hash/query and exchanges it internally.
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[AuthCallback] getSession error:', error.message)
          setErrorMsg(error.message)
          return
        }

        if (!data.session) {
          // No session yet — Supabase may still be processing the hash.
          // Wait a tick and retry once.
          setTimeout(() => {
            supabase!.auth.getSession().then(({ data: d2, error: e2 }) => {
              if (e2 || !d2.session) {
                setErrorMsg(e2?.message ?? 'No session returned. Please try signing in again.')
                return
              }
              navigate(ssoDestination ?? '/app', { replace: true })
            })
          }, 800)
          return
        }

        // Session established — go to admin or customer app
        navigate(ssoDestination ?? '/app', { replace: true })
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Unexpected error during authentication.'
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
