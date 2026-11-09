import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useAuth } from '../modules/auth/AuthContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { useSales } from '../modules/retail/useSales'
import type { PaymentStatus, SaleWithItems } from '../modules/retail/types'

type Period = 'today' | 'week' | 'month' | 'all'

function fmtPrice(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function statusTone(s: PaymentStatus): 'success' | 'warning' | 'danger' {
  if (s === 'paid')    return 'success'
  if (s === 'pending') return 'warning'
  return 'danger'
}

function startOf(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return null
}

export function SalesPage() {
  const { t }       = useTranslation()
  const navigate    = useNavigate()
  const { profile } = useAuth()
  const bizConfig   = getBusinessConfig(profile?.type ?? 'retail')
  const isService   = bizConfig.isServiceBased

  const { sales, status, errorMessage, reload } = useSales()
  const [period,   setPeriod]   = useState<Period>('today')
  const [selected, setSelected] = useState<SaleWithItems | null>(null)

  const filtered = useMemo(() => {
    const cutoff = startOf(period)
    if (!cutoff) return sales
    return sales.filter(s => new Date(s.sold_at) >= cutoff)
  }, [sales, period])

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: t('sales.filter.today') },
    { key: 'week',  label: t('sales.filter.week')  },
    { key: 'month', label: t('sales.filter.month') },
    { key: 'all',   label: t('sales.filter.all')   },
  ]

  const pageTitle = isService ? t('nav.jobs')   : t('sales.title')
  const newLabel  = isService ? t('nav.newJob') : t('nav.newSale')

  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-px rounded-lg border border-border overflow-hidden">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState
          icon={Receipt}
          title={t('notification.error.title')}
          description={errorMessage || t('notification.error.desc')}
          action={<Button variant="secondary" onClick={() => void reload()}>{t('products.retry')}</Button>}
        />
      </div>
    )
  }

  return (
    <>
      <div className="py-6 md:py-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-text">{pageTitle}</h1>
          <Button
            size="sm"
            leadingIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/app/pos')}
          >
            {newLabel}
          </Button>
        </div>

        {/* Period filter tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {periods.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={[
                'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                period === p.key
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-secondary hover:text-text',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Count */}
        {filtered.length > 0 && (
          <p className="text-sm text-secondary">
            {t('sales.count', { count: filtered.length })}
          </p>
        )}

        {/* Table or empty state */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('sales.empty.title')}
            description={period === 'today' ? t('sales.empty.todayDesc') : t('sales.empty.desc')}
            action={
              <Button
                size="sm"
                leadingIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/app/pos')}
              >
                {newLabel}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sales.col.ref')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('sales.col.date')}</TableHead>
                  <TableHead className="text-right">{t('sales.col.total')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('sales.col.payment')}</TableHead>
                  <TableHead>{t('sales.col.status')}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.sale_number}</TableCell>
                    <TableCell className="hidden text-secondary sm:table-cell">
                      {fmtDate(s.sold_at)}
                    </TableCell>
                    <TableCell className="text-right">{fmtPrice(s.total)}</TableCell>
                    <TableCell className="hidden text-secondary md:table-cell">
                      {t(`sales.payment.${s.payment_method}`)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone(s.payment_status)} dot>
                        {t(`sales.status.${s.payment_status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {t('sales.view')}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sale detail dialog */}
      <Dialog
        open={selected !== null}
        onOpenChange={open => { if (!open) setSelected(null) }}
        title={selected?.sale_number ?? ''}
        closeLabel={t('common.close')}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-secondary">{t('sales.col.date')}</dt>
                <dd className="font-medium">{fmtDate(selected.sold_at)}</dd>
              </div>
              <div>
                <dt className="text-secondary">{t('sales.col.payment')}</dt>
                <dd className="font-medium">{t(`sales.payment.${selected.payment_method}`)}</dd>
              </div>
              <div>
                <dt className="text-secondary">{t('sales.col.status')}</dt>
                <dd>
                  <StatusBadge tone={statusTone(selected.payment_status)} dot>
                    {t(`sales.status.${selected.payment_status}`)}
                  </StatusBadge>
                </dd>
              </div>
            </dl>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">{t('sales.detail.product')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('sales.detail.qty')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('sales.detail.unitPrice')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('sales.detail.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selected.sale_items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{fmtPrice(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right">{fmtPrice(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-background font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right text-secondary text-xs uppercase tracking-wide">{t('sales.detail.total')}</td>
                    <td className="px-3 py-2 text-right">{fmtPrice(selected.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
