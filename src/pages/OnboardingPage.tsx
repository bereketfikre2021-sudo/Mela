import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'

import { Button } from '../design-system/Button'
import { useNotification } from '../design-system/Notification'
import { Spinner } from '../design-system/LoadingState'
import { useAuth } from '../modules/auth/AuthContext'
import { createBusiness } from '../modules/auth/api'
import { createProduct, getProducts } from '../modules/retail/api'
import { BusinessForm } from '../modules/auth/BusinessForm'
import { ALL_BUSINESS_TYPES, getBusinessConfig, type BusinessType } from '../modules/auth/businessConfig'
import type { BusinessInput } from '../modules/auth/types'

type Step = 'pick-type' | 'fill-details'

export function OnboardingPage() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { notify } = useNotification()
  const { user, refreshProfile } = useAuth()

  const [step,       setStep]       = useState<Step>('pick-type')
  const [bizType,    setBizType]    = useState<BusinessType>('retail')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(input: BusinessInput) {
    if (!user) return
    setSubmitting(true)

    // Create the business with the chosen type
    const toCreate = { ...input, type: bizType }
    const { error } = await createBusiness(toCreate, user.id)

    if (error && /duplicate|unique|constraint/i.test(error.message)) {
      await refreshProfile()
      setSubmitting(false)
      navigate('/app')
      return
    }

    if (error) {
      notify({ tone: 'danger', title: t('auth.errors.generic'), description: error.message })
      setSubmitting(false)
      return
    }

    // Silently add starter products only if the user has no products yet
    // (prevents duplicate seeding on retries or re-onboarding)
    const { data: existingProducts } = await getProducts()
    const alreadyHasProducts = existingProducts && existingProducts.length > 0

    if (!alreadyHasProducts) {
      const config  = getBusinessConfig(bizType)
      await Promise.allSettled(
        config.starterProducts.map(p =>
          createProduct({
            name:                p.name,
            sku:                 null,
            selling_price:       p.defaultPrice,
            cost_price:          null,
            stock_quantity:      0,
            unit:                p.unit,
            low_stock_threshold: null,
          }, user.id)
        )
      )
    }

    notify({ tone: 'success', title: t('business.createSuccess.title'), description: t('business.createSuccess.desc') })
    await refreshProfile()
    setSubmitting(false)
    navigate('/app')
  }

  if (!user) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner size="lg" label={t('common.loading')} />
      </div>
    )
  }

  // ── Step 1: pick business type ─────────────────────────────────────────────
  if (step === 'pick-type') {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 md:py-16">
        {/* Header */}
        <h1 className="heading text-2xl md:text-3xl">{t('onboarding.pickType.title')}</h1>
        <p className="mt-2 text-sm text-secondary">{t('onboarding.pickType.subtitle')}</p>

        {/* Type grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_BUSINESS_TYPES.map(config => {
            const selected = bizType === config.type
            return (
              <button
                key={config.type}
                type="button"
                onClick={() => setBizType(config.type)}
                className={[
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                  selected
                    ? 'border-primary bg-primary-soft'
                    : 'border-border bg-surface hover:border-primary/40 hover:bg-background',
                ].join(' ')}
              >
                <config.icon
                  className={`h-5 w-5 ${selected ? 'text-primary' : 'text-secondary'}`}
                  aria-hidden="true"
                />
                <span className={`text-sm font-semibold leading-snug ${selected ? 'text-primary' : 'text-text'}`}>
                  {t(`businessTypes.${config.type}`)}
                </span>
                <span className="text-xs text-secondary leading-snug">{t(`businessTypes.${config.type}_desc`)}</span>
              </button>
            )
          })}
        </div>

        <Button
          size="lg"
          fullWidth
          className="mt-8"
          trailingIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          onClick={() => setStep('fill-details')}
        >
          {t('onboarding.pickType.continue')}
        </Button>
      </div>
    )
  }

  // ── Step 2: fill business details ──────────────────────────────────────────
  const config = getBusinessConfig(bizType)
  return (
    <div className="mx-auto max-w-xl px-4 py-8 md:py-14">
      {/* Back + type badge */}
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => setStep('pick-type')}
          className="text-xs font-medium text-secondary hover:text-text">
          ← {t('onboarding.details.back')}
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-medium text-secondary">
          <config.icon className="h-3 w-3" aria-hidden="true" />
          {t(`businessTypes.${config.type}`)}
        </span>
      </div>

      <h1 className="heading text-2xl md:text-3xl">{t('onboarding.details.title')}</h1>
      <p className="mt-2 text-sm text-secondary">{t('onboarding.details.subtitle')}</p>

      <div className="mt-6">
        <BusinessForm
          mode="create"
          preselectedType={bizType}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  )
}
