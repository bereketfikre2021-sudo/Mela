/**
 * QuickExpenseForm
 *
 * A fast, tap-first expense entry flow:
 *  1. Pick a category from icon tiles
 *  2. Enter the amount
 *  3. Optionally add a short note
 *  4. Submit — date/time is captured automatically
 *
 * Used for the Add dialog on all expense pages.
 * Edit mode still uses the full ExpenseForm (needs date control etc.).
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Banknote,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  ChevronRight,
  CircleDollarSign,
  Dumbbell,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  Home,
  Package,
  Paintbrush,
  PiggyBank,
  Plug,
  ShoppingCart,
  Stethoscope,
  Truck,
  UtensilsCrossed,
  Wrench,
  Zap,
} from 'lucide-react'
import { Button } from '../../design-system/Button'
import { Input } from '../../design-system/Input'
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseInput } from './types'
import type { LucideIcon } from 'lucide-react'

// ── Category icon + colour map ────────────────────────────────────────────────
const CATEGORY_META: Record<ExpenseCategory, { icon: LucideIcon; colour: string; label: string }> = {
  rent:             { icon: Home,              colour: 'bg-blue-100 text-blue-700',      label: 'Rent'              },
  utilities:        { icon: Plug,              colour: 'bg-yellow-100 text-yellow-700',  label: 'Utilities'         },
  transport:        { icon: Bike,              colour: 'bg-orange-100 text-orange-700',  label: 'Transport'         },
  food_ingredients: { icon: UtensilsCrossed,   colour: 'bg-green-100 text-green-700',   label: 'Food'              },
  supplies:         { icon: ShoppingCart,      colour: 'bg-purple-100 text-purple-700', label: 'Supplies'          },
  salaries:         { icon: Briefcase,         colour: 'bg-indigo-100 text-indigo-700', label: 'Salaries'          },
  marketing:        { icon: Paintbrush,        colour: 'bg-pink-100 text-pink-700',     label: 'Marketing'         },
  maintenance:      { icon: Wrench,            colour: 'bg-stone-100 text-stone-700',   label: 'Maintenance'       },
  packaging:        { icon: Package,           colour: 'bg-amber-100 text-amber-700',   label: 'Packaging'         },
  bank_charges:     { icon: PiggyBank,         colour: 'bg-teal-100 text-teal-700',     label: 'Bank / Savings'    },
  taxes_fees:       { icon: CircleDollarSign,  colour: 'bg-red-100 text-red-700',       label: 'Taxes & Fees'      },
  equipment:        { icon: Zap,               colour: 'bg-cyan-100 text-cyan-700',     label: 'Equipment'         },
  other:            { icon: HandCoins,         colour: 'bg-gray-100 text-gray-700',     label: 'Other'             },
}

// Extra personal-finance tiles that map to existing categories
// (shown only when personalMode = true)
const PERSONAL_EXTRAS: { key: string; category: ExpenseCategory; icon: LucideIcon; colour: string; label: string }[] = [
  { key: 'health',    category: 'supplies',   icon: Stethoscope,     colour: 'bg-rose-100 text-rose-700',    label: 'Health'         },
  { key: 'education', category: 'supplies',   icon: GraduationCap,   colour: 'bg-sky-100 text-sky-700',      label: 'Education'      },
  { key: 'family',    category: 'other',      icon: Heart,           colour: 'bg-fuchsia-100 text-fuchsia-700', label: 'Family'      },
  { key: 'social',    category: 'other',      icon: Gift,            colour: 'bg-lime-100 text-lime-700',    label: 'Social / Gifts' },
  { key: 'fitness',   category: 'other',      icon: Dumbbell,        colour: 'bg-emerald-100 text-emerald-700', label: 'Fitness'     },
  { key: 'loans',     category: 'bank_charges', icon: Banknote,      colour: 'bg-violet-100 text-violet-700', label: 'Loan / Equb'  },
  { key: 'business',  category: 'other',      icon: Building2,       colour: 'bg-slate-100 text-slate-700',  label: 'Business exp.'  },
  { key: 'delivery',  category: 'transport',  icon: Truck,           colour: 'bg-orange-100 text-orange-700', label: 'Delivery'      },
  { key: 'reading',   category: 'supplies',   icon: BookOpen,        colour: 'bg-indigo-100 text-indigo-700', label: 'Books / Media' },
]

function formatDateTime(d: Date): string {
  return d.toLocaleDateString('en-ET', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface QuickExpenseFormProps {
  onSubmit:    (input: ExpenseInput) => Promise<void>
  onCancel:    () => void
  submitting:  boolean
  /** When true, shows personal-friendly category tiles */
  personalMode?: boolean
}

export function QuickExpenseForm({
  onSubmit, onCancel, submitting, personalMode = false,
}: QuickExpenseFormProps) {
  const { t } = useTranslation()

  const [step,         setStep]        = useState<'category' | 'amount'>('category')
  const [category,     setCategory]    = useState<ExpenseCategory | null>(null)
  // For personal extras we store an override label
  const [categoryLabel, setCategoryLabel] = useState<string>('')
  const [amount,       setAmount]      = useState('')
  const [note,         setNote]        = useState('')
  const [amountError,  setAmountError] = useState('')
  const [capturedAt]                   = useState(() => new Date())

  const amountRef = useRef<HTMLInputElement>(null)

  // Auto-focus amount input when step changes
  useEffect(() => {
    if (step === 'amount') {
      setTimeout(() => amountRef.current?.focus(), 50)
    }
  }, [step])

  // Build tile list
  const standardTiles = EXPENSE_CATEGORIES.map(c => ({
    key:      c,
    category: c,
    icon:     CATEGORY_META[c].icon,
    colour:   CATEGORY_META[c].colour,
    label:    t(`expenses.categories.${c}`),
  }))

  const tiles = personalMode
    ? [
        ...PERSONAL_EXTRAS.map(e => ({ ...e, label: e.label })),
        ...standardTiles.filter(t =>
          !['salaries', 'marketing', 'packaging'].includes(t.key)
        ),
      ]
    : standardTiles

  function handlePickCategory(cat: ExpenseCategory, label: string) {
    setCategory(cat)
    setCategoryLabel(label)
    setStep('amount')
  }

  function handleBack() {
    setStep('category')
    setAmount('')
    setAmountError('')
  }

  async function handleSubmit() {
    const n = parseFloat(amount)
    if (!amount || isNaN(n) || n <= 0) {
      setAmountError(t('expenses.form.errors.invalidAmount'))
      return
    }
    if (!category) return

    // Use captured date (auto, no user input)
    const expenseDate = capturedAt.toISOString().slice(0, 10)

    await onSubmit({
      title:        categoryLabel || t(`expenses.categories.${category}`),
      amount:       parseFloat(n.toFixed(2)),
      category,
      description:  note.trim() || null,
      expense_date: expenseDate,
    })
  }

  // ── Step 1: Category picker ────────────────────────────────────────────────
  if (step === 'category') {
    return (
      <div>
        <p className="mb-3 text-sm text-secondary">{t('expenses.quick.pickCategory')}</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {tiles.map(tile => (
            <button
              key={tile.key}
              type="button"
              onClick={() => handlePickCategory(tile.category, tile.label)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 text-center transition-all hover:border-primary/50 hover:shadow-sm active:scale-95"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${tile.colour}`}>
                <tile.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs font-medium leading-tight text-text">{tile.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 2: Amount + note ─────────────────────────────────────────────────
  const meta = category ? CATEGORY_META[category] : null

  return (
    <div className="flex flex-col gap-4">
      {/* Selected category chip + back */}
      <button
        type="button"
        onClick={handleBack}
        className="flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface"
      >
        {meta && (
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.colour}`}>
            <meta.icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span>{categoryLabel}</span>
        <ChevronRight className="h-3.5 w-3.5 rotate-180 text-secondary" />
      </button>

      {/* Auto date/time — read only, shown as info */}
      <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-secondary">
        <span className="font-medium text-text">{t('expenses.quick.recordedAt')}</span>
        <span>{formatDateTime(capturedAt)}</span>
      </div>

      {/* Amount */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          {t('expenses.form.amount')}
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
        {amountError && (
          <p className="mt-1 text-xs text-danger">{amountError}</p>
        )}
      </div>

      {/* Note (optional) */}
      <Input
        label={t('expenses.quick.note')}
        helperText={t('expenses.quick.noteHelper')}
        value={note}
        onChange={e => setNote(e.target.value)}
        maxLength={200}
        placeholder={t('expenses.quick.notePlaceholder')}
      />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={handleBack} disabled={submitting} fullWidth>
          {t('common.back')}
        </Button>
        <Button loading={submitting} onClick={() => void handleSubmit()} fullWidth>
          {t('expenses.quick.add')}
        </Button>
      </div>
    </div>
  )
}
