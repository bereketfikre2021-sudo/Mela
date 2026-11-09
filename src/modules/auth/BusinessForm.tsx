import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import { Select, type SelectOption } from '../../design-system/Select'
import { supportedLanguages } from '../../locales/i18n'
import { ALL_BUSINESS_TYPES, type BusinessType } from './businessConfig'
import type { Business, BusinessInput } from './types'

interface BusinessFormProps {
  mode: 'create' | 'edit'
  initial?: Business
  /** Pre-selected type (from the type picker in onboarding) */
  preselectedType?: BusinessType
  onSubmit: (input: BusinessInput) => Promise<void>
  submitting: boolean
}

export function BusinessForm({ mode, initial, preselectedType, onSubmit, submitting }: BusinessFormProps) {
  const { t, i18n } = useTranslation()

  const [name,      setName]      = useState(initial?.name ?? '')
  const [type,      setType]      = useState<BusinessType>(
    (initial?.type as BusinessType) ?? preselectedType ?? 'retail'
  )
  const [ownerName, setOwnerName] = useState(initial?.owner_name ?? '')
  const [phone,     setPhone]     = useState(initial?.phone ?? '')
  const [language,  setLanguage]  = useState<'en' | 'am'>(
    initial?.language ?? (i18n.resolvedLanguage === 'am' ? 'am' : 'en')
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const typeOptions: SelectOption[] = ALL_BUSINESS_TYPES.map(c => ({
    value: c.type,
    label: t(`businessTypes.${c.type}`),
  }))
  const languageOptions: SelectOption[] = supportedLanguages.map(l => ({ value: l.code, label: l.label }))

  function validate(field: string, value: string): string {
    if (field === 'name')      return value.trim().length < 2 ? t('validation.nameMin') : ''
    if (field === 'ownerName') return value.trim().length < 2 ? t('validation.nameMin') : ''
    if (field === 'phone')     return value.trim().length < 7 ? t('validation.phone') : ''
    return ''
  }

  function blur(field: string, value: string) {
    setErrors(prev => ({ ...prev, [field]: validate(field, value) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = {
      name:      validate('name',      name),
      ownerName: validate('ownerName', ownerName),
      phone:     validate('phone',     phone),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    await onSubmit({ name: name.trim(), type, owner_name: ownerName.trim(), phone: phone.trim(), language })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={t('business.form.businessName')}
        helperText={t('business.form.businessNameHelper')}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={e => blur('name', e.target.value)}
        error={errors.name}
        autoComplete="organization"
        maxLength={100}
        autoFocus
      />

      {/* Only show type selector in edit mode — onboarding uses the visual picker */}
      {mode === 'edit' && (
        <Select
          label={t('business.form.businessType')}
          options={typeOptions}
          value={type}
          onChange={e => setType(e.target.value as BusinessType)}
        />
      )}

      <section className="flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
          {t('business.form.ownerSectionTitle')}
        </p>
        <Input
          label={t('business.form.ownerName')}
          helperText={t('business.form.ownerNameHelper')}
          value={ownerName}
          onChange={e => setOwnerName(e.target.value)}
          onBlur={e => blur('ownerName', e.target.value)}
          error={errors.ownerName}
          autoComplete="name"
          maxLength={100}
        />
        <Input
          label={t('business.form.phone')}
          helperText={t('business.form.phoneHelper')}
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onBlur={e => blur('phone', e.target.value)}
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
      </section>

      <Button type="submit" size="lg" loading={submitting} fullWidth>
        {mode === 'create' ? t('business.form.submitCreate') : t('business.form.submitEdit')}
      </Button>
    </form>
  )
}
