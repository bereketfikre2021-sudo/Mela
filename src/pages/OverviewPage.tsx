/**
 * OverviewPage — Phase 7 simplified Home dashboard.
 *
 * Focuses on the three numbers an owner checks every day:
 *   - Today's sales revenue
 *   - Today's expenses
 *   - Estimated profit (when cost data exists)
 *
 * Quick actions and low-stock alerts are prominent.
 * Charts and COGS details are accessible via "Full report" link.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Plus, Receipt, ShoppingCart, TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { Button } from '../design-system/Button'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { useAuth } from '../modules/auth/AuthContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { type FinancialSummary, getFinancialSummary } from '../modules/overview/financials'
import { periodRange } from '../modules/overview/dateRange'
import { useProducts } from '../modules/retail/useProducts'

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtETBCompact(n: number) {
  if (n >= 1_000_000) return `ETB ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `ETB ${(n / 1_000).toFixed(1)}K`
  return `ETB ${n.toFixed(0)}`
}

function fmtSaleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function OverviewPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const bizConfig = getBusinessConfig(profile?.type ?? 'retail')
  const { products } = useProducts()

  const [summary, setSummary]     = useState<FinancialSummary | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg, setErrorMsg]   = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadStatus('loading')
    getFinancialSummary(periodRange('today')).then(({ data, error }) => {
      if (cancelled) return
      if (error) { setErrorMsg(error.message); setLoadStatus('error'); return }
      setSummary(data)
      setLoadStatus('loaded')
    })
    return () => { cancelled = true }
  }, [])

  // Low-stock products
  const lowStockItems = products.filter(p =>
    p.low_stock_threshold && p.low_stock_threshold > 0 && p.stock_quantity <= p.low_stock_threshold
  )

  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-5">
        <Skeleton className="h-8 w-52" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (loadStatus === 'error') {
    return (
      <div className="py-6 md:py-10 text-center">
        <p className="text-sm text-danger">{errorMsg || t('notification.error.desc')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => window.location.reload()}>
          {t('products.retry')}
        </Button>
      </div>
    )
  }

  const s = summary!
  const isProfit = s.netProfit !== null && s.netProfit >= 0
  const isLoss   = s.netProfit !== null && s.netProfit < 0

  return (
    <div className="py-6 md:py-10 space-y-5">

      {/* Greeting */}
      <div>
        <h1 className="heading text-2xl">
          {t('app.home.greeting', { name: profile?.owner_name ?? '' })}
        </h1>
        {profile?.name && <p className="mt-0.5 text-sm text-secondary">{profile.name}</p>}
      </div>

      {/* Today's three key numbers */}
      <div className="grid grid-cols-3 gap-3">
        {/* Revenue */}
        <div className="flex flex-col rounded-xl border border-border bg-surface p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-secondary truncate">
            {t('home.todaySales')}
          </p>
          <p className="mt-0.5 text-lg font-bold text-figures text-text truncate">
            {fmtETBCompact(s.paidRevenue)}
          </p>
        </div>

        {/* Expenses */}
        <div className="flex flex-col rounded-xl border border-border bg-surface p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-soft">
            <TrendingDown className="h-4 w-4 text-danger" aria-hidden="true" />
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-secondary truncate">
            {t('home.todayExpenses')}
          </p>
          <p className="mt-0.5 text-lg font-bold text-figures text-text truncate">
            {fmtETBCompact(s.totalExpenses)}
          </p>
        </div>

        {/* Profit */}
        <div className="flex flex-col rounded-xl border border-border bg-surface p-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isLoss ? 'bg-danger-soft' : 'bg-success-soft'}`}>
            <TrendingUp className={`h-4 w-4 ${isLoss ? 'text-danger' : 'text-success'}`} aria-hidden="true" />
          </div>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-secondary truncate">
            {t('home.profit')}
          </p>
          <p className={`mt-0.5 text-lg font-bold text-figures truncate ${isLoss ? 'text-danger' : isProfit ? 'text-text' : 'text-muted'}`}>
            {s.netProfit !== null ? fmtETBCompact(s.netProfit) : '—'}
          </p>
          {!bizConfig.isServiceBased && s.cogsIncomplete && (
            <p className="mt-0.5 text-[10px] text-warning">{t('overview.metric.partial')}</p>
          )}
        </div>
      </div>

      {/* Pending payments banner */}
      {s.pendingRevenue > 0 && (
        <button type="button" onClick={() => navigate('/app/sales')}
          className="w-full flex items-center justify-between rounded-xl border border-warning-soft bg-warning-soft px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-text">
              {t('home.pendingBanner', { amount: fmtETB(s.pendingRevenue) })}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* Low-stock banner — product businesses only */}
      {!bizConfig.isServiceBased && lowStockItems.length > 0 && (
        <button type="button" onClick={() => navigate('/app/stock')}
          className="w-full flex items-center justify-between rounded-xl border border-danger-soft bg-danger-soft px-4 py-3 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-text">
              {t('home.lowStockBanner', { count: lowStockItems.length })}
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-danger shrink-0" aria-hidden="true" />
        </button>
      )}

      {/* Primary action — label from business type */}
      <Button fullWidth size="lg"
        leadingIcon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />}
        onClick={() => navigate('/app/pos')}>
        {bizConfig.newSaleLabel}
      </Button>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: <Plus className="h-4 w-4" aria-hidden="true" />, label: t('home.quickExpense'),  route: '/app/expenses'  },
          { icon: <Receipt className="h-4 w-4" aria-hidden="true" />, label: t('home.quickSales'),  route: '/app/sales'    },
          { icon: <Wallet className="h-4 w-4" aria-hidden="true" />, label: t('home.quickReport'),  route: '/app/reports'  },
        ].map(a => (
          <button key={a.route} type="button" onClick={() => navigate(a.route)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-center transition-colors hover:bg-background">
            <span className="text-secondary">{a.icon}</span>
            <span className="text-[11px] font-medium text-secondary leading-tight">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Recent sales */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            {t('overview.recentSales')}
          </h2>
          <button type="button" onClick={() => navigate('/app/sales')}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            {t('overview.viewAll')}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
        {s.sales.length === 0 ? (
          <div className="rounded-xl border border-border px-4 py-8 text-center">
            <p className="text-sm text-secondary">{t('overview.noSales')}</p>
            <Button variant="secondary" size="sm" className="mt-3"
              onClick={() => navigate('/app/pos')}>
              {t('home.newSale')}
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {s.sales.slice(0, 5).map(sale => (
              <div key={sale.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text">{sale.sale_number}</p>
                  <p className="text-xs text-secondary">{fmtSaleDate(sale.sold_at)}</p>
                </div>
                <StatusBadge tone={sale.payment_status === 'paid' ? 'success' : 'warning'} dot>
                  {t(`sales.status.${sale.payment_status}`)}
                </StatusBadge>
                <span className="shrink-0 text-sm text-figures font-medium">{fmtETB(sale.total)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Full report link */}
      <p className="text-center text-xs text-secondary">
        {t('home.moreDetails')}{' '}
        <button type="button" onClick={() => navigate('/app/reports')}
          className="font-medium text-primary hover:underline">
          {t('home.viewFullReport')}
        </button>
      </p>
    </div>
  )
}
