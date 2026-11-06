import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useNotification } from '../design-system/Notification'
import { Spinner } from '../design-system/LoadingState'
import { useAuth } from '../modules/auth/AuthContext'
import { createBusiness } from '../modules/auth/api'
import { BusinessForm } from '../modules/auth/BusinessForm'
import type { BusinessInput } from '../modules/auth/types'

/** Onboarding: create the single business profile, then route to /app. */
export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const { user, refreshProfile } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(input: BusinessInput) {
    if (!user) return
    setSubmitting(true)
    const { error } = await createBusiness(input, user.id)

    // A second-business attempt (e.g. the unique index fired) means a profile
    // already exists — re-sync state and go to the app.
    if (error && /duplicate|unique|constraint/i.test(error.message)) {
      await refreshProfile()
      setSubmitting(false)
      navigate('/app')
      return
    }

    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('auth.errors.generic'), description: error.message })
      return
    }

    notify({ tone: 'success', title: t('business.createSuccess.title'), description: t('business.createSuccess.desc') })
    await refreshProfile()
    navigate('/app')
  }

  if (!user) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner size="lg" label={t('common.loading')} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl py-6 md:py-10">
      <h1 className="heading text-2xl md:text-3xl">{t('business.create.title')}</h1>
      <p className="mt-3 max-w-xl text-sm text-secondary">{t('business.create.subtitle')}</p>

      <div className="mt-8">
        <BusinessForm mode="create" onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </div>
  )
}
