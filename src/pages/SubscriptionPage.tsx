/**
 * SubscriptionPage — Phase 11 Stage 3.
 *
 * Sections:
 *   1. Current plan card
 *   2. Pricing table with monthly/yearly toggle
 *   3. Payment submission form (shown when upgrading)
 *   4. Free plan usage display (progress bars)
 *   5. Payment history table
 */
import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select } from '../design-system/Select'
import { StatusBadge } from '../design-system/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useAuth } from '../modules/auth/AuthContext'
import { getPaymentHistory, submitPayment } from '../modules/subscriptions/api'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import type { PaymentSubmission } from '../modules/subscriptions/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const MONTHLY_PRICE = 299
const YEARLY_PRICE = 2499

// ── Sub-components ────────────────────────────────────────────────────────────

/** A labelled progress bar for usage limits. */
function UsageBar({
  label,
  used,
  max,
}: {
  label: string
  used: number
  max: number
}) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0
  const danger = pct >= 90
  const warning = pct >= 70 && !danger

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text">{label}</span>
        <span className="text-secondary tabular-nums">
          {used} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-background border border-border">
        <div
          className={`h-full rounded-full transition-all ${
            danger ? 'bg-danger' : warning ? 'bg-warning' : 'bg-primary'
          }`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        />
      </div>
    </div>
  )
}

/** A single plan card in the pricing table. */
function PlanCard({
  name,
  price,
  priceLabel,
  features,
  isCurrent,
  isHighlighted,
  onSelect,
  selectLabel,
  disabled,
}: {
  name: string
  price: string
  priceLabel: string
  features: string[]
  isCurrent: boolean
  isHighlighted: boolean
  onSelect?: () => void
  selectLabel: string
  disabled?: boolean
}) {
  return (
    <div
      className={`flex flex-1 flex-col rounded-xl border p-5 ${
        isHighlighted
          ? 'border-primary bg-primary-soft shadow-sm'
          : 'border-border bg-surface'
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-text">{name}</h3>
        {isCurrent && (
          <StatusBadge tone="success" dot>
            Current plan
          </StatusBadge>
        )}
      </div>
      <p className="mb-1 text-3xl font-bold text-text">{price}</p>
      <p className="mb-5 text-sm text-secondary">{priceLabel}</p>
      <ul className="mb-6 flex flex-col gap-2 text-sm text-text">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true">
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      {!isCurrent && onSelect && (
        <Button
          variant={isHighlighted ? 'primary' : 'secondary'}
          className="mt-auto w-full"
          onClick={onSelect}
          disabled={disabled}
        >
          {selectLabel}
        </Button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SubscriptionPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { plan, status, isActive, limits, loading: subLoading, refresh, usageCounts } =
    useSubscription()
  const { notify } = useNotification()

  // Pricing toggle
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // Payment form visibility
  const [showForm, setShowForm] = useState(false)

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<
    'telebirr' | 'cbe_birr' | 'bank_transfer'
  >('telebirr')
  const [txRef, setTxRef] = useState('')
  const [txRefError, setTxRefError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Payment history
  const [history, setHistory] = useState<PaymentSubmission[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  // Load payment history
  useEffect(() => {
    if (!user) return
    setHistoryLoading(true)
    void getPaymentHistory(user.id).then(({ data, error }) => {
      setHistoryLoading(false)
      if (error) {
        setHistoryError(error.message)
        return
      }
      setHistory(data ?? [])
    })
  }, [user])

  // Show form when a premium cycle is chosen
  function handleSelectPremium() {
    setShowForm(true)
    setTxRef('')
    setTxRefError('')
  }

  // Validate and submit payment
  async function handleSubmitPayment() {
    const trimmed = txRef.trim()
    if (trimmed.length < 4 || trimmed.length > 100) {
      setTxRefError(t('subscription.form.txRefError'))
      return
    }
    if (!user) return
    setSubmitting(true)
    const amount = billingCycle === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE
    const { error } = await submitPayment(user.id, {
      plan: 'premium',
      billing_cycle: billingCycle,
      amount_etb: amount,
      payment_method: paymentMethod,
      transaction_reference: trimmed,
    })
    setSubmitting(false)
    if (error) {
      notify({
        tone: 'danger',
        title: t('notification.error.title'),
        description: error.message,
      })
      return
    }
    notify({
      tone: 'success',
      title: t('subscription.form.submitSuccess'),
    })
    setShowForm(false)
    setTxRef('')
    // Refresh history
    if (user) {
      const { data } = await getPaymentHistory(user.id)
      if (data) setHistory(data)
    }
    await refresh()
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (subLoading) {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  // ── Derived display values ──────────────────────────────────────────────────
  const planName = plan === 'premium' ? t('subscription.plan.premium') : t('subscription.plan.free')
  const premiumPrice = billingCycle === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE

  function statusBadgeTone(s: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
    if (s === 'active') return 'success'
    if (s === 'grace') return 'warning'
    if (s === 'expired' || s === 'cancelled') return 'danger'
    if (s === 'pending_payment') return 'warning'
    return 'neutral'
  }

  function statusLabel(s: string | null): string {
    if (!s) return plan === 'free' ? t('subscription.status.free') : t('subscription.status.unknown')
    return t(`subscription.status.${s}`)
  }

  const freeFeatures = [
    t('subscription.features.products50'),
    t('subscription.features.sales100'),
    t('subscription.features.customers50'),
    t('subscription.features.suppliers5'),
    t('subscription.features.purchases10'),
    t('subscription.features.basicReports'),
    t('subscription.features.history30'),
  ]

  const premiumFeatures = [
    t('subscription.features.unlimitedProducts'),
    t('subscription.features.unlimitedSales'),
    t('subscription.features.unlimitedCustomers'),
    t('subscription.features.unlimitedSuppliers'),
    t('subscription.features.unlimitedPurchases'),
    t('subscription.features.advancedReports'),
    t('subscription.features.fullHistory'),
  ]

  const isCurrentFree = plan === 'free'
  const isCurrentMonthly = isActive && billingCycle === 'monthly'
  const isCurrentYearly = isActive && billingCycle === 'yearly'

  return (
    <div className="py-6 md:py-10">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="heading text-2xl md:text-3xl">{t('subscription.title')}</h1>
        <p className="mt-1 text-sm text-secondary">{t('subscription.subtitle')}</p>
      </div>

      {/* ── Section 1: Current plan card ─────────────────────────────────── */}
      <section aria-labelledby="current-plan-heading" className="mb-8">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 id="current-plan-heading" className="mb-3 text-sm font-medium text-secondary uppercase tracking-wide">
            {t('subscription.currentPlan.heading')}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xl font-bold text-text">{planName}</span>
            <StatusBadge tone={statusBadgeTone(status)} dot>
              {statusLabel(status)}
            </StatusBadge>
          </div>

          {/* Free plan price */}
          {isCurrentFree && (
            <p className="mt-2 text-2xl font-semibold text-figures">ETB 0</p>
          )}

          {/* Premium period */}
          {plan === 'premium' && (
            <div className="mt-3 space-y-1 text-sm text-secondary">
              {status === 'active' && (
                <p>
                  {t('subscription.currentPlan.periodEnd')}{' '}
                  <span className="font-medium text-text">
                    {/* current_period_end not directly in context; shown via history */}
                    {t('subscription.currentPlan.periodEndSeeHistory')}
                  </span>
                </p>
              )}
              {status === 'grace' && (
                <p className="text-warning">
                  {t('subscription.currentPlan.graceNotice')}
                </p>
              )}
              {status === 'pending_payment' && (
                <p className="text-warning">
                  {t('subscription.currentPlan.pendingPaymentNotice')}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: Pricing table ──────────────────────────────────────── */}
      <section aria-labelledby="pricing-heading" className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="pricing-heading" className="text-lg font-semibold text-text">
            {t('subscription.pricing.heading')}
          </h2>
          {/* Monthly / Yearly toggle */}
          <div
            className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-sm"
            role="group"
            aria-label={t('subscription.pricing.billingToggleLabel')}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-white'
                  : 'text-secondary hover:text-text'
              }`}
            >
              {t('subscription.pricing.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-white'
                  : 'text-secondary hover:text-text'
              }`}
            >
              {t('subscription.pricing.yearly')}
              <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 text-xs text-success">
                {t('subscription.pricing.yearlySavings')}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Free plan card */}
          <PlanCard
            name={t('subscription.plan.free')}
            price="ETB 0"
            priceLabel={t('subscription.pricing.freeForever')}
            features={freeFeatures}
            isCurrent={isCurrentFree}
            isHighlighted={false}
            selectLabel={t('subscription.pricing.currentPlanLabel')}
          />

          {/* Premium plan card */}
          <PlanCard
            name={t('subscription.plan.premium')}
            price={`ETB ${billingCycle === 'monthly' ? MONTHLY_PRICE : YEARLY_PRICE}`}
            priceLabel={
              billingCycle === 'monthly'
                ? t('subscription.pricing.perMonth')
                : t('subscription.pricing.perYear')
            }
            features={premiumFeatures}
            isCurrent={billingCycle === 'monthly' ? isCurrentMonthly : isCurrentYearly}
            isHighlighted
            onSelect={handleSelectPremium}
            selectLabel={t('subscription.pricing.upgrade')}
            disabled={isActive}
          />
        </div>
      </section>

      {/* ── Section 3: Payment submission form ────────────────────────────── */}
      {showForm && !isActive && (
        <section aria-labelledby="payment-form-heading" className="mb-8">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 id="payment-form-heading" className="mb-4 text-lg font-semibold text-text">
              {t('subscription.form.heading')}
            </h2>

            <div className="flex flex-col gap-4 max-w-md">
              {/* Amount (read-only) */}
              <div className="rounded-lg border border-border bg-background px-4 py-3">
                <p className="text-xs text-secondary">{t('subscription.form.amount')}</p>
                <p className="text-xl font-bold text-figures">
                  ETB {premiumPrice.toLocaleString('en-ET')}
                  <span className="ml-1 text-sm font-normal text-secondary">
                    {billingCycle === 'monthly'
                      ? t('subscription.pricing.perMonth')
                      : t('subscription.pricing.perYear')}
                  </span>
                </p>
              </div>

              {/* Payment method */}
              <Select
                label={t('subscription.form.paymentMethod')}
                options={[
                  { value: 'telebirr', label: 'Telebirr' },
                  { value: 'cbe_birr', label: 'CBE Birr' },
                  { value: 'bank_transfer', label: t('subscription.form.bankTransfer') },
                ]}
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'telebirr' | 'cbe_birr' | 'bank_transfer'
                  )
                }
              />

              {/* Transaction reference */}
              <Input
                label={t('subscription.form.txRef')}
                helperText={t('subscription.form.txRefHelper')}
                value={txRef}
                onChange={(e) => {
                  setTxRef(e.target.value)
                  setTxRefError('')
                }}
                error={txRefError}
                maxLength={100}
              />

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  loading={submitting}
                  onClick={() => void handleSubmitPayment()}
                >
                  {t('subscription.form.submit')}
                </Button>
                <Button
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => setShowForm(false)}
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: Usage display (Free plan) ──────────────────────────── */}
      {(isCurrentFree || subLoading) && limits && (
        <section aria-labelledby="usage-heading" className="mb-8">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 id="usage-heading" className="mb-4 text-lg font-semibold text-text">
              {t('subscription.usage.heading')}
            </h2>
            <div className="flex flex-col gap-4">
              <UsageBar
                label={t('subscription.usage.products')}
                used={usageCounts.products}
                max={limits.max_products}
              />
              <UsageBar
                label={t('subscription.usage.customers')}
                used={usageCounts.customers}
                max={limits.max_customers}
              />
              <UsageBar
                label={t('subscription.usage.suppliers')}
                used={usageCounts.suppliers}
                max={limits.max_suppliers}
              />
              <UsageBar
                label={t('subscription.usage.salesThisMonth')}
                used={usageCounts.salesThisMonth}
                max={limits.max_sales_per_month}
              />
              <UsageBar
                label={t('subscription.usage.purchasesThisMonth')}
                used={usageCounts.purchasesThisMonth}
                max={limits.max_purchases_per_month}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── Section 5: Payment history ────────────────────────────────────── */}
      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 text-lg font-semibold text-text">
          {t('subscription.history.heading')}
        </h2>

        {historyLoading ? (
          <div className="space-y-px rounded-lg border border-border overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        ) : historyError ? (
          <EmptyState
            icon={CreditCard}
            title={t('notification.error.title')}
            description={historyError}
          />
        ) : history.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t('subscription.history.empty.title')}
            description={t('subscription.history.empty.desc')}
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('subscription.history.col.date')}</TableHead>
                  <TableHead>{t('subscription.history.col.plan')}</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t('subscription.history.col.cycle')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('subscription.history.col.amount')}
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t('subscription.history.col.method')}
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t('subscription.history.col.reference')}
                  </TableHead>
                  <TableHead>{t('subscription.history.col.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-secondary">
                      {fmtDate(row.submitted_at)}
                    </TableCell>
                    <TableCell className="font-medium capitalize">
                      {row.plan}
                    </TableCell>
                    <TableCell className="hidden capitalize text-secondary sm:table-cell">
                      {row.billing_cycle}
                    </TableCell>
                    <TableCell className="text-right text-figures tabular-nums">
                      ETB {row.amount_etb.toLocaleString('en-ET')}
                    </TableCell>
                    <TableCell className="hidden text-secondary md:table-cell">
                      {row.payment_method === 'telebirr'
                        ? 'Telebirr'
                        : row.payment_method === 'cbe_birr'
                        ? 'CBE Birr'
                        : t('subscription.form.bankTransfer')}
                    </TableCell>
                    <TableCell className="hidden max-w-[120px] truncate text-secondary md:table-cell">
                      {row.transaction_reference}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Payment status badge ──────────────────────────────────────────────────────

function PaymentStatusBadge({
  status,
}: {
  status: 'pending' | 'approved' | 'rejected'
}) {
  const { t } = useTranslation()
  const tone =
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning'
  return (
    <StatusBadge tone={tone} dot>
      {t(`subscription.history.paymentStatus.${status}`)}
    </StatusBadge>
  )
}
