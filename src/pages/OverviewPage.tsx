import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { useAuth } from '../modules/auth/AuthContext'
import { type DateRange, type FinancialSummary, getFinancialSummary } from '../modules/overview/financials'

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

type Period = 'today' | 'week' | 'month'

function periodRange(p: Period): DateRange {
  const today = new Date()
  if (p === 'today') return { from: toISO(today), to: toISO(today) }
  if (p === 'week') {
    const from = new Date(today); from.setDate(today.getDate() - 6)
    return { from: toISO(from), to: toISO(today) }
  }
  // month
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: toISO(from), to: toISO(today) }
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })
}

// ── Metric card ───────────────────────────────────────────────────────────────

interface MetricProps {
  label: string
  value: string
  sub?: string
  muted?: boolean
  warn?: boolean
}

function Metric({ label, value, sub, muted, warn }: MetricProps) {
  return (
    <div className="border-b border-border py-4 last:border-b-0 md:border-b-0 md:border-r md:py-0 md:pr-6 md:last:border-r-0">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</p>
      <p className={[
        'mt-1 text-2xl text-figures font-semibold',
        muted ? 'text-muted' : warn ? 'text-warning' : 'text-text',
      ].join(' ')}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-secondary">{sub}</p>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { t } = useTranslation()
  const { profile, signOut } = useAuth()

  const [period, setPeriod] = useState<Period>('today')
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const load = useCallback(async (p: Period) => {
    setLoadStatus('loading')
    const { data, error } = await getFinancialSummary(periodRange(p))
    if (error) { setErrorMsg(error.message); setLoadStatus('error'); return }
    setSummary(data)
    setLoadStatus('loaded')
  }, [])

  useEffect(() => { void load(period) }, [load, period])

  function changePeriod(p: Period) { setPeriod(p); void load(p) }

  const periodLabels: { id: Period; label: string }[] = [
    { id: 'today', label: t('overview.period.today') },
    { id: 'week',  label: t('overview.period.week')  },
    { id: 'month', label: t('overview.period.month') },
  ]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <Skeleton className="mb-6 h-8 w-52" />
        <div className="mb-6 flex gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />)}
        </div>
        <Skeleton className="mb-6 h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (loadStatus === 'error') {
    return (
      <div className="py-6 md:py-10 text-center">
        <p className="text-sm text-danger">{errorMsg || t('notification.error.desc')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void load(period)}>
          {t('products.retry')}
        </Button>
      </div>
    )
  }

  const s = summary!

  return (
    <div className="py-6 md:py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="heading text-2xl md:text-3xl">
            {t('app.home.greeting', { name: profile?.owner_name ?? '' })}
          </h1>
          {profile?.name && (
            <p className="mt-1 text-sm text-secondary">{profile.name}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => void signOut()}>
            {t('app.home.logout')}
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-background p-1 w-fit">
        {periodLabels.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => changePeriod(id)}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              period === id
                ? 'bg-surface text-text shadow-sm border border-border'
                : 'text-secondary hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Incomplete cost data notice */}
      {s.cogsIncomplete && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('overview.cogsIncompleteNote')}</span>
        </div>
      )}

      {/* Metrics row */}
      <div className="mb-6 rounded-lg border border-border bg-surface px-6 py-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 md:gap-0">
          <Metric
            label={t('overview.metric.revenue')}
            value={fmtETB(s.paidRevenue)}
          />
          <Metric
            label={t('overview.metric.expenses')}
            value={fmtETB(s.totalExpenses)}
          />
          <Metric
            label={t('overview.metric.grossProfit')}
            value={s.grossProfit !== null ? fmtETB(s.grossProfit) : t('overview.metric.unknown')}
            sub={s.cogsIncomplete ? t('overview.metric.partial') : undefined}
            muted={s.grossProfit === null}
          />
          <Metric
            label={t('overview.metric.netProfit')}
            value={s.netProfit !== null ? fmtETB(s.netProfit) : t('overview.metric.unknown')}
            sub={s.cogsIncomplete ? t('overview.metric.partial') : undefined}
            muted={s.netProfit === null}
            warn={s.netProfit !== null && s.netProfit < 0}
          />
          <Metric
            label={t('overview.metric.pending')}
            value={s.pendingRevenue > 0 ? fmtETB(s.pendingRevenue) : '—'}
            muted={s.pendingRevenue === 0}
          />
        </div>
      </div>

      {/* Recent data — two columns on desktop */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Recent sales */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
            {t('overview.recentSales')}
          </h2>
          {s.sales.length === 0 ? (
            <p className="rounded-lg border border-border px-4 py-6 text-center text-sm text-secondary">
              {t('sales.empty.title')}
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {s.sales.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{sale.sale_number}</p>
                    <p className="text-xs text-secondary">{fmtDate(sale.sold_at)}</p>
                  </div>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <StatusBadge
                      tone={sale.payment_status === 'paid' ? 'success' : 'warning'}
                      dot
                    >
                      {t(`sales.status.${sale.payment_status}`)}
                    </StatusBadge>
                    <span className="text-sm text-figures font-medium">{fmtETB(sale.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent expenses */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
            {t('overview.recentExpenses')}
          </h2>
          {s.expenses.length === 0 ? (
            <p className="rounded-lg border border-border px-4 py-6 text-center text-sm text-secondary">
              {t('expenses.empty.title')}
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {s.expenses.slice(0, 5).map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{exp.title}</p>
                    <p className="text-xs text-secondary">
                      {t(`expenses.categories.${exp.category}`)} · {fmtDate(exp.expense_date)}
                    </p>
                  </div>
                  <span className="ml-4 shrink-0 text-sm text-figures font-medium">
                    {fmtETB(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Profile / settings links */}
      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <Button variant="secondary" size="sm"
          onClick={() => window.location.assign('/app/profile')}>
          {t('app.home.editProfile')}
        </Button>
      </div>
    </div>
  )
}
