/**
 * TrialBanner — shows a countdown in the last 3 days of trial.
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'

export function TrialBanner() {
  const { isInTrial, trialDaysLeft, isActive } = useSubscription()
  const navigate = useNavigate()
  const { t }    = useTranslation()

  // Only show in last 3 days of trial, not if already paid
  if (!isInTrial || isActive || trialDaysLeft > 3) return null

  const isLastDay = trialDaysLeft <= 1

  return (
    <div className={[
      'px-4 py-2.5 text-center text-sm font-medium',
      isLastDay
        ? 'bg-danger-soft text-danger border-b border-danger/20'
        : 'bg-warning-soft text-warning border-b border-warning/20',
    ].join(' ')}>
      {t('trial.bannerDays', { count: trialDaysLeft })}
      {' · '}
      <button
        type="button"
        onClick={() => navigate('/app/subscription')}
        className="underline underline-offset-2 hover:no-underline font-semibold"
      >
        {t('subscription.upgradeButton')}
      </button>
    </div>
  )
}
