import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Input } from '../design-system/Input'
import { Select } from '../design-system/Select'
import { useNotification } from '../design-system/Notification'
import { Spinner } from '../design-system/LoadingState'
import { useAuth } from '../modules/auth/AuthContext'
import { createBusiness } from '../modules/auth/api'
import { createProduct, getProducts } from '../modules/retail/api'
import { ALL_BUSINESS_TYPES, getBusinessConfig, type BusinessType } from '../modules/auth/businessConfig'
import { supportedLanguages } from '../locales/i18n'
import type { BusinessInput } from '../modules/auth/types'

type Step = 1 | 2 | 3

const STEPS = 3

function ProgressBar({ current, total }: { current: Step; total: number }) {
  const { t } = useTranslation()
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-secondary">
          {t('onboarding.step', { current, total })}
        </span>
        <span className="text-xs text-secondary">
          {Math.round(((current - 1) / total) * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current - 1) / total) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={[
              'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
              i + 1 < current
                ? 'border-primary bg-primary text-white'
                : i + 1 === current
                  ? 'border-primary bg-surface text-primary'
                  : 'border-border bg-surface text-muted',
            ].join(' ')}>
              {i + 1 < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className="text-[10px] text-secondary whitespace-nowrap">
              {t(`onboarding.stepLabel.${i + 1}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { notify }  = useNotification()
  const { user, refreshProfile } = useAuth()

  const [step,       setStep]       = useState<Step>(1)
  const [bizType,    setBizType]    = useState<BusinessType>('retail')
  const [bizName,    setBizName]    = useState('')
  const [ownerName,  setOwnerName]  = useState('')
  const [phone,      setPhone]      = useState('')
  const [language,   setLanguage]   = useState<'en' | 'am'>(
    i18n.resolvedLanguage === 'am' ? 'am' : 'en'
  )
  const [closingTime, setClosingTime] = useState('')
  const [errors,     setErrors]     = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const languageOptions = supportedLanguages.map(l => ({ value: l.code, label: l.label }))

  function validateStep2() {
    const next: Record<string, string> = {}
    if (bizName.trim().length < 2) next.bizName = t('validation.nameMin')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function validateStep3() {
    const next: Record<string, string> = {}
    if (ownerName.trim().length < 2) next.ownerName = t('validation.nameMin')
    if (phone.trim().length < 7) next.phone = t('validation.phone')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function next() {
    if (step === 1) { setStep(2); return }
    if (step === 2 && !validateStep2()) return
    if (step === 2) { setStep(3); return }
  }

  function back() {
    if (step === 2) setStep(1)
    if (step === 3) setStep(2)
  }

  async function handleSubmit() {
    if (!validateStep3()) return
    if (!user) return
    setSubmitting(true)

    const input: BusinessInput = {
      name:         bizName.trim(),
      type:         bizType,
      owner_name:   ownerName.trim(),
      phone:        phone.trim(),
      language,
      closing_time: closingTime || null,
    }

    const { error } = await createBusiness(input, user.id)

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

    // Seed starter products
    const { data: existing } = await getProducts()
    if (!existing || existing.length === 0) {
      const config = getBusinessConfig(bizType)
      await Promise.allSettled(
        config.starterProducts.map(p =>
          createProduct({
            name: p.name, sku: null,
            selling_price: p.defaultPrice,
            cost_price: null,
            stock_quantity: getBusinessConfig(bizType).isServiceBased ? 999999 : 0,
            unit: p.unit,
            low_stock_threshold: null,
            image_url: null,
            barcode: null,
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

  return (
    <div className="mx-auto max-w-lg px-4 py-8 md:py-12">
      <ProgressBar current={step} total={STEPS} />

      {/* ── Step 1: Choose business type ───────────────────────────────── */}
      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold text-text">{t('onboarding.pickType.title')}</h1>
          <p className="mt-1 text-sm text-secondary">{t('onboarding.pickType.subtitle')}</p>

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
                  <config.icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-secondary'}`} aria-hidden="true" />
                  <span className={`text-sm font-semibold leading-snug ${selected ? 'text-primary' : 'text-text'}`}>
                    {t(`businessTypes.${config.type}`)}
                  </span>
                  <span className="text-xs text-secondary leading-snug">
                    {t(`businessTypes.${config.type}_desc`)}
                  </span>
                </button>
              )
            })}
          </div>

          <Button size="lg" fullWidth className="mt-8"
            trailingIcon={<ArrowRight className="h-4 w-4" />}
            onClick={next}>
            {t('onboarding.pickType.continue')}
          </Button>
        </div>
      )}

      {/* ── Step 2: Business details ────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold text-text">{t('onboarding.step2.title')}</h1>
          <p className="mt-1 text-sm text-secondary">{t('onboarding.step2.subtitle')}</p>

          <div className="mt-6 space-y-4">
            <Input
              label={t('business.form.businessName')}
              helperText={t('business.form.businessNameHelper')}
              value={bizName}
              onChange={e => setBizName(e.target.value)}
              onBlur={() => bizName.trim().length < 2 && setErrors(p => ({ ...p, bizName: t('validation.nameMin') }))}
              error={errors.bizName}
              autoFocus
              autoComplete="organization"
              maxLength={100}
            />
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="ghost" size="lg" leadingIcon={<ArrowLeft className="h-4 w-4" />} onClick={back}>
              {t('common.back')}
            </Button>
            <Button size="lg" fullWidth trailingIcon={<ArrowRight className="h-4 w-4" />} onClick={next}>
              {t('onboarding.pickType.continue')}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: About you + preferences ────────────────────────────── */}
      {step === 3 && (
        <div>
          <h1 className="text-2xl font-bold text-text">{t('onboarding.step3.title')}</h1>
          <p className="mt-1 text-sm text-secondary">{t('onboarding.step3.subtitle')}</p>

          <div className="mt-6 space-y-4">
            <Input
              label={t('business.form.ownerName')}
              helperText={t('business.form.ownerNameHelper')}
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              error={errors.ownerName}
              autoComplete="name"
              maxLength={100}
              autoFocus
            />
            <Input
              label={t('business.form.phone')}
              helperText={t('business.form.phoneHelper')}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              error={errors.phone}
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
            />
            <Select
              label={t('business.form.language')}
              helperText={t('business.form.languageHelper')}
              options={languageOptions}
              value={language}
              onChange={e => setLanguage(e.target.value as 'en' | 'am')}
            />
            <Input
              label={t('business.form.closingTime')}
              helperText={t('business.form.closingTimeHelper')}
              type="time"
              value={closingTime}
              onChange={e => setClosingTime(e.target.value)}
            />
          </div>

          <div className="mt-8 flex gap-3">
            <Button variant="ghost" size="lg" leadingIcon={<ArrowLeft className="h-4 w-4" />} onClick={back} disabled={submitting}>
              {t('common.back')}
            </Button>
            <Button size="lg" fullWidth loading={submitting} onClick={() => void handleSubmit()}>
              {t('business.form.submitCreate')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
