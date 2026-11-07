import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import { Select, type SelectOption } from '../../design-system/Select'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseInput } from './types'

interface ExpenseFormProps {
  mode: 'add' | 'edit'
  initial?: Expense
  onSubmit: (input: ExpenseInput) => Promise<void>
  onCancel: () => void
  submitting: boolean
}

function toDateInput(iso: string): string {
  // expense_date is YYYY-MM-DD; keep it as-is for <input type="date">
  return iso.slice(0, 10)
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Shared expense form used by add and edit dialogs. */
export function ExpenseForm({ mode, initial, onSubmit, onCancel, submitting }: ExpenseFormProps) {
  const { t } = useTranslation()

  const [title,       setTitle]       = useState(initial?.title ?? '')
  const [amount,      setAmount]      = useState(initial?.amount.toString() ?? '')
  const [category,    setCategory]    = useState<ExpenseCategory>(initial?.category ?? 'other')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [date,        setDate]        = useState(initial ? toDateInput(initial.expense_date) : todayISO())
  const [errors,      setErrors]      = useState<Record<string, string>>({})

  const categoryOptions: SelectOption[] = EXPENSE_CATEGORIES.map(c => ({
    value: c,
    label: t(`expenses.categories.${c}`),
  }))

  function validate(field: string, value: string): string {
    if (field === 'title')  return value.trim().length === 0 ? t('validation.required') : ''
    if (field === 'amount') {
      const n = parseFloat(value)
      return isNaN(n) || n <= 0 ? t('expenses.form.errors.invalidAmount') : ''
    }
    if (field === 'date')   return value.trim().length === 0 ? t('validation.required') : ''
    return ''
  }

  function blur(field: string, value: string) {
    setErrors(prev => ({ ...prev, [field]: validate(field, value) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {
      title:  validate('title',  title),
      amount: validate('amount', amount),
      date:   validate('date',   date),
    }
    setErrors(next)
    if (Object.values(next).some(Boolean)) return

    await onSubmit({
      title:        title.trim(),
      amount:       parseFloat(parseFloat(amount).toFixed(2)),
      category,
      description:  description.trim() || null,
      expense_date: date,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label={t('expenses.form.title')}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={e => blur('title', e.target.value)}
        error={errors.title}
        autoComplete="off"
        maxLength={200}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('expenses.form.amount')}
          helperText="ETB"
          inputMode="decimal"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onBlur={e => blur('amount', e.target.value)}
          error={errors.amount}
        />
        <Input
          label={t('expenses.form.date')}
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          onBlur={e => blur('date', e.target.value)}
          error={errors.date}
        />
      </div>

      <Select
        label={t('expenses.form.category')}
        options={categoryOptions}
        value={category}
        onChange={e => setCategory(e.target.value as ExpenseCategory)}
      />

      <Input
        label={t('expenses.form.description')}
        helperText={t('expenses.form.descriptionHelper')}
        value={description}
        onChange={e => setDescription(e.target.value)}
        maxLength={500}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === 'add' ? t('expenses.form.submitAdd') : t('expenses.form.submitEdit')}
        </Button>
      </div>
    </form>
  )
}
