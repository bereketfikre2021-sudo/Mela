import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import type { Supplier, SupplierInput } from './types'

interface SupplierFormProps {
  mode: 'add' | 'edit'
  initial?: Supplier
  onSubmit: (input: SupplierInput) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

export function SupplierForm({ mode, initial, onSubmit, onCancel, submitting }: SupplierFormProps) {
  const { t } = useTranslation()

  const [name,    setName]    = useState(initial?.name    ?? '')
  const [phone,   setPhone]   = useState(initial?.phone   ?? '')
  const [email,   setEmail]   = useState(initial?.email   ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [notes,   setNotes]   = useState(initial?.notes   ?? '')
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  function validate(field: string, value: string): string {
    if (field === 'name') return value.trim().length === 0 ? t('validation.required') : ''
    return ''
  }

  function blur(field: string, value: string) {
    setErrors(prev => ({ ...prev, [field]: validate(field, value) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next = { name: validate('name', name) }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return
    await onSubmit({
      name:    name.trim(),
      phone:   phone.trim()   || null,
      email:   email.trim()   || null,
      address: address.trim() || null,
      notes:   notes.trim()   || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={t('contacts.form.name')}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={e => blur('name', e.target.value)}
        error={errors.name}
        autoComplete="off"
        maxLength={200}
        autoFocus
      />
      <Input
        label={t('contacts.form.phone')}
        helperText={t('contacts.form.phoneHelper')}
        value={phone}
        onChange={e => setPhone(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        maxLength={30}
      />
      <Input
        label={t('contacts.form.email')}
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        autoComplete="email"
        maxLength={200}
      />
      <Input
        label={t('contacts.form.address')}
        value={address}
        onChange={e => setAddress(e.target.value)}
        autoComplete="off"
        maxLength={500}
      />
      <Input
        label={t('contacts.form.notes')}
        helperText={t('contacts.form.notesHelper')}
        value={notes}
        onChange={e => setNotes(e.target.value)}
        maxLength={1000}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === 'add' ? t('contacts.form.submitAdd') : t('contacts.form.submitEdit')}
        </Button>
      </div>
    </form>
  )
}
