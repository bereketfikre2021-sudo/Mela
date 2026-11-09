import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { Button } from '../design-system/Button'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { type Period, periodRange } from '../modules/overview/dateRange'
import { type ReportData, getReportData } from '../modules/reports/reportData'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtQty(n: number) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
}

function fmtMonth(yyyyMM: string) {
  const [y, m] = yyyyMM.split('-')
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-ET', { year: 'numeric', month: 'long' })
}

function fmtDate(yyyyMMDD: string) {
  const [y, m, d] = yyyyMMDD.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { month: 'short', day: 'numeric' })
}

// ── Proportion bar ────────────────────────────────────────────────────────────

function ProportionBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary-soft">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          role="meter"
          aria-label={label}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs text-secondary">{pct}%</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
// Consistent card-style section: labelled heading + white card body.
// No border-t divider — spacing between sections is handled by the parent gap.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-secondary">
        {title}
      </h2>
      {children}
    </section>
  )
}

// ── Summary row (inside a card) ───────────────────────────────────────────────

function SummaryRow({ label, value, muted, danger, sub }: {
  label: string; value: string; muted?: boolean; danger?: boolean; sub?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-sm text-text">{label}</span>
      <div className="text-right shrink-0">
        <span className={[
          'text-sm text-figures font-semibold',
          danger ? 'text-danger' : muted ? 'text-muted' : 'text-text',
        ].join(' ')}>
          {value}
        </span>
        {sub && <p className="mt-0.5 text-xs text-secondary">{sub}</p>}
      </div>
    </div>
  )
}

// ── Shared table wrapper ──────────────────────────────────────────────────────

function ReportTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-background">
            {head}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {children}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-secondary ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, right, figures }: { children: React.ReactNode; right?: boolean; figures?: boolean }) {
  return (
    <td className={`px-4 py-3 ${right ? 'text-right' : ''} ${figures ? 'text-figures' : ''}`}>
      {children}
    </td>
  )
}

// ── Period selector ───────────────────────────────────────────────────────────

const PRESET_PERIODS: { id: Exclude<Period, 'custom'>; labelKey: string }[] = [
  { id: 'today', labelKey: 'overview.period.today' },
  { id: 'week',  labelKey: 'overview.period.week'  },
  { id: 'month', labelKey: 'overview.period.month' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { t } = useTranslation()
  const { hasAdvancedReports } = useSubscription()
  const navigate = useNavigate()

  const [period,     setPeriod]     = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [report,     setReport]     = useState<ReportData | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg,   setErrorMsg]   = useState('')

  function load(p: Period, cf?: string, ct?: string) {
    setLoadStatus('loading')
    const range = periodRange(p, cf, ct)
    getReportData(range).then(({ data, error }) => {
      if (error) { setErrorMsg(error.message); setLoadStatus('error'); return }
      setReport(data); setLoadStatus('loaded')
    })
  }

  useEffect(() => { load(period) }, [period])

  function applyCustom() {
    if (!customFrom || !customTo) return
    load('custom', customFrom, customTo)
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (loadStatus === 'error') {
    return (
      <div className="py-6 md:py-10 text-center">
        <p className="text-sm text-danger">{errorMsg || t('notification.error.desc')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => load(period, customFrom, customTo)}>
          {t('products.retry')}
        </Button>
      </div>
    )
  }

  const r = report!
  const maxProductQty = r.topProductsByQuantity[0]?.totalQuantity ?? 1
  const maxProductRev = r.topProductsByRevenue[0]?.totalRevenue   ?? 1
  const maxExpenseCat = r.expensesByCategory[0]?.totalAmount      ?? 1

  return (
    <div className="py-6 md:py-10 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="heading text-2xl md:text-3xl">{t('reports.title')}</h1>
        <p className="mt-1 text-sm text-secondary">{t('reports.subtitle')}</p>
      </div>

      {/* ── Period selector ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1 w-fit">
          {PRESET_PERIODS.map(({ id, labelKey }) => (
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
              {t(labelKey)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod('custom')}
            aria-pressed={period === 'custom'}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              period === 'custom'
                ? 'bg-surface text-text border border-border'
                : 'text-secondary hover:text-text',
            ].join(' ')}
          >
            {t('reports.period.custom')}
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              aria-label={t('expenses.filter.from')}
              className="w-44"
            />
            <Input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              aria-label={t('expenses.filter.to')}
              className="w-44"
            />
            <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>
              {t('reports.apply')}
            </Button>
          </div>
        )}
      </div>

      {/* ── Incomplete cost notice ─────────────────────────────────────────── */}
      {r.cogsIncomplete && (
        <div className="flex items-start gap-2 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('overview.cogsIncompleteNote')}</span>
        </div>
      )}

      {/* ── Profit summary ──────────────────────────────────────────────────── */}
      <Section title={t('reports.section.profitSummary')}>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          <SummaryRow label={t('overview.metric.revenue')} value={fmtETB(r.paidRevenue)} />
          {r.pendingRevenue > 0 && (
            <SummaryRow
              label={t('overview.metric.pending')}
              value={fmtETB(r.pendingRevenue)}
              muted
              sub={t('overview.metric.pendingSub')}
            />
          )}
          <SummaryRow
            label={t('overview.metric.cogs')}
            value={r.cogs !== null ? fmtETB(r.cogs) : t('overview.metric.unknown')}
            muted={r.cogs === null}
            sub={r.cogsIncomplete ? t('overview.metric.partial') : undefined}
          />
          <SummaryRow
            label={t('overview.metric.grossProfit')}
            value={r.grossProfit !== null ? fmtETB(r.grossProfit) : t('overview.metric.unknown')}
            danger={r.grossProfit !== null && r.grossProfit < 0}
            muted={r.grossProfit === null}
            sub={r.cogsIncomplete ? t('overview.metric.partial') : undefined}
          />
          <SummaryRow label={t('overview.metric.expenses')} value={fmtETB(r.totalExpenses)} />
          <SummaryRow
            label={t('overview.metric.netProfit')}
            value={r.netProfit !== null ? fmtETB(r.netProfit) : t('overview.metric.unknown')}
            danger={r.netProfit !== null && r.netProfit < 0}
            muted={r.netProfit === null}
            sub={r.cogsIncomplete ? t('overview.metric.partial') : undefined}
          />
        </div>
      </Section>

      {/* ── Sales summary ────────────────────────────────────────────────────── */}
      {hasAdvancedReports ? (
      <Section title={t('reports.section.salesSummary')}>
        <div className="space-y-3">
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            <SummaryRow
              label={t('reports.sales.paidTransactions')}
              value={String(r.totalSaleTransactions)}
            />
            {r.pendingTransactions > 0 && (
              <SummaryRow
                label={t('reports.sales.pendingTransactions')}
                value={String(r.pendingTransactions)}
                muted
              />
            )}
          </div>

          {r.salesByPaymentMethod.length > 0 && (
            <ReportTable
              head={
                <>
                  <Th>{t('reports.sales.paymentMethod')}</Th>
                  <Th right>{t('reports.sales.transactions')}</Th>
                  <Th right>{t('reports.sales.revenue')}</Th>
                </>
              }
            >
              {r.salesByPaymentMethod.map(pm => (
                <tr key={pm.method}>
                  <Td>{t(`sales.payment.${pm.method}`)}</Td>
                  <Td right figures>{pm.transactionCount}</Td>
                  <Td right figures>{fmtETB(pm.revenue)}</Td>
                </tr>
              ))}
            </ReportTable>
          )}
        </div>
      </Section>
      ) : (
        <Section title={t('reports.section.salesSummary')}>
          <EmptyState
            title={t('subscription.upgradeRequired')}
            description={t('subscription.reportsUpgradeDesc')}
            action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
          />
        </Section>
      )}

      {/* ── Daily sales ──────────────────────────────────────────────────────── */}
      {r.dailySales.length > 0 && (
        hasAdvancedReports ? (
        <Section title={t('reports.section.dailySales')}>
          <ReportTable
            head={
              <>
                <Th>{t('reports.col.date')}</Th>
                <Th right>{t('reports.col.transactions')}</Th>
                <Th right>{t('reports.col.revenue')}</Th>
              </>
            }
          >
            {r.dailySales.map(day => (
              <tr key={day.date}>
                <Td>{fmtDate(day.date)}</Td>
                <Td right figures>{day.transactionCount}</Td>
                <Td right figures>{fmtETB(day.revenue)}</Td>
              </tr>
            ))}
          </ReportTable>
        </Section>
        ) : (
          <Section title={t('reports.section.dailySales')}>
            <EmptyState
              title={t('subscription.upgradeRequired')}
              description={t('subscription.reportsUpgradeDesc')}
              action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
            />
          </Section>
        )
      )}

      {/* ── Monthly sales ─────────────────────────────────────────────────────── */}
      {r.monthlySales.length > 0 && (
        hasAdvancedReports ? (
        <Section title={t('reports.section.monthlySales')}>
          <ReportTable
            head={
              <>
                <Th>{t('reports.col.month')}</Th>
                <Th right>{t('reports.col.transactions')}</Th>
                <Th right>{t('reports.col.revenue')}</Th>
              </>
            }
          >
            {r.monthlySales.map(mo => (
              <tr key={mo.month}>
                <Td>{fmtMonth(mo.month)}</Td>
                <Td right figures>{mo.transactionCount}</Td>
                <Td right figures>{fmtETB(mo.revenue)}</Td>
              </tr>
            ))}
          </ReportTable>
        </Section>
        ) : (
          <Section title={t('reports.section.monthlySales')}>
            <EmptyState
              title={t('subscription.upgradeRequired')}
              description={t('subscription.reportsUpgradeDesc')}
              action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
            />
          </Section>
        )
      )}

      {/* ── Best-selling products by quantity ─────────────────────────────────── */}
      {r.topProductsByQuantity.length > 0 && (
        hasAdvancedReports ? (
        <Section title={t('reports.section.topProductsByQty')}>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {r.topProductsByQuantity.map(p => (
              <div key={p.productName} className="px-4 py-3">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-text">{p.productName}</span>
                  <span className="shrink-0 text-xs text-figures text-secondary">
                    {fmtQty(p.totalQuantity)} {t('reports.products.units')}
                    {' · '}{fmtETB(p.totalRevenue)}
                  </span>
                </div>
                <ProportionBar value={p.totalQuantity} max={maxProductQty} label={p.productName} />
              </div>
            ))}
          </div>
        </Section>
        ) : (
          <Section title={t('reports.section.topProductsByQty')}>
            <EmptyState
              title={t('subscription.upgradeRequired')}
              description={t('subscription.reportsUpgradeDesc')}
              action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
            />
          </Section>
        )
      )}

      {/* ── Best-selling products by revenue ──────────────────────────────────── */}
      {r.topProductsByRevenue.length > 0 && (
        hasAdvancedReports ? (
        <Section title={t('reports.section.topProductsByRevenue')}>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {r.topProductsByRevenue.map(p => (
              <div key={p.productName} className="px-4 py-3">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-text">{p.productName}</span>
                  <span className="shrink-0 text-xs text-figures text-secondary">
                    {fmtETB(p.totalRevenue)}
                  </span>
                </div>
                <ProportionBar value={p.totalRevenue} max={maxProductRev} label={p.productName} />
              </div>
            ))}
          </div>
        </Section>
        ) : (
          <Section title={t('reports.section.topProductsByRevenue')}>
            <EmptyState
              title={t('subscription.upgradeRequired')}
              description={t('subscription.reportsUpgradeDesc')}
              action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
            />
          </Section>
        )
      )}

      {/* ── Expense breakdown by category ─────────────────────────────────────── */}
      {r.expensesByCategory.length > 0 && (
        hasAdvancedReports ? (
        <Section title={t('reports.section.expensesByCategory')}>
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {r.expensesByCategory.map(cat => (
              <div key={cat.category} className="px-4 py-3">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-text">
                    {t(`expenses.categories.${cat.category}`)}
                  </span>
                  <span className="shrink-0 text-xs text-figures text-secondary">
                    {fmtETB(cat.totalAmount)}
                    {' · '}{cat.transactionCount} {t('reports.expenses.entries')}
                  </span>
                </div>
                <ProportionBar
                  value={cat.totalAmount}
                  max={maxExpenseCat}
                  label={t(`expenses.categories.${cat.category}`)}
                />
              </div>
            ))}
          </div>
        </Section>
        ) : (
          <Section title={t('reports.section.expensesByCategory')}>
            <EmptyState
              title={t('subscription.upgradeRequired')}
              description={t('subscription.reportsUpgradeDesc')}
              action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
            />
          </Section>
        )
      )}

      {/* ── Monthly expenses ──────────────────────────────────────────────────── */}
      {r.monthlyExpenses.length > 0 && (
        hasAdvancedReports ? (
        <Section title={t('reports.section.monthlyExpenses')}>
          <ReportTable
            head={
              <>
                <Th>{t('reports.col.month')}</Th>
                <Th right>{t('reports.col.amount')}</Th>
              </>
            }
          >
            {r.monthlyExpenses.map(mo => (
              <tr key={mo.month}>
                <Td>{fmtMonth(mo.month)}</Td>
                <Td right figures>{fmtETB(mo.totalAmount)}</Td>
              </tr>
            ))}
          </ReportTable>
        </Section>
        ) : (
          <Section title={t('reports.section.monthlyExpenses')}>
            <EmptyState
              title={t('subscription.upgradeRequired')}
              description={t('subscription.reportsUpgradeDesc')}
              action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
            />
          </Section>
        )
      )}

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {r.totalSaleTransactions === 0 && r.totalExpenses === 0 && (
        <div className="rounded-xl border border-border px-6 py-12 text-center">
          <p className="text-sm font-semibold text-text">{t('reports.empty.title')}</p>
          <p className="mt-1 text-sm text-secondary">{t('reports.empty.desc')}</p>
        </div>
      )}

    </div>
  )
}
