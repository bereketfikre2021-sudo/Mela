import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import { Select, type SelectOption } from '../../design-system/Select'
import { supportedLanguages } from '../../locales/i18n'
import type { Business, BusinessInput, BusinessType } from './types'

interface BusinessFormProps {
  mode: 'create' | 'edit'
  initial?: Business
  onSubmit: (input: BusinessInput) => Promise<void>
  submitting: boolean
}

const BUSINESS_TYPES: BusinessType[] = ['retail', 'fnb', 'bakery', 'service']

function isPhoneValid(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length < 7 || trimmed.length > 20) return false
  const digits = trimmed.replace(/\D/g, '')
  return digits.length >= 7
}

/** Shared business-profile form used by onboarding (create) and edit. */
export function BusinessForm({ mode, initial, onSubmit, submitting }: BusinessFormProps) {
  const { t, i18n } = useTranslation()

  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<BusinessType>(initial?.type ?? 'retail')
  const [ownerName, setOwnerName] = useState(initial?.owner_name ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [language, setLanguage] = useState<'en' | 'am'>(
    initial?.language ?? (i18n.resolvedLanguage === 'am' ? 'am' : 'en')
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const typeOptions: SelectOption[] = BUSINESS_TYPES.map((value) => ({
    value,
    label: t(`business.form.types.${value}`)
  }))
  const languageOptions: SelectOption[] = supportedLanguages.map((l) => ({ value: l.code, label: l.label }))

  function validateField(field: string, value: string): string {
    switch (field) {
      case 'name': {
        const trimmed = value.trim()
        if (trimmed.length < 2) return t('validation.nameMin')
        return ''
      }
      case 'ownerName': {
        const trimmed = value.trim()
        if (trimmed.length < 2) return t('validation.nameMin')
        return ''
      }
      case 'phone':
        return isPhoneValid(value) ? '' : t('validation.phone')
      default:
        return ''
    }
  }

  function handleBlur(field: string, value: string) {
    const msg = validateField(field, value)
    setErrors((prev) => ({ ...prev, [field]: msg }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {
      name: validateField('name', name),
      ownerName: validateField('ownerName', ownerName),
      phone: validateField('phone', phone)
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    await onSubmit({ name: name.trim(), type, owner_name: ownerName.trim(), phone: phone.trim(), language })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
      {/* Business */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          {t('business.form.businessSectionTitle')}
        </h2>
        <Input
          label={t('business.form.businessName')}
          helperText={t('business.form.businessNameHelper')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => handleBlur('name', e.target.value)}
          error={errors.name}
          autoComplete="organization"
          maxLength={100}
        />
        <Select
          label={t('business.form.businessType')}
          helperText={t('business.form.businessTypeHelper')}
          options={typeOptions}
          value={type}
          onChange={(e) => setType(e.target.value as BusinessType)}
        />
      </section>

      {/* About you */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          {t('business.form.ownerSectionTitle')}
        </h2>
        <Input
          label={t('business.form.ownerName')}
          helperText={t('business.form.ownerNameHelper')}
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          onBlur={(e) => handleBlur('ownerName', e.target.value)}
          error={errors.ownerName}
          autoComplete="name"
          maxLength={100}
        />
        <Input
          label={t('business.form.phone')}
          helperText={t('business.form.phoneHelper')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={(e) => handleBlur('phone', e.target.value)}
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
          onChange={(e) => setLanguage(e.target.value as 'en' | 'am')}
        />
      </section>

      <Button type="submit" size="lg" loading={submitting} fullWidth>
        {submitting ? t('business.form.submitting') : mode === 'create' ? t('business.form.submitCreate') : t('business.form.submitEdit')}
      </Button>
    </form>
  )
}
