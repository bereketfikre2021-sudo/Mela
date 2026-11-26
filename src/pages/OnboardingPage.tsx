import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Input } from '../design-system/Input'
import { Select } from '../design-system/Select'
import { TimePicker } from '../design-system/TimePicker'
import { useNotification } from '../design-system/Notification'
import { Spinner } from '../design-system/LoadingState'
import { useAuth } from '../modules/auth/AuthContext'
import { createBusiness } from '../modules/auth/api'
import { createProduct, getProducts } from '../modules/retail/api'
import { ALL_BUSINESS_TYPES, getBusinessConfig, type BusinessType } from '../modules/auth/businessConfig'
import {
  TYPES_WITH_SUBTYPES,
  getSubtypesForType,
  getSubtypeConfig,
  type Subtype,
} from '../modules/auth/serviceSubtypes'
import { supportedLanguages } from '../locales/i18n'
import type { BusinessInput } from '../modules/auth/types'

// Step 1.5 only exists for types that have sub-types (service, fnb)
type Step = 1 | 1.5 | 2 | 3

const TOTAL_STEPS = 3  // progress bar always shows 3 steps

function ProgressBar({ current, total }: { current: Step; total: number }) {
  const { t } = useTranslation()
  // Map step 1.5 to progress bar step 1 (still on first stage)
  const displayStep = current === 1.5 ? 1 : Math.floor(current) as 1 | 2 | 3
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-secondary">
          {t('onboarding.step', { current: displayStep, total })}
        </span>
        <span className="text-xs text-secondary">
          {Math.round(((displayStep - 1) / total) * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((displayStep - 1) / total) * 100}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className={[
              'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
              i + 1 < displayStep
                ? 'border-primary bg-primary text-white'
                : i + 1 === displayStep
                  ? 'border-primary bg-surface text-primary'
                  : 'border-border bg-surface text-muted',
            ].join(' ')}>
              {i + 1 < displayStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
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

export function OnboardingPage({ addingNew = false }: { addingNew?: boolean }) {
  const { t, i18n } = useTranslation()
  const navigate    = useNavigate()
  const { notify }  = useNotification()
  const { user, businesses, refreshProfile, switchBusiness } = useAuth()

  // Pre-fill owner details from the first existing business (if adding a new one)
  const existingBusiness = businesses[0] ?? null

  const [step,        setStep]       = useState<Step>(1)
  const [bizType,     setBizType]    = useState<BusinessType>('retail')
  const [subtype,     setSubtype]    = useState<Subtype | null>(null)
  const [bizName,     setBizName]    = useState('')
  const [ownerName,   setOwnerName]  = useState(addingNew ? (existingBusiness?.owner_name ?? '') : '')
  const [phone,       setPhone]      = useState(addingNew ? (existingBusiness?.phone ?? '') : '')
  const [language,    setLanguage]   = useState<'en' | 'am'>(
    addingNew
      ? (existingBusiness?.language ?? (i18n.resolvedLanguage === 'am' ? 'am' : 'en'))
      : (i18n.resolvedLanguage === 'am' ? 'am' : 'en')
  )
  const [closingTime, setClosingTime] = useState('')
  const [errors,      setErrors]     = useState<Record<string, string>>({})
  const [submitting,  setSubmitting] = useState(false)

  const languageOptions = supportedLanguages.map(l => ({ value: l.code, label: l.label }))
  const hasSubtypes     = TYPES_WITH_SUBTYPES.includes(bizType)
  const subtypeOptions  = getSubtypesForType(bizType)

  function validateStep2() {
    const next: Record<string, string> = {}
    if (bizName.trim().length < 2) next.bizName = t('validation.nameMin')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function validateStep3() {
    const next: Record<string, string> = {}
    // Personal: name was collected in step 2 (bizName), no separate owner name
    if (bizType !== 'personal' && ownerName.trim().length < 2) next.ownerName = t('validation.nameMin')
    if (phone.trim().length < 7) next.phone = t('validation.phone')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function next() {
    if (step === 1) {
      if (hasSubtypes) {
        if (!subtype) setSubtype(subtypeOptions[0]?.subtype ?? null)
        setStep(1.5)
      } else {
        setSubtype(null)
        setStep(2)
      }
      return
    }
    if (step === 1.5) { setStep(2); return }
    if (step === 2 && !validateStep2()) return
    if (step === 2) {
      // Skip step 3 when adding a secondary business — owner details already known
      if (addingNew && existingBusiness) {
        void handleSubmit()
      } else {
        setStep(3)
      }
      return
    }
  }

  function back() {
    if (step === 1.5) { setStep(1); return }
    if (step === 2)   { setStep(hasSubtypes ? 1.5 : 1); return }
    if (step === 3)   { setStep(2); return }
  }

  async function handleSubmit() {
    if (!validateStep3()) return
    if (!user) return
    setSubmitting(true)

    const input: BusinessInput = {
      name:         bizName.trim(),
      type:         bizType,
      // Personal: name IS the person's name, no separate owner name field
      owner_name:   bizType === 'personal' ? bizName.trim() : ownerName.trim(),
      phone:        phone.trim(),
      language,
      // Personal accounts have no shop hours
      closing_time: bizType === 'personal' ? null : (closingTime || null),
    }

    const { data: newBiz, error } = await createBusiness(input, user.id)

    if (error && /duplicate|unique|constraint/i.test(error.message)) {
      await refreshProfile()
      setSubmitting(false)
      navigate('/app')
      return
    }

    if (error && /maximum of 3/i.test(error.message)) {
      notify({ tone: 'danger', title: t('auth.errors.businessLimitReached') })
      setSubmitting(false)
      navigate('/select-business')
      return
    }

    if (error) {
      notify({ tone: 'danger', title: t('auth.errors.generic'), description: error.message })
      setSubmitting(false)
      return
    }

    // Resolve products & expenses: sub-type overrides parent config if chosen
    const subtypeConf  = subtype ? getSubtypeConfig(subtype) : null
    const parentConfig = getBusinessConfig(bizType)
    const products     = subtypeConf?.starterProducts ?? parentConfig.starterProducts
    const isService    = parentConfig.isServiceBased

    // Always seed starter products for a new business (addingNew).
    // For the first business only skip if products already exist (idempotent guard).
    // Starter expenses are no longer seeded — users add expenses via the quick picker.
    const { data: existing } = await getProducts()
    const shouldSeed = addingNew || !existing || existing.length === 0
    if (shouldSeed) {
      await Promise.allSettled(
        products.map(p =>
          createProduct({
            name:              p.name,
            sku:               null,
            selling_price:     0,
            cost_price:        null,
            stock_quantity:    isService ? 999999 : 0,
            unit:              p.unit,
            low_stock_threshold: null,
            image_url:         null,
            barcode:           null,
          }, user.id)
        )
      )
    }

    notify({ tone: 'success', title: t('business.createSuccess.title'), description: t('business.createSuccess.desc') })
    await refreshProfile()
    // If adding new, switch to it then go to business picker so user confirms
    if (addingNew && newBiz) {
      await switchBusiness(newBiz.id)
      setSubmitting(false)
      navigate('/select-business', { replace: true })
    } else {
      setSubmitting(false)
      navigate('/app')
    }
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
      <ProgressBar current={step} total={TOTAL_STEPS} />

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
                    'group relative flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all',
                    selected
                      ? 'border-primary bg-primary-soft shadow-sm'
                      : 'border-border bg-surface hover:border-primary/50 hover:bg-background hover:shadow-sm',
                  ].join(' ')}
                >
                  {selected && (
                    <span className="absolute top-2.5 right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span className={[
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    selected
                      ? 'bg-primary text-white'
                      : 'bg-background text-secondary group-hover:bg-primary/10 group-hover:text-primary',
                  ].join(' ')}>
                    <config.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-sm font-semibold leading-snug ${selected ? 'text-primary' : 'text-text'}`}>
                      {t(`businessTypes.${config.type}`)}
                    </span>
                    <span className="text-xs text-secondary leading-snug">
                      {t(`businessTypes.${config.type}_desc`)}
                    </span>
                  </div>
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

      {/* ── Step 1.5: Sub-type picker (service / fnb only) ─────────────── */}
      {step === 1.5 && (
        <div>
          <h1 className="text-2xl font-bold text-text">
            {t(`onboarding.subtype.title.${bizType}`)}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {t(`onboarding.subtype.subtitle`)}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subtypeOptions.map(cfg => {
              const selected = subtype === cfg.subtype
              return (
                <button
                  key={cfg.subtype}
                  type="button"
                  onClick={() => setSubtype(cfg.subtype)}
                  className={[
                    'group relative flex items-start gap-4 rounded-xl border p-4 text-left transition-all',
                    selected
                      ? 'border-primary bg-primary-soft shadow-sm'
                      : 'border-border bg-surface hover:border-primary/50 hover:bg-background hover:shadow-sm',
                  ].join(' ')}
                >
                  {selected && (
                    <span className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  )}
                  <span className={[
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    selected
                      ? 'bg-primary text-white'
                      : 'bg-background text-secondary group-hover:bg-primary/10 group-hover:text-primary',
                  ].join(' ')}>
                    <cfg.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-0.5 pr-5">
                    <span className={`text-sm font-semibold leading-snug ${selected ? 'text-primary' : 'text-text'}`}>
                      {cfg.label}
                    </span>
                    <span className="text-xs text-secondary leading-snug">
                      {cfg.description}
                    </span>
                  </div>
                </button>
              )
            })}
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

      {/* ── Step 2: Name ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold text-text">
            {bizType === 'personal' ? t('onboarding.step2.title') : t('onboarding.step2.titleBusiness')}
          </h1>
          <p className="mt-1 text-sm text-secondary">
            {bizType === 'personal' ? t('onboarding.step2.subtitle') : t('onboarding.step2.subtitleBusiness')}
          </p>

          <div className="mt-6 space-y-4">
            <Input
              label={bizType === 'personal' ? t('business.form.ownerName') : t('business.form.businessName')}
              helperText={bizType === 'personal' ? t('business.form.ownerNameHelper') : t('business.form.businessNameHelper')}
              value={bizName}
              onChange={e => setBizName(e.target.value)}
              onBlur={() => bizName.trim().length < 2 && setErrors(p => ({ ...p, bizName: t('validation.nameMin') }))}
              error={errors.bizName}
              autoFocus
              autoComplete={bizType === 'personal' ? 'name' : 'organization'}
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
            {/* Personal: name was collected in step 2, skip separate owner name */}
            {bizType !== 'personal' && (
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
            )}
            <Input
              label={t('business.form.phone')}
              helperText={t('business.form.phoneHelper')}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              error={errors.phone}
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              autoFocus={bizType === 'personal'}
            />
            <Select
              label={t('business.form.language')}
              helperText={t('business.form.languageHelper')}
              options={languageOptions}
              value={language}
              onChange={e => setLanguage(e.target.value as 'en' | 'am')}
            />
            {/* Closing time only for shop / service businesses */}
            {bizType !== 'personal' && (
              <TimePicker
                label={t('business.form.closingTime')}
                helperText={t('business.form.closingTimeHelper')}
                value={closingTime}
                onChange={setClosingTime}
              />
            )}
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
