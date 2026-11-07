import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { useAuth } from '../modules/auth/AuthContext'
import { type FinancialSummary, getFinancialSummary } from '../modules/overview/financials'
import { type Period, periodRange } from '../modules/overview/dateRange'

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtSaleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtExpenseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })
}

// ── Metric tile ───────────────────────────────────────────────────────────────

interface MetricProps {
  label: string
  value: string
  sub?: string
  muted?: boolean
  warn?: boolean
  danger?: boolean
}

function Metric({ label, value, sub, muted, warn, danger }: MetricProps) {
  const valueClass = danger
    ? 'text-danger'
    : warn
    ? 'text-warning'
    : muted
    ? 'text-muted'
    : 'text-text'

  return (
    <div className="py-4 border-b border-border last:border-b-0">
      <p className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</p>
      <p className={`mt-1 text-xl text-figures font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-secondary">{sub}</p>}
    </div>
  )
}

// ── Section header with optional "View all" link ──────────────────────────────

function SectionHeader({ title, onViewAll }: { title: string; onViewAll: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">{title}</h2>
      <button
        type="button"
        onClick={onViewAll}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {t('overview.viewAll')}
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const [period, setPeriod] = useState<Period>('today')
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // Single source of loading — driven only by `period` change.
  useEffect(() => {
    let cancelled = false
    setLoadStatus('loading')
    getFinancialSummary(periodRange(period)).then(({ data, error }) => {
      if (cancelled) return
      if (error) { setErrorMsg(error.message); setLoadStatus('error'); return }
      setSummary(data)
      setLoadStatus('loaded')
    })
    return () => { cancelled = true }
  }, [period])

  const periodLabels: { id: Period; label: string }[] = [
    { id: 'today', label: t('overview.period.today') },
    { id: 'week',  label: t('overview.period.week')  },
    { id: 'month', label: t('overview.period.month') },
  ]

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <Skeleton className="mb-6 h-8 w-52" />
        <div className="mb-6 flex gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />)}
        </div>
        <Skeleton className="mb-6 h-[280px] w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (loadStatus === 'error') {
    return (
      <div className="py-6 md:py-10 text-center">
        <p className="text-sm text-danger">{errorMsg || t('notification.error.desc')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => setPeriod(p => p)}>
          {t('products.retry')}
        </Button>
      </div>
    )
  }

  const s = summary!

  return (
    <div className="py-6 md:py-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="heading text-2xl md:text-3xl">
            {t('app.home.greeting', { name: profile?.owner_name ?? '' })}
          </h1>
          {profile?.name && (
            <p className="mt-1 text-sm text-secondary">{profile.name}</p>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => void signOut()}>
          {t('app.home.logout')}
        </Button>
      </div>

      {/* ── Period selector ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-background p-1 w-fit">
        {periodLabels.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id)}
            aria-pressed={period === id}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              period === id
                ? 'bg-surface text-text border border-border'
                : 'text-secondary hover:text-text',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Incomplete cost notice ───────────────────────────────────────────── */}
      {s.cogsIncomplete && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('overview.cogsIncompleteNote')}</span>
        </div>
      )}

      {/* ── Metrics panel ───────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-lg border border-border bg-surface px-5 md:px-6">
        {/* 3 + 3 layout: revenue/pending/expenses | cogs/grossProfit/netProfit */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-border">

          {/* Left group */}
          <div className="md:pr-6">
            <Metric
              label={t('overview.metric.revenue')}
              value={fmtETB(s.paidRevenue)}
            />
            <Metric
              label={t('overview.metric.pending')}
              value={s.pendingRevenue > 0 ? fmtETB(s.pendingRevenue) : '—'}
              muted={s.pendingRevenue === 0}
              sub={s.pendingRevenue > 0 ? t('overview.metric.pendingSub') : undefined}
            />
            <Metric
              label={t('overview.metric.expenses')}
              value={fmtETB(s.totalExpenses)}
            />
          </div>

          {/* Right group */}
          <div className="md:pl-6">
            <Metric
              label={t('overview.metric.cogs')}
              value={s.cogs !== null ? fmtETB(s.cogs) : t('overview.metric.unknown')}
              sub={s.cogsIncomplete ? t('overview.metric.partial') : undefined}
              muted={s.cogs === null}
            />
            <Metric
              label={t('overview.metric.grossProfit')}
              value={s.grossProfit !== null ? fmtETB(s.grossProfit) : t('overview.metric.unknown')}
              sub={s.cogsIncomplete ? t('overview.metric.partial') : undefined}
              muted={s.grossProfit === null}
              danger={s.grossProfit !== null && s.grossProfit < 0}
            />
            <Metric
              label={t('overview.metric.netProfit')}
              value={s.netProfit !== null ? fmtETB(s.netProfit) : t('overview.metric.unknown')}
              sub={s.cogsIncomplete ? t('overview.metric.partial') : undefined}
              muted={s.netProfit === null}
              danger={s.netProfit !== null && s.netProfit < 0}
            />
          </div>
        </div>
      </div>

      {/* ── Recent activity ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Recent sales */}
        <section>
          <SectionHeader
            title={t('overview.recentSales')}
            onViewAll={() => navigate('/app/sales')}
          />
          {s.sales.length === 0 ? (
            <div className="rounded-lg border border-border px-4 py-6 text-center">
              <p className="text-sm text-secondary">{t('overview.noSales')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {s.sales.slice(0, 5).map(sale => (
                <div key={sale.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{sale.sale_number}</p>
                    <p className="text-xs text-secondary">{fmtSaleDate(sale.sold_at)}</p>
                  </div>
                  <StatusBadge
                    tone={sale.payment_status === 'paid' ? 'success' : 'warning'}
                    dot
                  >
                    {t(`sales.status.${sale.payment_status}`)}
                  </StatusBadge>
                  <span className="shrink-0 text-sm text-figures font-medium">
                    {fmtETB(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent expenses */}
        <section>
          <SectionHeader
            title={t('overview.recentExpenses')}
            onViewAll={() => navigate('/app/expenses')}
          />
          {s.expenses.length === 0 ? (
            <div className="rounded-lg border border-border px-4 py-6 text-center">
              <p className="text-sm text-secondary">{t('overview.noExpenses')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {s.expenses.slice(0, 5).map(exp => (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{exp.title}</p>
                    <p className="text-xs text-secondary">
                      {t(`expenses.categories.${exp.category}`)} · {fmtExpenseDate(exp.expense_date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-figures font-medium">
                    {fmtETB(exp.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Footer actions ───────────────────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
        <Button variant="secondary" size="sm" onClick={() => navigate('/app/profile')}>
          {t('app.home.editProfile')}
        </Button>
      </div>

    </div>
  )
}
