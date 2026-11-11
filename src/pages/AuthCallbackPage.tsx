import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '../design-system/LoadingState'
import { supabase } from '../lib/supabase'

/** Internal-path allowlist — prevents open redirect attacks. */
const ALLOWED_NEXT_PATHS = ['/admin', '/admin/', '/admin/dashboard', '/app']

/**
 * AuthCallbackPage — handles OAuth / PKCE callback for both customer and
 * admin SSO flows.
 *
 * Destination is encoded in the `?next=` query param of the redirectTo URL,
 * which Supabase preserves through the OAuth flow and returns to us here.
 * sessionStorage is NOT used — it is wiped by the cross-origin redirect
 * chain through bk.pro.et.
 *
 * Admin authorization: `checkIsAdmin()` in AdminAuthContext still runs after
 * navigation to /admin. The `next` param only controls routing, not access.
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

    // Read ?next= from URL — this survives all redirects unlike sessionStorage.
    // Validate against allowlist before using.
    const params = new URLSearchParams(window.location.search)
    const rawNext = params.get('next') ?? ''
    const destination = ALLOWED_NEXT_PATHS.includes(rawNext) ? rawNext : '/app'

    // Supabase JS v2 handles PKCE exchange automatically on getSession()
    // when it detects the code in the URL — no need to call exchangeCodeForSession.
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[AuthCallback] getSession error:', error.message)
          setErrorMsg(error.message)
          return
        }

        if (!data.session) {
          // Retry once after a brief delay — Supabase may still be processing
          setTimeout(() => {
            supabase!.auth.getSession().then(({ data: d2, error: e2 }) => {
              if (e2 || !d2.session) {
                setErrorMsg(e2?.message ?? 'No session returned. Please try again.')
                return
              }
              navigate(destination, { replace: true })
            })
          }, 800)
          return
        }

        navigate(destination, { replace: true })
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Unexpected authentication error.'
        console.error('[AuthCallback] error:', msg)
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
        <button type="button" onClick={() => navigate('/login', { replace: true })}
          className="text-sm text-primary hover:underline">
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
