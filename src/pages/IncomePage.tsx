/**
 * IncomePage — personal finance income tracker.
 *
 * Two-step flow:
 *  1. Tap an income source tile
 *  2. Enter amount + optional note → submit (date/time auto-captured)
 *
 * Below the add button: history list of all recorded income entries.
 */
import { useEffect, useRef, useState } from 'react'
import {
  Banknote,
  Briefcase,
  Building2,
  ChevronRight,
  Gift,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { useAuth } from '../modules/auth/AuthContext'
import { createIncomeEntry, deleteIncomeEntry } from '../modules/income/api'
import { useIncome } from '../modules/income/useIncome'
import { INCOME_SOURCES, type IncomeEntry, type IncomeSource } from '../modules/income/types'
import { Input } from '../design-system/Input'
import type { LucideIcon } from 'lucide-react'

// ── Source metadata ───────────────────────────────────────────────────────────
const SOURCE_META: Record<IncomeSource, { icon: LucideIcon; colour: string; label: string }> = {
  salary:     { icon: Briefcase,   colour: 'bg-blue-100 text-blue-700',     label: 'Salary'      },
  freelance:  { icon: Wallet,      colour: 'bg-purple-100 text-purple-700', label: 'Freelance'   },
  business:   { icon: Building2,   colour: 'bg-indigo-100 text-indigo-700', label: 'Business'    },
  rental:     { icon: Banknote,    colour: 'bg-green-100 text-green-700',   label: 'Rental'      },
  investment: { icon: TrendingUp,  colour: 'bg-teal-100 text-teal-700',     label: 'Investment'  },
  gift:       { icon: Gift,        colour: 'bg-pink-100 text-pink-700',     label: 'Gift'        },
  other:      { icon: TrendingDown, colour: 'bg-gray-100 text-gray-700',   label: 'Other'       },
}

function fmtAmount(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

type Step = 'source' | 'amount'
type DialogMode = 'add' | 'delete' | null

export function IncomePage() {
  const { t }      = useTranslation()
  const { user, activeBusiness }   = useAuth()
  const { notify } = useNotification()
  const { entries, status, errorMessage, reload } = useIncome()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected,   setSelected]   = useState<IncomeEntry | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Add flow state
  const [step,         setStep]        = useState<Step>('source')
  const [source,       setSource]      = useState<IncomeSource | null>(null)
  const [amount,       setAmount]      = useState('')
  const [note,         setNote]        = useState('')
  const [amountError,  setAmountError] = useState('')
  const [capturedAt,   setCapturedAt]  = useState<Date>(new Date())
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 'amount') setTimeout(() => amountRef.current?.focus(), 50)
  }, [step])

  function openAdd() {
    setCapturedAt(new Date())
    setStep('source')
    setSource(null)
    setAmount('')
    setNote('')
    setAmountError('')
    setDialogMode('add')
  }

  function closeDialog() {
    setDialogMode(null)
    setSelected(null)
  }

  function handlePickSource(s: IncomeSource) {
    setSource(s)
    setStep('amount')
  }

  function handleBack() {
    setStep('source')
    setAmount('')
    setAmountError('')
  }

  async function handleSubmit() {
    const n = parseFloat(amount)
    if (!amount || isNaN(n) || n <= 0) {
      setAmountError(t('expenses.form.errors.invalidAmount'))
      return
    }
    if (!source || !user) return
    setSubmitting(true)
    const { error } = await createIncomeEntry(
      {
        source,
        amount:      parseFloat(n.toFixed(2)),
        note:        note.trim() || null,
        received_at: capturedAt.toISOString(),
      },
      user.id,
      activeBusiness?.id
    )
    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('income.notifications.added') })
    closeDialog()
    await reload()
  }

  async function handleDelete() {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await deleteIncomeEntry(selected.id, user.id)
    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('income.notifications.deleted') })
    closeDialog()
    await reload()
  }

  const totalIncome = entries.reduce((s, e) => s + e.amount, 0)

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-xl" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState
          icon={TrendingUp}
          title={t('notification.error.title')}
          description={errorMessage ?? t('notification.error.desc')}
          action={<Button variant="secondary" onClick={() => void reload()}>{t('products.retry')}</Button>}
        />
      </div>
    )
  }

  return (
    <>
      <div className="py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="heading text-2xl md:text-3xl">{t('income.title')}</h1>
            <p className="mt-1 text-sm text-secondary">
              {entries.length === 0 ? t('income.subtitle') : t('income.totalLabel', { amount: fmtAmount(totalIncome) })}
            </p>
          </div>
          <Button
            size="sm"
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={openAdd}
          >
            {t('income.addIncome')}
          </Button>
        </div>

        {/* Summary card */}
        {entries.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">{t('income.totalIncome')}</p>
            <p className="mt-1 text-3xl font-bold text-success">{fmtAmount(totalIncome)}</p>
            <p className="mt-0.5 text-xs text-muted">{t('income.entryCount', { count: entries.length })}</p>
          </div>
        )}

        {/* Empty */}
        {entries.length === 0 && (
          <EmptyState
            icon={TrendingUp}
            title={t('income.empty.title')}
            description={t('income.empty.desc')}
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
                {t('income.addIncome')}
              </Button>
            }
          />
        )}

        {/* History list */}
        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map(entry => {
              const meta = SOURCE_META[entry.source]
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.colour}`}>
                    <meta.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{meta.label}</p>
                    <p className="truncate text-xs text-secondary">
                      {entry.note ? entry.note : fmtDateTime(entry.received_at)}
                    </p>
                    {entry.note && (
                      <p className="truncate text-xs text-muted">{fmtDateTime(entry.received_at)}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-success">{fmtAmount(entry.amount)}</p>
                  <button
                    type="button"
                    onClick={() => { setSelected(entry); setDialogMode('delete') }}
                    aria-label={t('income.deleteEntry')}
                    className="ml-1 shrink-0 rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add dialog ──────────────────────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'add'}
        onOpenChange={o => { if (!o) closeDialog() }}
        title={t('income.addIncome')}
        closeLabel={t('common.close')}
      >
        {step === 'source' && (
          <div>
            <p className="mb-3 text-sm text-secondary">{t('income.pickSource')}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {INCOME_SOURCES.map(s => {
                const meta = SOURCE_META[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handlePickSource(s)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-center transition-all hover:border-primary/50 hover:shadow-sm active:scale-95"
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-full ${meta.colour}`}>
                      <meta.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-xs font-medium leading-tight text-text">{t(`income.sources.${s}`)}</span>
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="ghost" size="sm" onClick={closeDialog}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {step === 'amount' && source && (() => {
          const srcMeta = SOURCE_META[source]
          const SrcIcon = srcMeta.icon
          return (
          <div className="flex flex-col gap-4">
            {/* Selected source chip + back */}
            <button
              type="button"
              onClick={handleBack}
              className="flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${srcMeta.colour}`}>
                <SrcIcon className="h-3.5 w-3.5" />
              </span>
              <span>{t(`income.sources.${source}`)}</span>
              <ChevronRight className="h-3.5 w-3.5 rotate-180 text-secondary" />
            </button>

            {/* Auto date/time */}
            <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-secondary">
              <span className="font-medium text-text">{t('expenses.quick.recordedAt')}</span>
              <span>{capturedAt.toLocaleDateString('en-ET', {
                weekday: 'short', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}</span>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                {t('income.amount')}
                <span className="ml-1 text-secondary">ETB</span>
              </label>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => { setAmount(e.target.value); setAmountError('') }}
                placeholder="0.00"
                className={[
                  'block w-full rounded-lg border bg-surface px-3 py-2.5 text-2xl font-semibold text-text',
                  'placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30',
                  amountError ? 'border-danger' : 'border-border',
                ].join(' ')}
              />
              {amountError && <p className="mt-1 text-xs text-danger">{amountError}</p>}
            </div>

            {/* Note */}
            <Input
              label={t('expenses.quick.note')}
              helperText={t('income.noteHelper')}
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
              placeholder={t('income.notePlaceholder')}
            />

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={handleBack} disabled={submitting} fullWidth>
                {t('common.back')}
              </Button>
              <Button loading={submitting} onClick={() => void handleSubmit()} fullWidth>
                {t('income.addIncome')}
              </Button>
            </div>
          </div>
          )
        })()}
      </Dialog>

      {/* ── Delete dialog ────────────────────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'delete' && selected !== null}
        onOpenChange={o => { if (!o) closeDialog() }}
        title={t('income.delete.title')}
        description={t('income.delete.desc', {
          source: selected ? t(`income.sources.${selected.source}`) : '',
          amount: selected ? fmtAmount(selected.amount) : '',
        })}
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={submitting}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={submitting} onClick={() => void handleDelete()}>{t('common.delete')}</Button>
          </>
        }
      />
    </>
  )
}
