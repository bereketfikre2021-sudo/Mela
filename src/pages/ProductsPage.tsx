import { Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useProducts } from '../modules/retail/useProducts'

/** Retail products list page — Phase 2.1. */
export function ProductsPage() {
  const { t } = useTranslation()
  const { products, status, errorMessage, reload } = useProducts()

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState
          icon={Package}
          title={t('notification.error.title')}
          description={errorMessage || t('notification.error.desc')}
          action={
            <button
              type="button"
              onClick={() => void reload()}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('products.retry')}
            </button>
          }
        />
      </div>
    )
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (products.length === 0) {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-8">
          <h1 className="heading text-2xl md:text-3xl">{t('products.title')}</h1>
          <p className="mt-2 text-sm text-secondary">{t('products.subtitle')}</p>
        </div>
        <EmptyState
          icon={Package}
          title={t('products.empty.title')}
          description={t('products.empty.desc')}
        />
      </div>
    )
  }

  // ── List ───────────────────────────────────────────────────────────────────
  return (
    <div className="py-6 md:py-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="heading text-2xl md:text-3xl">{t('products.title')}</h1>
          <p className="mt-1 text-sm text-secondary">
            {t('products.count', { count: products.length })}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('products.col.name')}</TableHead>
              <TableHead>{t('products.col.sku')}</TableHead>
              <TableHead className="text-right">{t('products.col.price')}</TableHead>
              <TableHead className="text-right">{t('products.col.stock')}</TableHead>
              <TableHead>{t('products.col.unit')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-secondary">{p.sku ?? '—'}</TableCell>
                <TableCell className="text-right text-figures">
                  {t('products.price', { price: p.selling_price.toFixed(2) })}
                </TableCell>
                <TableCell className="text-right text-figures">
                  {p.stock_quantity % 1 === 0
                    ? p.stock_quantity.toFixed(0)
                    : p.stock_quantity.toFixed(2)}
                </TableCell>
                <TableCell className="text-secondary">{p.unit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
