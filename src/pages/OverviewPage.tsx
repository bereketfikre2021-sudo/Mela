import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, TrendingUp, TrendingDown, Clock, ShoppingBag } from 'lucide-react'

import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { Button } from '../design-system/Button'
import { useAuth } from '../modules/auth/AuthContext'
import { type FinancialSummary, getFinancialSummary } from '../modules/overview/financials'
import { type Period, periodRange } from '../modules/overview/dateRange'
import type { ExpenseCategory } from '../modules/expenses/types'

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtETBCompact(n: number): string {
  if (n >= 1_000_000) return `ETB ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `ETB ${(n / 1_000).toFixed(1)}K`
  return `ETB ${n.toFixed(0)}`
}

function fmtSaleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtExpenseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  accent: string   // Tailwind bg colour for the icon bubble
  danger?: boolean
  muted?: boolean
}

function StatCard({ label, value, sub, icon, accent, danger, muted }: StatCardProps) {
  const valueColour = danger ? 'text-danger' : muted ? 'text-muted' : 'text-text'
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-secondary truncate">{label}</p>
        <p className={`mt-0.5 text-xl text-figures font-semibold truncate ${valueColour}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-secondary">{sub}</p>}
      </div>
    </div>
  )
}

// ── Revenue vs Expenses bar chart (pure CSS, no library) ──────────────────────

function RevenueExpensesChart({ revenue, expenses }: { revenue: number; expenses: number }) {
  const { t } = useTranslation()
  const max = Math.max(revenue, expenses, 1)
  const revPct = Math.round((revenue  / max) * 100)
  const expPct = Math.round((expenses / max) * 100)

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-semibold text-text">{t('overview.chart.revenueVsExpenses')}</p>
      <div className="space-y-3">
        {/* Revenue bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-text">{t('overview.metric.revenue')}</span>
            <span className="text-figures text-secondary">{fmtETBCompact(revenue)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-primary-soft">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${revPct}%` }}
              role="meter"
              aria-label={t('overview.metric.revenue')}
              aria-valuenow={revPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
        {/* Expenses bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-text">{t('overview.metric.expenses')}</span>
            <span className="text-figures text-secondary">{fmtETBCompact(expenses)}</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-danger-soft">
            <div
              className="h-full rounded-full bg-danger transition-all duration-500"
              style={{ width: `${expPct}%` }}
              role="meter"
              aria-label={t('overview.metric.expenses')}
              aria-valuenow={expPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Expense donut chart (pure SVG, no library) ────────────────────────────────

const DONUT_COLOURS = [
  '#123D35', '#1C6B53', '#2D9970', '#58C49A',
  '#87968D', '#B5C4BC', '#D9F0E4', '#A3C4B5',
]

interface DonutSlice { category: ExpenseCategory; amount: number; colour: string }

function ExpenseDonut({ expenses, total }: { expenses: DonutSlice[]; total: number }) {
  const { t } = useTranslation()
  const SIZE = 120
  const R = 44
  const STROKE = 18
  const CX = SIZE / 2
  const CY = SIZE / 2
  const CIRC = 2 * Math.PI * R

  // Build arc segments
  let offset = 0
  const segments = expenses.map(e => {
    const dash = (e.amount / total) * CIRC
    const gap  = CIRC - dash
    const seg  = { ...e, dash, gap, offset }
    offset += dash
    return seg
  })

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-4 text-sm font-semibold text-text">{t('overview.chart.expenseBreakdown')}</p>
      {total === 0 ? (
        <p className="text-sm text-secondary">{t('overview.noExpenses')}</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* SVG donut */}
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" aria-hidden="true">
            {segments.map(seg => (
              <circle
                key={seg.category}
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={seg.colour}
                strokeWidth={STROKE}
                strokeDasharray={`${seg.dash} ${seg.gap}`}
                strokeDashoffset={-seg.offset + CIRC / 4}
                strokeLinecap="butt"
              />
            ))}
            {/* Centre total */}
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="9" fill="#87968D" fontFamily="Inter,sans-serif">
              {t('overview.metric.expenses')}
            </text>
            <text x={CX} y={CY + 8} textAnchor="middle" fontSize="10" fontWeight="600" fill="#252A27" fontFamily="Inter,sans-serif">
              {fmtETBCompact(total)}
            </text>
          </svg>

          {/* Legend */}
          <ul className="flex-1 space-y-1.5 min-w-0">
            {expenses.slice(0, 6).map(e => (
              <li key={e.category} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.colour }} aria-hidden="true" />
                <span className="truncate text-secondary">{t(`expenses.categories.${e.category}`)}</span>
                <span className="ml-auto shrink-0 text-figures font-medium text-text">
                  {Math.round((e.amount / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

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
  const { profile } = useAuth()

  const [period, setPeriod] = useState<Period>('today')
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-6">
        <Skeleton className="h-8 w-52" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-24 rounded-md" />)}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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

  // Expense breakdown for donut
  const catMap = new Map<ExpenseCategory, number>()
  for (const exp of s.expenses) {
    catMap.set(exp.category as ExpenseCategory, (catMap.get(exp.category as ExpenseCategory) ?? 0) + exp.amount)
  }
  const expenseSlices: { category: ExpenseCategory; amount: number; colour: string }[] = [
    ...catMap.entries(),
  ]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], i) => ({ category, amount, colour: DONUT_COLOURS[i % DONUT_COLOURS.length] }))

  const isProfit  = s.netProfit !== null && s.netProfit >= 0
  const isLoss    = s.netProfit !== null && s.netProfit < 0

  return (
    <div className="py-6 md:py-10 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="heading text-2xl md:text-3xl">
          {t('app.home.greeting', { name: profile?.owner_name ?? '' })}
        </h1>
        {profile?.name && (
          <p className="mt-1 text-sm text-secondary">{profile.name}</p>
        )}
      </div>

      {/* ── Period selector ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 rounded-lg border border-border bg-background p-1 w-fit">
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
        <div className="flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('overview.cogsIncompleteNote')}</span>
        </div>
      )}

      {/* ── Stat cards — 2×2 mobile, 4 across desktop ──────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t('overview.metric.revenue')}
          value={fmtETBCompact(s.paidRevenue)}
          sub={fmtETB(s.paidRevenue)}
          icon={<TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />}
          accent="bg-primary-soft"
        />
        <StatCard
          label={t('overview.metric.expenses')}
          value={fmtETBCompact(s.totalExpenses)}
          sub={fmtETB(s.totalExpenses)}
          icon={<TrendingDown className="h-5 w-5 text-danger" aria-hidden="true" />}
          accent="bg-danger-soft"
        />
        <StatCard
          label={t('overview.metric.netProfit')}
          value={s.netProfit !== null ? fmtETBCompact(s.netProfit) : '—'}
          sub={s.cogsIncomplete ? t('overview.metric.partial') : s.netProfit !== null ? fmtETB(s.netProfit) : undefined}
          icon={
            isProfit ? <TrendingUp className="h-5 w-5 text-success" aria-hidden="true" /> :
            isLoss   ? <TrendingDown className="h-5 w-5 text-danger" aria-hidden="true" /> :
                       <TrendingUp className="h-5 w-5 text-muted" aria-hidden="true" />
          }
          accent={isProfit ? 'bg-success-soft' : isLoss ? 'bg-danger-soft' : 'bg-background'}
          danger={isLoss}
          muted={s.netProfit === null}
        />
        <StatCard
          label={t('overview.metric.pending')}
          value={s.pendingRevenue > 0 ? fmtETBCompact(s.pendingRevenue) : '—'}
          sub={s.pendingRevenue > 0 ? t('overview.metric.pendingSub') : undefined}
          icon={<Clock className="h-5 w-5 text-warning" aria-hidden="true" />}
          accent="bg-warning-soft"
          muted={s.pendingRevenue === 0}
        />
      </div>

      {/* ── Second metric row: COGS + Gross Profit ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={t('overview.metric.cogs')}
          value={s.cogs !== null ? fmtETBCompact(s.cogs) : '—'}
          sub={s.cogsIncomplete ? t('overview.metric.partial') : s.cogs !== null ? fmtETB(s.cogs) : undefined}
          icon={<ShoppingBag className="h-5 w-5 text-info" aria-hidden="true" />}
          accent="bg-info-soft"
          muted={s.cogs === null}
        />
        <StatCard
          label={t('overview.metric.grossProfit')}
          value={s.grossProfit !== null ? fmtETBCompact(s.grossProfit) : '—'}
          sub={s.cogsIncomplete ? t('overview.metric.partial') : s.grossProfit !== null ? fmtETB(s.grossProfit) : undefined}
          icon={<TrendingUp className="h-5 w-5 text-secondary" aria-hidden="true" />}
          accent="bg-background"
          muted={s.grossProfit === null}
          danger={s.grossProfit !== null && s.grossProfit < 0}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RevenueExpensesChart revenue={s.paidRevenue} expenses={s.totalExpenses} />
        <ExpenseDonut expenses={expenseSlices} total={s.totalExpenses} />
      </div>

      {/* ── Recent activity ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

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

    </div>
  )
}
