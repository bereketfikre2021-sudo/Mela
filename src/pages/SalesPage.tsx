import { useState } from 'react'
import { Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useSales } from '../modules/retail/useSales'
import type { PaymentStatus, SaleWithItems } from '../modules/retail/types'

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
  if (s === 'paid')      return 'success'
  if (s === 'pending')   return 'warning'
  return 'danger'
}

/** Sales history page — Phase 2.3. */
export function SalesPage() {
  const { t } = useTranslation()
  const { sales, status, errorMessage, reload } = useSales()
  const [selected, setSelected] = useState<SaleWithItems | null>(null)

  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <Skeleton className="mb-6 h-8 w-40" />
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
      <div className="py-6 md:py-10">
        <div className="mb-6">
          <h1 className="heading text-2xl md:text-3xl">{t('sales.title')}</h1>
          <p className="mt-1 text-sm text-secondary">
            {sales.length === 0
              ? t('sales.subtitle')
              : t('sales.count', { count: sales.length })}
          </p>
        </div>

        {sales.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('sales.empty.title')}
            description={t('sales.empty.desc')}
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
                {sales.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.sale_number}</TableCell>
                    <TableCell className="hidden text-secondary sm:table-cell">
                      {fmtDate(s.sold_at)}
                    </TableCell>
                    <TableCell className="text-right text-figures">{fmtPrice(s.total)}</TableCell>
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

      {/* ── Sale detail dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={selected !== null}
        onOpenChange={open => { if (!open) setSelected(null) }}
        title={selected?.sale_number ?? ''}
        closeLabel={t('common.close')}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Meta */}
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

            {/* Items */}
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                      {t('sales.detail.product')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                      {t('sales.detail.qty')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                      {t('sales.detail.unitPrice')}
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                      {t('sales.detail.lineTotal')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selected.sale_items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.product_name}</td>
                      <td className="px-3 py-2 text-right text-figures">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-figures">{fmtPrice(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right text-figures">{fmtPrice(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-background font-semibold">
                    <td colSpan={3} className="px-3 py-2 text-right text-secondary text-xs uppercase tracking-wide">
                      {t('sales.detail.total')}
                    </td>
                    <td className="px-3 py-2 text-right text-figures">{fmtPrice(selected.total)}</td>
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
