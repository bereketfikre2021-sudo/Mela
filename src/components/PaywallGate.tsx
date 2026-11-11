/**
 * PaywallGate — hard blocks the entire app when trial+grace period has expired
 * and no paid subscription exists. Shows a full-screen subscribe prompt.
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import { useAuth } from '../modules/auth/AuthContext'

export function PaywallGate({ children }: { children: React.ReactNode }) {
  const { isBlocked, trialExpired, loading } = useSubscription()
  const { signOut } = useAuth()
  const navigate    = useNavigate()
  const { t }       = useTranslation()

  // Don't block while loading or on free trial
  if (loading || (!isBlocked && !trialExpired)) return <>{children}</>

  // Grace period — show soft warning but don't block yet
  if (trialExpired && !isBlocked) return (
    <>
      <div className="sticky top-0 z-50 bg-warning-soft border-b border-warning px-4 py-2.5 text-center text-sm font-medium text-warning">
        {t('trial.graceWarning')}
        <button onClick={() => navigate('/app/subscription')}
          className="ml-2 underline underline-offset-2 hover:no-underline">
          {t('subscription.upgradeButton')}
        </button>
      </div>
      {children}
    </>
  )

  // Hard block
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-layer">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Lock className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-text">{t('trial.expiredTitle')}</h1>
        <p className="mt-2 text-sm text-secondary">{t('trial.expiredDesc')}</p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => navigate('/app/subscription')}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t('trial.subscribeNow')}
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full rounded-xl border border-border py-3 text-sm font-medium text-secondary hover:bg-background transition-colors"
          >
            {t('profileMenu.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}
