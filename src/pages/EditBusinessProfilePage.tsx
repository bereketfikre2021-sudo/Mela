import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '../design-system/EmptyState'
import { useNotification } from '../design-system/Notification'
import { Spinner } from '../design-system/LoadingState'
import { useAuth } from '../modules/auth/AuthContext'
import { updateBusiness } from '../modules/auth/api'
import { BusinessForm } from '../modules/auth/BusinessForm'
import { getProducts } from '../modules/retail/api'
import type { BusinessInput } from '../modules/auth/types'

/** Edit the existing business profile, then route back to /app. */
export function EditBusinessProfilePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notify } = useNotification()
  const { user, profile, profileStatus, refreshProfile } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [hasData,    setHasData]    = useState(false)

  // Check if owner has any products — if yes, lock the business type
  useEffect(() => {
    if (!user) return
    getProducts().then(({ data }) => {
      if (data && data.length > 0) setHasData(true)
    })
  }, [user])

  async function handleSubmit(input: BusinessInput) {
    if (!user || !profile) return
    setSubmitting(true)
    const { error } = await updateBusiness(profile.id, input, user.id)
    setSubmitting(false)

    if (error) {
      notify({ tone: 'danger', title: t('auth.errors.generic'), description: error.message })
      return
    }

    notify({ tone: 'success', title: t('business.edit.success'), description: t('business.edit.successDesc') })
    await refreshProfile()
    navigate('/app')
  }

  if (profileStatus === 'loading' || !profile) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner size="lg" label={t('app.home.loadingProfile')} />
      </div>
    )
  }

  if (profileStatus === 'error') {
    return (
      <EmptyState
        title={t('notification.error.title')}
        description={t('notification.error.desc')}
        action={
          <button type="button" onClick={() => void refreshProfile()} className="text-sm font-medium text-primary hover:underline">
            {t('common.confirm')}
          </button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl py-6 md:py-10">
      <h1 className="heading text-2xl md:text-3xl">{t('business.edit.title')}</h1>
      <p className="mt-3 max-w-xl text-sm text-secondary">{t('business.edit.subtitle')}</p>

      <div className="mt-8">
        <BusinessForm mode="edit" initial={profile} hasData={hasData} onSubmit={handleSubmit} submitting={submitting} />
      </div>
    </div>
  )
}
