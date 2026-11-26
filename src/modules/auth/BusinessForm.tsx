import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, X } from 'lucide-react'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import { Select, type SelectOption } from '../../design-system/Select'
import { TimePicker } from '../../design-system/TimePicker'
import { supportedLanguages } from '../../locales/i18n'
import { ALL_BUSINESS_TYPES, type BusinessType } from './businessConfig'
import { BusinessAvatar } from '../../components/BusinessAvatar'
import type { Business, BusinessInput } from './types'

interface BusinessFormProps {
  mode: 'create' | 'edit'
  initial?: Business
  preselectedType?: BusinessType
  hasData?: boolean
  /** Called with the input + an optional avatar File to upload */
  onSubmit: (input: BusinessInput, avatarFile?: File) => Promise<void>
  submitting: boolean
}

export function BusinessForm({ mode, initial, preselectedType, hasData = false, onSubmit, submitting }: BusinessFormProps) {
  const { t, i18n } = useTranslation()
  const imgRef      = useRef<HTMLInputElement>(null)

  const [name,         setName]        = useState(initial?.name ?? '')
  const [type,         setType]        = useState<BusinessType>(
    (initial?.type as BusinessType) ?? preselectedType ?? 'retail'
  )
  const [ownerName,    setOwnerName]   = useState(initial?.owner_name ?? '')
  const [phone,        setPhone]       = useState(initial?.phone ?? '')
  const [language,     setLanguage]    = useState<'en' | 'am'>(
    initial?.language ?? (i18n.resolvedLanguage === 'am' ? 'am' : 'en')
  )
  const [closingTime,  setClosingTime] = useState(initial?.closing_time ?? '')
  const [errors,       setErrors]      = useState<Record<string, string>>({})

  // Avatar state
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initial?.avatar_url ?? null)

  const isPersonal = type === 'personal'

  const typeOptions: SelectOption[] = ALL_BUSINESS_TYPES.map(c => ({
    value: c.type,
    label: t(`businessTypes.${c.type}`),
  }))
  const languageOptions: SelectOption[] = supportedLanguages.map(l => ({ value: l.code, label: l.label }))
  const currentTypeLabel = t(`businessTypes.${type}`)

  function validate(field: string, value: string): string {
    if (field === 'name')      return value.trim().length < 2 ? t('validation.nameMin') : ''
    if (field === 'ownerName') return value.trim().length < 2 ? t('validation.nameMin') : ''
    if (field === 'phone')     return value.trim().length < 7 ? t('validation.phone') : ''
    return ''
  }

  function blur(field: string, value: string) {
    setErrors(prev => ({ ...prev, [field]: validate(field, value) }))
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // 2 MB limit
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, avatar: t('business.form.avatarSizeError') }))
      return
    }
    setErrors(prev => ({ ...prev, avatar: '' }))
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function removeAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (imgRef.current) imgRef.current.value = ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const effectiveOwnerName = isPersonal ? name : ownerName
    const next = {
      name:      validate('name',      name),
      ownerName: validate('ownerName', effectiveOwnerName),
      phone:     validate('phone',     phone),
    }
    setErrors(prev => ({ ...prev, ...next }))
    if (Object.values(next).some(Boolean)) return
    await onSubmit(
      {
        name:         name.trim(),
        type,
        owner_name:   effectiveOwnerName.trim(),
        phone:        phone.trim(),
        language,
        closing_time: isPersonal ? null : (closingTime || null),
      },
      avatarFile ?? undefined
    )
  }

  // Build a preview Business object for the avatar component
  const previewBusiness = { name: name || 'B', type, avatar_url: avatarPreview }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

      {/* ── Avatar picker ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {/* Current avatar / fallback icon */}
        <div className="relative shrink-0">
          <BusinessAvatar business={previewBusiness} size="xl" />
          {/* Remove button */}
          {avatarPreview && (
            <button
              type="button"
              onClick={removeAvatar}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-sm hover:bg-danger/90"
              aria-label={t('business.form.removeAvatar')}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-text">{t('business.form.avatar')}</p>
          <p className="text-xs text-secondary">{t('business.form.avatarHelper')}</p>
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            className="flex w-fit items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-surface"
          >
            <Camera className="h-3.5 w-3.5" />
            {avatarPreview ? t('business.form.changeAvatar') : t('business.form.uploadAvatar')}
          </button>
          {errors.avatar && <p className="text-xs text-danger">{errors.avatar}</p>}
        </div>

        <input
          ref={imgRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* ── Business / account name ─────────────────────────────────────────── */}
      <Input
        label={isPersonal ? t('business.form.ownerName') : t('business.form.businessName')}
        helperText={isPersonal ? t('business.form.ownerNameHelper') : t('business.form.businessNameHelper')}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={e => blur('name', e.target.value)}
        error={errors.name}
        autoComplete={isPersonal ? 'name' : 'organization'}
        maxLength={100}
        autoFocus
      />

      {/* ── Type selector (edit only) ───────────────────────────────────────── */}
      {mode === 'edit' && (
        hasData ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-text">{t('business.form.businessType')}</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <span className="text-sm text-text">{currentTypeLabel}</span>
              <span className="ml-auto text-xs text-secondary">{t('business.form.typeLocked')}</span>
            </div>
            <p className="mt-1.5 text-xs text-secondary">{t('business.form.typeLockedHelper')}</p>
          </div>
        ) : (
          <Select
            label={t('business.form.businessType')}
            options={typeOptions}
            value={type}
            onChange={e => setType(e.target.value as BusinessType)}
          />
        )
      )}

      {/* ── Owner / contact details ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        {!isPersonal && (
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {t('business.form.ownerSectionTitle')}
          </p>
        )}

        {!isPersonal && (
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
        )}

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
          autoFocus={isPersonal}
        />
        <Select
          label={t('business.form.language')}
          helperText={t('business.form.languageHelper')}
          options={languageOptions}
          value={language}
          onChange={e => setLanguage(e.target.value as 'en' | 'am')}
        />

        {!isPersonal && (
          <TimePicker
            label={t('business.form.closingTime')}
            helperText={t('business.form.closingTimeHelper')}
            value={closingTime ?? ''}
            onChange={setClosingTime}
          />
        )}
      </section>

      <Button type="submit" size="lg" loading={submitting} fullWidth>
        {mode === 'create' ? t('business.form.submitCreate') : t('business.form.submitEdit')}
      </Button>
    </form>
  )
}
