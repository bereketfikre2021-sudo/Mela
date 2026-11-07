import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { type Period, periodRange } from '../modules/overview/dateRange'
import { type ReportData, getReportData } from '../modules/reports/reportData'

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

// ── Proportion bar (pure CSS, no library) ─────────────────────────────────────

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
      <span className="w-10 text-right text-xs text-secondary">{pct}%</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-secondary">{title}</h2>
      {children}
    </section>
  )
}

// ── Summary row ───────────────────────────────────────────────────────────────

function SummaryRow({ label, value, muted, danger, sub }: {
  label: string; value: string; muted?: boolean; danger?: boolean; sub?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-text">{label}</span>
      <div className="text-right">
        <span className={`text-sm text-figures font-semibold ${danger ? 'text-danger' : muted ? 'text-muted' : ''}`}>
          {value}
        </span>
        {sub && <p className="mt-0.5 text-xs text-secondary">{sub}</p>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PRESET_PERIODS: { id: Exclude<Period, 'custom'>; labelKey: string }[] = [
  { id: 'today', labelKey: 'overview.period.today' },
  { id: 'week',  labelKey: 'overview.period.week'  },
  { id: 'month', labelKey: 'overview.period.month' },
]

export function ReportsPage() {
  const { t } = useTranslation()

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
        <div className="flex gap-2"><Skeleton className="h-8 w-20 rounded-md" /><Skeleton className="h-8 w-24 rounded-md" /><Skeleton className="h-8 w-28 rounded-md" /></div>
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-lg" />)}
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

      {/* ── Period controls ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1 w-fit">
          {PRESET_PERIODS.map(({ id, labelKey }) => (
            <button key={id} type="button" onClick={() => setPeriod(id)} aria-pressed={period === id}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                period === id ? 'bg-surface text-text border border-border' : 'text-secondary hover:text-text',
              ].join(' ')}>
              {t(labelKey)}
            </button>
          ))}
          <button type="button" onClick={() => setPeriod('custom')} aria-pressed={period === 'custom'}
            className={[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              period === 'custom' ? 'bg-surface text-text border border-border' : 'text-secondary hover:text-text',
            ].join(' ')}>
            {t('reports.period.custom')}
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              aria-label={t('expenses.filter.from')} className="w-44" />
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              aria-label={t('expenses.filter.to')} className="w-44" />
            <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>
              {t('reports.apply')}
            </Button>
          </div>
        )}
      </div>

      {/* ── Incomplete cost notice ─────────────────────────────────────────── */}
      {r.cogsIncomplete && (
        <div className="flex items-start gap-2 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('overview.cogsIncompleteNote')}</span>
        </div>
      )}

      {/* ── Profit summary ──────────────────────────────────────────────────── */}
      <Section title={t('reports.section.profitSummary')}>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          <SummaryRow label={t('overview.metric.revenue')} value={fmtETB(r.paidRevenue)} />
          {r.pendingRevenue > 0 && (
            <SummaryRow label={t('overview.metric.pending')} value={fmtETB(r.pendingRevenue)}
              muted sub={t('overview.metric.pendingSub')} />
          )}
          <SummaryRow label={t('overview.metric.cogs')}
            value={r.cogs !== null ? fmtETB(r.cogs) : t('overview.metric.unknown')}
            muted={r.cogs === null}
            sub={r.cogsIncomplete ? t('overview.metric.partial') : undefined} />
          <SummaryRow label={t('overview.metric.grossProfit')}
            value={r.grossProfit !== null ? fmtETB(r.grossProfit) : t('overview.metric.unknown')}
            danger={r.grossProfit !== null && r.grossProfit < 0}
            muted={r.grossProfit === null}
            sub={r.cogsIncomplete ? t('overview.metric.partial') : undefined} />
          <SummaryRow label={t('overview.metric.expenses')} value={fmtETB(r.totalExpenses)} />
          <SummaryRow label={t('overview.metric.netProfit')}
            value={r.netProfit !== null ? fmtETB(r.netProfit) : t('overview.metric.unknown')}
            danger={r.netProfit !== null && r.netProfit < 0}
            muted={r.netProfit === null}
            sub={r.cogsIncomplete ? t('overview.metric.partial') : undefined} />
        </div>
      </Section>

      {/* ── Sales summary ────────────────────────────────────────────────────── */}
      <Section title={t('reports.section.salesSummary')}>
        <div className="rounded-lg border border-border bg-surface divide-y divide-border">
          <SummaryRow label={t('reports.sales.paidTransactions')}
            value={String(r.totalSaleTransactions)} />
          {r.pendingTransactions > 0 && (
            <SummaryRow label={t('reports.sales.pendingTransactions')}
              value={String(r.pendingTransactions)} muted />
          )}
        </div>

        {/* Sales by payment method */}
        {r.salesByPaymentMethod.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.sales.paymentMethod')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.sales.transactions')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.sales.revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.salesByPaymentMethod.map(pm => (
                  <tr key={pm.method}>
                    <td className="px-3 py-2.5">{t(`sales.payment.${pm.method}`)}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{pm.transactionCount}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{fmtETB(pm.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Daily sales ──────────────────────────────────────────────────────── */}
      {r.dailySales.length > 0 && (
        <Section title={t('reports.section.dailySales')}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.date')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.transactions')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.dailySales.map(day => (
                  <tr key={day.date}>
                    <td className="px-3 py-2.5">{fmtDate(day.date)}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{day.transactionCount}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{fmtETB(day.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Monthly sales ─────────────────────────────────────────────────────── */}
      {r.monthlySales.length > 0 && (
        <Section title={t('reports.section.monthlySales')}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.month')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.transactions')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.monthlySales.map(mo => (
                  <tr key={mo.month}>
                    <td className="px-3 py-2.5">{fmtMonth(mo.month)}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{mo.transactionCount}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{fmtETB(mo.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Best-selling products ──────────────────────────────────────────────── */}
      {r.topProductsByQuantity.length > 0 && (
        <Section title={t('reports.section.topProductsByQty')}>
          <div className="space-y-3">
            {r.topProductsByQuantity.map(p => (
              <div key={p.productName}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text">{p.productName}</span>
                  <span className="shrink-0 text-sm text-figures">
                    {fmtQty(p.totalQuantity)} {t('reports.products.units')}
                    {' · '}{fmtETB(p.totalRevenue)}
                  </span>
                </div>
                <ProportionBar value={p.totalQuantity} max={maxProductQty} label={p.productName} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {r.topProductsByRevenue.length > 0 && (
        <Section title={t('reports.section.topProductsByRevenue')}>
          <div className="space-y-3">
            {r.topProductsByRevenue.map(p => (
              <div key={p.productName}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text">{p.productName}</span>
                  <span className="shrink-0 text-sm text-figures">{fmtETB(p.totalRevenue)}</span>
                </div>
                <ProportionBar value={p.totalRevenue} max={maxProductRev} label={p.productName} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Expense breakdown ─────────────────────────────────────────────────── */}
      {r.expensesByCategory.length > 0 && (
        <Section title={t('reports.section.expensesByCategory')}>
          <div className="space-y-3">
            {r.expensesByCategory.map(cat => (
              <div key={cat.category}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-text">
                    {t(`expenses.categories.${cat.category}`)}
                  </span>
                  <span className="shrink-0 text-sm text-figures">
                    {fmtETB(cat.totalAmount)}
                    {' · '}{cat.transactionCount} {t('reports.expenses.entries')}
                  </span>
                </div>
                <ProportionBar value={cat.totalAmount} max={maxExpenseCat}
                  label={t(`expenses.categories.${cat.category}`)} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Monthly expenses ──────────────────────────────────────────────────── */}
      {r.monthlyExpenses.length > 0 && (
        <Section title={t('reports.section.monthlyExpenses')}>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.month')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                    {t('reports.col.amount')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {r.monthlyExpenses.map(mo => (
                  <tr key={mo.month}>
                    <td className="px-3 py-2.5">{fmtMonth(mo.month)}</td>
                    <td className="px-3 py-2.5 text-right text-figures">{fmtETB(mo.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── Empty state when no data at all ───────────────────────────────────── */}
      {r.totalSaleTransactions === 0 && r.totalExpenses === 0 && (
        <div className="rounded-lg border border-border px-6 py-12 text-center">
          <p className="text-sm font-medium text-text">{t('reports.empty.title')}</p>
          <p className="mt-1 text-sm text-secondary">{t('reports.empty.desc')}</p>
        </div>
      )}

    </div>
  )
}
