import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '../design-system/LoadingState'
import { supabase } from '../lib/supabase'

/**
 * Completes the Google OAuth redirect (Supabase PKCE): exchanges the code in
 * the URL for a session, then routes on. The auth context + route guards take
 * over from here (→ /onboarding if there is no business profile yet, else /app).
 */
export function AuthCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) {
      navigate('/login', { replace: true })
      return
    }
    supabase.auth
      .exchangeCodeForSession(window.location.href)
      .then(({ error }) => navigate(error ? '/login' : '/app', { replace: true }))
      .catch(() => navigate('/login', { replace: true }))
  }, [navigate])

  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <Spinner size="lg" label={t('common.loading')} />
    </div>
  )
}
