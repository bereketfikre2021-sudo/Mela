/**
 * OverviewPage — Home dashboard (F5 update).
 *
 * Primary daily stat cards (2×2 grid):
 *   Revenue · Net Profit · Expenses · Inventory Cost Value
 *
 * Secondary sections (product businesses only):
 *   Inventory valuation (Cost vs Retail)
 *   Receivables / Payables (Customers Owe / You Owe Suppliers)
 *
 * All calculations come from existing services:
 *   - F1 profit formula from financials.ts
 *   - F4 inventory values from financials.ts
 *   - F2 supplier outstanding from suppliers/api.ts
 *   - F3 customer outstanding from salesApi.ts (getOutstandingBalances)
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Bell,
  HelpCircle,
  PackageSearch,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'

import { Button } from '../design-system/Button'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { useAuth } from '../modules/auth/AuthContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { type FinancialSummary, getFinancialSummary } from '../modules/overview/financials'
import { periodRange } from '../modules/overview/dateRange'
import { useProducts } from '../modules/retail/useProducts'
import { getOutstandingBalances } from '../modules/retail/salesApi'
import { getSupplierOutstanding } from '../modules/suppliers/api'

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtETBCompact(n: number) {
  if (n >= 1_000_000) return `ETB ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `ETB ${(n / 1_000).toFixed(1)}K`
  return `ETB ${n.toFixed(0)}`
}

function fmtSaleDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Primary stat card — matches existing design exactly, now 2-col grid. */
function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  hint,
  sub,
  subTone,
}: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  label: string
  value: string
  hint?: string
  sub?: string
  subTone?: 'warning' | 'muted'
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-3">
      <div className="flex items-start justify-between gap-1">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {hint && (
          <div className="group relative">
            <HelpCircle className="h-3.5 w-3.5 text-muted cursor-help" aria-label={hint} />
            <div className="pointer-events-none invisible absolute right-0 top-5 z-10 w-44 rounded-lg border border-border bg-surface p-2 text-xs text-secondary shadow-lg group-hover:visible">
              {hint}
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-secondary truncate">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-figures text-text truncate">
        {value}
      </p>
      {sub && (
        <p className={`mt-0.5 text-[10px] ${subTone === 'warning' ? 'text-warning' : 'text-muted'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

/** Two-column info row for inventory valuation / receivables sections. */
function InfoRow({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string | null
  hint?: string
  tone?: 'default' | 'warning' | 'success'
}) {
  const valueColor =
    tone === 'warning' ? 'text-warning' :
    tone === 'success' ? 'text-success' :
    'text-text'

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-secondary truncate">{label}</span>
        {hint && (
          <div className="group relative shrink-0">
            <HelpCircle className="h-3 w-3 text-muted cursor-help" aria-label={hint} />
            <div className="pointer-events-none invisible absolute left-0 top-5 z-10 w-44 rounded-lg border border-border bg-surface p-2 text-xs text-secondary shadow-lg group-hover:visible">
              {hint}
            </div>
          </div>
        )}
      </div>
      <span className={`shrink-0 text-sm font-semibold ${value === null ? 'text-muted' : valueColor}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function OverviewPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const bizConfig = getBusinessConfig(profile?.type ?? 'retail')
  const { products } = useProducts()

  const [summary,    setSummary]    = useState<FinancialSummary | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorMsg,   setErrorMsg]   = useState('')

  // Receivables and payables — loaded in parallel, non-fatal if they fail
  const [customerOwing,  setCustomerOwing]  = useState<number>(0)
  const [supplierOwing,  setSupplierOwing]  = useState<number>(0)

  const loadFinancials = useCallback(async () => {
    setLoadStatus('loading')
    const [summaryRes, customerRes, supplierRes] = await Promise.all([
      getFinancialSummary(periodRange('today')),
      getOutstandingBalances(),
      getSupplierOutstanding(),
    ])
    if (summaryRes.error) {
      setErrorMsg(summaryRes.error.message)
      setLoadStatus('error')
      return
    }
    setSummary(summaryRes.data)
    // Sum customer outstanding balances
    const custTotal = (customerRes.data ?? []).reduce((sum, r) => sum + r.amount, 0)
    setCustomerOwing(custTotal)
    // Sum supplier outstanding balances
    const suppTotal = (supplierRes.data ?? []).reduce((sum, r) => sum + r.amount, 0)
    setSupplierOwing(suppTotal)
    setLoadStatus('loaded')
  }, [])

  useEffect(() => { void loadFinancials() }, [loadFinancials])

  // Low-stock products
  const lowStockItems = products.filter(p =>
    p.low_stock_threshold && p.low_stock_threshold > 0 && p.stock_quantity <= p.low_stock_threshold
  )

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadStatus === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-5">
        <Skeleton className="h-8 w-52" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (loadStatus === 'error') {
    return (
      <div className="py-6 md:py-10 text-center">
        <p className="text-sm text-danger">{errorMsg || t('notification.error.desc')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void loadFinancials()}>
          {t('products.retry')}
        </Button>
      </div>
    )
  }

  const s = summary!
  const isLoss = s.netProfit < 0

  // Inventory values — only shown for product businesses
  const showInventory = !bizConfig.isServiceBased
  const costValueStr   = s.inventoryCostValue !== null ? fmtETBCompact(s.inventoryCostValue) : null
  const retailValueStr = s.inventoryRetailValue !== null ? fmtETBCompact(s.inventoryRetailValue) : null

  // Show receivables/payables section only when there's something to show
  // (non-zero values, so the section doesn't clutter the dashboard for new businesses)
  const showReceivables = customerOwing > 0 || supplierOwing > 0

  return (
    <div className="py-6 md:py-10 space-y-5">

      {/* ── Greeting ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="heading text-2xl">
          {t('app.home.greeting', { name: profile?.owner_name ?? '' })}
        </h1>
        {profile?.name && <p className="mt-0.5 text-sm text-secondary">{profile.name}</p>}
      </div>

      {/* ── 2×2 primary stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* 1. Revenue */}
        <StatCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          iconBg="bg-primary-soft"
          iconColor="text-primary"
          label={t('home.todaySales')}
          value={fmtETBCompact(s.paidRevenue)}
        />

        {/* 2. Est. Net Profit (F1) */}
        <StatCard
          icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
          iconBg={isLoss ? 'bg-danger-soft' : 'bg-success-soft'}
          iconColor={isLoss ? 'text-danger' : 'text-success'}
          label={t('home.profit')}
          value={fmtETBCompact(s.netProfit)}
          hint={t('home.netProfitHint')}
          sub={!bizConfig.isServiceBased && s.cogsIncomplete ? t('overview.metric.partial') : undefined}
          subTone="warning"
        />

        {/* 3. Expenses */}
        <StatCard
          icon={<TrendingDown className="h-4 w-4" aria-hidden="true" />}
          iconBg="bg-danger-soft"
          iconColor="text-danger"
          label={t('home.todayExpenses')}
          value={fmtETBCompact(s.totalExpenses)}
        />

        {/* 4. Inventory Cost Value (F4) — null for service businesses */}
        {showInventory ? (
          <StatCard
            icon={<PackageSearch className="h-4 w-4" aria-hidden="true" />}
            iconBg="bg-primary-soft"
            iconColor="text-primary"
            label={t('home.inventoryCostValue')}
            value={costValueStr ?? '—'}
            hint={t('home.inventoryCostHint')}
            sub={s.inventoryCostIncomplete ? t('home.inventoryPartial') : undefined}
            subTone="warning"
          />
        ) : (
          /* Service businesses: show pending receivables in the 4th slot */
          <StatCard
            icon={<Receipt className="h-4 w-4" aria-hidden="true" />}
            iconBg="bg-warning-soft"
            iconColor="text-warning"
            label={t('home.customersOwe')}
            value={customerOwing > 0 ? fmtETBCompact(customerOwing) : t('home.noneOutstanding')}
            hint={t('home.customersOweHint')}
          />
        )}
      </div>

      {/* ── Pending payments banner ─────────────────────────────────────────── */}
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

      {/* ── Inventory valuation section (product businesses only) ───────────── */}
      {showInventory && (retailValueStr !== null || costValueStr !== null) && (
        <div className="rounded-xl border border-border bg-surface px-4 py-1">
          <p className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
            {t('home.inventorySection')}
          </p>
          <div className="divide-y divide-border">
            <InfoRow
              label={t('home.inventoryCostValue')}
              value={costValueStr}
              hint={t('home.inventoryCostHint')}
            />
            <InfoRow
              label={t('home.inventoryRetailValue')}
              value={retailValueStr}
              hint={t('home.inventoryRetailHint')}
              tone="success"
            />
          </div>
          {s.inventoryCostIncomplete && (
            <p className="pb-2 text-[11px] text-warning">{t('home.inventoryPartial')}</p>
          )}
        </div>
      )}

      {/* ── Receivables / Payables section ──────────────────────────────────── */}
      {showReceivables && (
        <div className="rounded-xl border border-border bg-surface px-4 py-1">
          <p className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-secondary">
            {t('home.receivablesSection')}
          </p>
          <div className="divide-y divide-border">
            {customerOwing > 0 && (
              <button type="button" onClick={() => navigate('/app/customers')}
                className="flex w-full items-center justify-between gap-2 py-2 text-left hover:opacity-80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm text-secondary truncate">{t('home.customersOwe')}</span>
                  <div className="group relative shrink-0">
                    <HelpCircle className="h-3 w-3 text-muted cursor-help" aria-label={t('home.customersOweHint')} />
                    <div className="pointer-events-none invisible absolute left-0 top-5 z-10 w-44 rounded-lg border border-border bg-surface p-2 text-xs text-secondary shadow-lg group-hover:visible">
                      {t('home.customersOweHint')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-semibold text-warning">{fmtETBCompact(customerOwing)}</span>
                  <ArrowRight className="h-3 w-3 text-secondary" aria-hidden="true" />
                </div>
              </button>
            )}
            {supplierOwing > 0 && (
              <button type="button" onClick={() => navigate('/app/purchases')}
                className="flex w-full items-center justify-between gap-2 py-2 text-left hover:opacity-80">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm text-secondary truncate">{t('home.youOweSuppliers')}</span>
                  <div className="group relative shrink-0">
                    <HelpCircle className="h-3 w-3 text-muted cursor-help" aria-label={t('home.youOweSuppliersHint')} />
                    <div className="pointer-events-none invisible absolute left-0 top-5 z-10 w-44 rounded-lg border border-border bg-surface p-2 text-xs text-secondary shadow-lg group-hover:visible">
                      {t('home.youOweSuppliersHint')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-sm font-semibold text-danger">{fmtETBCompact(supplierOwing)}</span>
                  <ArrowRight className="h-3 w-3 text-secondary" aria-hidden="true" />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Low-stock banner (product businesses only) ──────────────────────── */}
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

      {/* ── Primary action ───────────────────────────────────────────────────── */}
      <Button fullWidth size="lg"
        leadingIcon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />}
        onClick={() => navigate('/app/pos')}>
        {bizConfig.newSaleLabel}
      </Button>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">{t('home.quickActions')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: <ShoppingCart className="h-5 w-5" aria-hidden="true" />, label: bizConfig.newSaleLabel, route: '/app/pos',      primary: true },
            { icon: <Wallet className="h-5 w-5" aria-hidden="true" />,       label: t('home.quickExpense'), route: '/app/expenses',  primary: false },
            { icon: <Receipt className="h-5 w-5" aria-hidden="true" />,      label: t('home.quickSales'),   route: '/app/sales',     primary: false },
            { icon: <BarChart2 className="h-5 w-5" aria-hidden="true" />,    label: t('home.quickReport'),  route: '/app/reports',   primary: false },
          ].map(a => (
            <button key={a.route} type="button" onClick={() => navigate(a.route)}
              className={[
                'flex flex-col items-center gap-2 rounded-xl border py-4 text-center transition-colors',
                a.primary
                  ? 'border-primary bg-primary text-white hover:bg-primary-interactive'
                  : 'border-border bg-surface text-secondary hover:bg-background hover:text-text',
              ].join(' ')}>
              {a.icon}
              <span className="text-xs font-medium leading-tight">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Secondary quick actions */}
        <div className="grid grid-cols-3 gap-2">
          {[
            ...(!bizConfig.isServiceBased ? [
              { icon: <PackageSearch className="h-4 w-4" aria-hidden="true" />, label: t('nav.products'),   route: '/app/products' },
              { icon: <Users className="h-4 w-4" aria-hidden="true" />,         label: t('nav.customers'),  route: '/app/customers' },
            ] : [
              { icon: <PackageSearch className="h-4 w-4" aria-hidden="true" />, label: t('nav.services'),   route: '/app/products' },
              { icon: <Users className="h-4 w-4" aria-hidden="true" />,         label: t('nav.clients'),    route: '/app/customers' },
            ]),
            { icon: <Bell className="h-4 w-4" aria-hidden="true" />, label: t('notifications.title'), route: '/app/notifications' },
          ].map(a => (
            <button key={a.route} type="button" onClick={() => navigate(a.route)}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-background">
              <span className="text-secondary">{a.icon}</span>
              <span className="text-xs font-medium text-secondary">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Recent sales ─────────────────────────────────────────────────────── */}
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
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/app/pos')}>
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

      {/* ── View full report ─────────────────────────────────────────────────── */}
      <Button
        variant="secondary"
        fullWidth
        leadingIcon={<BarChart2 className="h-4 w-4" aria-hidden="true" />}
        onClick={() => navigate('/app/reports')}>
        {t('home.viewFullReport')}
      </Button>
    </div>
  )
}
