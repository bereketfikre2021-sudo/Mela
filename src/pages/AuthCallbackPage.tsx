import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Spinner } from '../design-system/LoadingState'
import { supabase } from '../lib/supabase'

const ALLOWED_DEST = ['/admin', '/admin/', '/admin/dashboard']
const DEST_KEY     = 'mela_sso_dest'

function consumeDest(): string | null {
  try {
    const v = localStorage.getItem(DEST_KEY)
    localStorage.removeItem(DEST_KEY)
    return v && ALLOWED_DEST.includes(v) ? v : null
  } catch { return null }
}

export function AuthCallbackPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) { navigate('/login', { replace: true }); return }

    // Read and clear destination BEFORE async work
    const dest = consumeDest()

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) { setErrorMsg(error.message); return }

      if (!data.session) {
        setTimeout(() => {
          supabase!.auth.getSession().then(({ data: d2, error: e2 }) => {
            if (e2 || !d2.session) {
              setErrorMsg(e2?.message ?? 'No session returned. Please try again.')
              return
            }
            navigate(dest ?? '/app', { replace: true })
          })
        }, 800)
        return
      }

      navigate(dest ?? '/app', { replace: true })
    }).catch((e: unknown) => {
      setErrorMsg(e instanceof Error ? e.message : 'Unexpected authentication error.')
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
