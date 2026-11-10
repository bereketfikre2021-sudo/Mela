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
import { useAuth } from '../modules/auth/AuthContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { Breadcrumb } from '../components/Breadcrumb'

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

// ── Sub-components ────────────────────────────────────────────────────────────

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

function SummaryRow({ label, value, muted, danger, sub }: {
  label: string; value: string; muted?: boolean; danger?: boolean; sub?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-sm text-text">{label}</span>
      <div className="text-right shrink-0">
        <span className={['text-sm text-figures font-semibold', danger ? 'text-danger' : muted ? 'text-muted' : 'text-text'].join(' ')}>
          {value}
        </span>
        {sub && <p className="mt-0.5 text-xs text-secondary">{sub}</p>}
      </div>
    </div>
  )
}

function ReportTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border bg-background">{head}</tr></thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={`px-4 py-3 text-xs font-medium uppercase tracking-wide text-secondary ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}

function Td({ children, right, figures }: { children: React.ReactNode; right?: boolean; figures?: boolean }) {
  return <td className={`px-4 py-3 ${right ? 'text-right' : ''} ${figures ? 'text-figures' : ''}`}>{children}</td>
}

function UpgradePrompt({ navigate }: { navigate: (path: string) => void }) {
  const { t } = useTranslation()
  return (
    <EmptyState
      title={t('subscription.upgradeRequired')}
      description={t('subscription.reportsUpgradeDesc')}
      action={<Button size="sm" onClick={() => navigate('/app/subscription')}>{t('subscription.upgradeButton')}</Button>}
    />
  )
}

// ── Period selector ───────────────────────────────────────────────────────────

const PRESET_PERIODS: { id: Exclude<Period, 'custom'>; labelKey: string }[] = [
  { id: 'today', labelKey: 'overview.period.today' },
  { id: 'week',  labelKey: 'overview.period.week'  },
  { id: 'month', labelKey: 'overview.period.month' },
]

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabId = 'summary' | 'services' | 'breakdown' | 'expenses'

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const { t }               = useTranslation()
  const { hasAdvancedReports } = useSubscription()
  const navigate            = useNavigate()
  const { profile }         = useAuth()
  const isService           = getBusinessConfig(profile?.type ?? 'retail').isServiceBased

  const [period,     setPeriod]     = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [report,     setReport]     = useState<ReportData | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg,   setErrorMsg]   = useState('')
  const [activeTab,  setActiveTab]  = useState<TabId>('summary')

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

  // Tab labels adapt to business type
  const tabs: { id: TabId; label: string }[] = [
    { id: 'summary',   label: t('reports.tab.summary') },
    { id: 'services',  label: isService ? t('reports.tab.services') : t('reports.tab.sales') },
    { id: 'breakdown', label: isService ? t('reports.tab.topServices') : t('reports.tab.topProducts') },
    { id: 'expenses',  label: t('reports.tab.expenses') },
  ]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-9 w-24 rounded-md" />)}
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
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

  const r              = report!
  const maxProductQty  = r.topProductsByQuantity[0]?.totalQuantity ?? 1
  const maxProductRev  = r.topProductsByRevenue[0]?.totalRevenue   ?? 1
  const maxExpenseCat  = r.expensesByCategory[0]?.totalAmount      ?? 1

  return (
    <div className="py-6 md:py-10 space-y-4">

      {/* ── Header + period ─────────────────────────────────────────────────── */}
      <div>
        <Breadcrumb items={[{ label: t('reports.title') }]} />
        <h1 className="heading text-2xl">{t('reports.title')}</h1>
      </div>

      {/* Period tabs */}
      <div className="space-y-2">
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1 w-fit flex-wrap">
          {PRESET_PERIODS.map(({ id, labelKey }) => (
            <button key={id} type="button" onClick={() => setPeriod(id)} aria-pressed={period === id}
              className={['rounded-md px-3 py-1.5 text-sm font-medium transition-colors', period === id ? 'bg-surface text-text border border-border' : 'text-secondary hover:text-text'].join(' ')}>
              {t(labelKey)}
            </button>
          ))}
          <button type="button" onClick={() => setPeriod('custom')} aria-pressed={period === 'custom'}
            className={['rounded-md px-3 py-1.5 text-sm font-medium transition-colors', period === 'custom' ? 'bg-surface text-text border border-border' : 'text-secondary hover:text-text'].join(' ')}>
            {t('reports.period.custom')}
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-2">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="w-44" />
            <Input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className="w-44" />
            <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>{t('reports.apply')}</Button>
          </div>
        )}
      </div>

      {/* COGS notice — product businesses only */}
      {!isService && r.cogsIncomplete && (
        <div className="flex items-start gap-2 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{t('overview.cogsIncompleteNote')}</span>
        </div>
      )}

      {/* ── Section tabs ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-text',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}

      {/* SUMMARY tab */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            <SummaryRow label={isService ? t('reports.metric.serviceRevenue') : t('overview.metric.revenue')} value={fmtETB(r.paidRevenue)} />
            {r.pendingRevenue > 0 && (
              <SummaryRow label={t('overview.metric.pending')} value={fmtETB(r.pendingRevenue)} muted sub={t('overview.metric.pendingSub')} />
            )}
            {!isService && (
              <>
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
              </>
            )}
            <SummaryRow label={t('overview.metric.expenses')} value={fmtETB(r.totalExpenses)} />
            <SummaryRow
              label={t('overview.metric.netProfit')}
              value={fmtETB(r.netProfit)}
              danger={r.netProfit < 0}
            />
          </div>

          {r.totalSaleTransactions === 0 && r.totalExpenses === 0 && (
            <div className="rounded-xl border border-border px-6 py-10 text-center">
              <p className="text-sm font-semibold text-text">{t('reports.empty.title')}</p>
              <p className="mt-1 text-sm text-secondary">{t('reports.empty.desc')}</p>
            </div>
          )}
        </div>
      )}

      {/* SERVICES / SALES tab */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {!hasAdvancedReports ? <UpgradePrompt navigate={navigate} /> : (
            <>
              <div className="divide-y divide-border rounded-xl border border-border bg-surface">
                <SummaryRow
                  label={isService ? t('reports.services.totalRecorded') : t('reports.sales.paidTransactions')}
                  value={String(r.totalSaleTransactions)}
                />
                {r.pendingTransactions > 0 && (
                  <SummaryRow label={t('reports.sales.pendingTransactions')} value={String(r.pendingTransactions)} muted />
                )}
              </div>

              {r.salesByPaymentMethod.length > 0 && (
                <ReportTable head={<><Th>{t('reports.sales.paymentMethod')}</Th><Th right>{t('reports.sales.transactions')}</Th><Th right>{t('reports.sales.revenue')}</Th></>}>
                  {r.salesByPaymentMethod.map(pm => (
                    <tr key={pm.method}>
                      <Td>{t(`sales.payment.${pm.method}`)}</Td>
                      <Td right figures>{pm.transactionCount}</Td>
                      <Td right figures>{fmtETB(pm.revenue)}</Td>
                    </tr>
                  ))}
                </ReportTable>
              )}

              {r.dailySales.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text">
                    {isService ? t('reports.section.dailyServices') : t('reports.section.dailySales')}
                  </h3>
                  <ReportTable head={<><Th>{t('reports.col.date')}</Th><Th right>{t('reports.col.transactions')}</Th><Th right>{t('reports.col.revenue')}</Th></>}>
                    {r.dailySales.map(day => (
                      <tr key={day.date}><Td>{fmtDate(day.date)}</Td><Td right figures>{day.transactionCount}</Td><Td right figures>{fmtETB(day.revenue)}</Td></tr>
                    ))}
                  </ReportTable>
                </>
              )}

              {r.monthlySales.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text">
                    {isService ? t('reports.section.monthlyServices') : t('reports.section.monthlySales')}
                  </h3>
                  <ReportTable head={<><Th>{t('reports.col.month')}</Th><Th right>{t('reports.col.transactions')}</Th><Th right>{t('reports.col.revenue')}</Th></>}>
                    {r.monthlySales.map(mo => (
                      <tr key={mo.month}><Td>{fmtMonth(mo.month)}</Td><Td right figures>{mo.transactionCount}</Td><Td right figures>{fmtETB(mo.revenue)}</Td></tr>
                    ))}
                  </ReportTable>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* TOP PRODUCTS / SERVICES tab */}
      {activeTab === 'breakdown' && (
        <div className="space-y-4">
          {!hasAdvancedReports ? <UpgradePrompt navigate={navigate} /> : (
            <>
              {r.topProductsByQuantity.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text">
                    {isService ? t('reports.section.topServicesByQty') : t('reports.section.topProductsByQty')}
                  </h3>
                  <div className="rounded-xl border border-border bg-surface divide-y divide-border">
                    {r.topProductsByQuantity.map(p => (
                      <div key={p.productName} className="px-4 py-3">
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-medium text-text">{p.productName}</span>
                          <span className="shrink-0 text-xs text-secondary">
                            {fmtQty(p.totalQuantity)} {t('reports.products.units')} · {fmtETB(p.totalRevenue)}
                          </span>
                        </div>
                        <ProportionBar value={p.totalQuantity} max={maxProductQty} label={p.productName} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {r.topProductsByRevenue.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text">
                    {isService ? t('reports.section.topServicesByRevenue') : t('reports.section.topProductsByRevenue')}
                  </h3>
                  <div className="rounded-xl border border-border bg-surface divide-y divide-border">
                    {r.topProductsByRevenue.map(p => (
                      <div key={p.productName} className="px-4 py-3">
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm font-medium text-text">{p.productName}</span>
                          <span className="shrink-0 text-xs text-secondary">{fmtETB(p.totalRevenue)}</span>
                        </div>
                        <ProportionBar value={p.totalRevenue} max={maxProductRev} label={p.productName} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {r.topProductsByQuantity.length === 0 && r.topProductsByRevenue.length === 0 && (
                <div className="rounded-xl border border-border px-6 py-10 text-center">
                  <p className="text-sm text-secondary">{t('reports.empty.desc')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* EXPENSES tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {!hasAdvancedReports ? <UpgradePrompt navigate={navigate} /> : (
            <>
              {r.expensesByCategory.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text">{t('reports.section.expensesByCategory')}</h3>
                  <div className="rounded-xl border border-border bg-surface divide-y divide-border">
                    {r.expensesByCategory.map(cat => (
                      <div key={cat.category} className="px-4 py-3">
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-text">{t(`expenses.categories.${cat.category}`)}</span>
                          <span className="shrink-0 text-xs text-secondary">{fmtETB(cat.totalAmount)} · {cat.transactionCount} {t('reports.expenses.entries')}</span>
                        </div>
                        <ProportionBar value={cat.totalAmount} max={maxExpenseCat} label={t(`expenses.categories.${cat.category}`)} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {r.monthlyExpenses.length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-text">{t('reports.section.monthlyExpenses')}</h3>
                  <ReportTable head={<><Th>{t('reports.col.month')}</Th><Th right>{t('reports.col.amount')}</Th></>}>
                    {r.monthlyExpenses.map(mo => (
                      <tr key={mo.month}><Td>{fmtMonth(mo.month)}</Td><Td right figures>{fmtETB(mo.totalAmount)}</Td></tr>
                    ))}
                  </ReportTable>
                </>
              )}

              {r.expensesByCategory.length === 0 && r.monthlyExpenses.length === 0 && (
                <div className="rounded-xl border border-border px-6 py-10 text-center">
                  <p className="text-sm text-secondary">{t('reports.empty.desc')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  )
}
