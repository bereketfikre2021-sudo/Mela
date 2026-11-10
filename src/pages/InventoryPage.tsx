import { useMemo, useState } from 'react'
import { AlertTriangle, History, PackageX, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select } from '../design-system/Select'
import { StatusBadge } from '../design-system/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useAuth } from '../modules/auth/AuthContext'
import { receivePurchase } from '../modules/purchases/api'
import { useMovements } from '../modules/retail/useMovements'
import { useProducts } from '../modules/retail/useProducts'
import { useSuppliers } from '../modules/suppliers/useSuppliers'
import type { MovementType } from '../modules/retail/inventoryTypes'
import type { Product } from '../modules/retail/types'

function fmtQty(n: number) { return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2) }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function movementTone(type: MovementType): 'success' | 'danger' | 'info' | 'warning' | 'neutral' {
  if (type === 'sale' || type === 'damaged') return 'danger'
  if (type === 'purchase' || type === 'return') return 'success'
  return 'neutral'
}

/** Suggested reorder = bring stock up to 2× the threshold (simple heuristic). */
function suggestedReorder(p: Product): number {
  if (!p.low_stock_threshold || p.low_stock_threshold <= 0) return 0
  const target = p.low_stock_threshold * 2
  return Math.max(0, target - p.stock_quantity)
}

/** Inventory page with low-stock alerts and movement history — Phase 6.4. */
export function InventoryPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const { movements, status: movStatus, errorMessage: movError, reload: reloadMov } = useMovements()
  const { products, reload: reloadProducts } = useProducts()
  const { suppliers } = useSuppliers()
  const { notify } = useNotification()

  // ── Movement filters ───────────────────────────────────────────────────────
  const [filterProduct, setFilterProduct] = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterFrom,    setFilterFrom]    = useState('')
  const [filterTo,      setFilterTo]      = useState('')
  const [stockFilter,   setStockFilter]   = useState<'all' | 'low' | 'out'>('all')

  // ── Restock dialog ─────────────────────────────────────────────────────────
  const [restockProduct,   setRestockProduct]   = useState<Product | null>(null)
  const [restockSupplierId, setRestockSupplierId] = useState('')
  const [restockQty,       setRestockQty]       = useState('')
  const [restockCost,      setRestockCost]      = useState('')
  const [restockSubmitting, setRestockSubmitting] = useState(false)
  const [idempotencyKey]  = useState(() => crypto.randomUUID())

  function openRestock(p: Product) {
    setRestockProduct(p)
    setRestockSupplierId('')
    setRestockQty(String(Math.ceil(suggestedReorder(p)) || 1))
    setRestockCost(p.cost_price != null ? String(p.cost_price) : '')
  }

  async function handleRestock() {
    if (!user || !restockProduct) return
    const qty  = parseFloat(restockQty)
    const cost = parseFloat(restockCost)
    if (isNaN(qty) || qty <= 0)  { notify({ tone: 'danger', title: t('inventory.adjust.invalidQty') }); return }
    if (isNaN(cost) || cost < 0) { notify({ tone: 'danger', title: t('purchases.form.errors.invalidCost') }); return }

    setRestockSubmitting(true)
    const { error } = await receivePurchase({
      owner_id:        user.id,
      supplier_id:     restockSupplierId || null,
      purchase_date:   new Date().toISOString().slice(0, 10),
      notes:           `Restock: ${restockProduct.name}`,
      idempotency_key: idempotencyKey,
      items: [{ product_id: restockProduct.id, quantity: qty, unit_cost: cost }],
    })
    setRestockSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('inventory.restock.success') })
    setRestockProduct(null)
    await Promise.all([reloadProducts(), reloadMov()])
  }

  // ── Derived low-stock data ─────────────────────────────────────────────────
  const lowStockProducts  = useMemo(() =>
    products.filter(p => p.low_stock_threshold && p.low_stock_threshold > 0 && p.stock_quantity <= p.low_stock_threshold),
    [products])
  const outOfStockProducts = useMemo(() =>
    products.filter(p => p.stock_quantity === 0),
    [products])

  const alertProducts = useMemo(() => {
    if (stockFilter === 'out') return outOfStockProducts
    if (stockFilter === 'low') return lowStockProducts
    return []
  }, [stockFilter, lowStockProducts, outOfStockProducts])

  // ── Filtered movements ─────────────────────────────────────────────────────
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (filterProduct && m.product_id !== filterProduct) return false
      if (filterType && m.movement_type !== filterType) return false
      if (filterFrom && m.created_at < filterFrom) return false
      if (filterTo   && m.created_at > filterTo + 'T23:59:59') return false
      return true
    })
  }, [movements, filterProduct, filterType, filterFrom, filterTo])

  const productOptions = [
    { value: '', label: t('inventory.filter.allProducts') },
    ...products.map(p => ({ value: p.id, label: p.name })),
  ]
  const typeOptions = [
    { value: '', label: t('inventory.filter.allTypes') },
    ...(['purchase', 'sale', 'adjustment', 'return', 'damaged'] as MovementType[]).map(mt => ({
      value: mt, label: t(`inventory.movementType.${mt}`),
    })),
  ]
  const supplierOptions = [
    { value: '', label: t('purchases.form.noSupplier') },
    ...suppliers.map(s => ({ value: s.id, label: s.name })),
  ]

  if (movStatus === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
        <div className="space-y-px rounded-lg border border-border overflow-hidden">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}
        </div>
      </div>
    )
  }

  if (movStatus === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState icon={History} title={t('notification.error.title')} description={movError}
          action={<Button variant="secondary" onClick={() => void reloadMov()}>{t('products.retry')}</Button>} />
      </div>
    )
  }

  return (
    <>
      <div className="py-6 md:py-10 space-y-6">

        {/* ── Low-stock summary ─────────────────────────────────────────── */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">
              {t('inventory.alerts.title')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Out of stock */}
              <button
                type="button"
                onClick={() => setStockFilter(f => f === 'out' ? 'all' : 'out')}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  stockFilter === 'out' ? 'border-danger bg-danger-soft' : 'border-border bg-surface hover:border-danger/40'
                }`}
              >
                <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold text-figures text-danger">{outOfStockProducts.length}</p>
                  <p className="text-xs text-secondary">{t('inventory.alerts.outOfStock')}</p>
                </div>
              </button>

              {/* Low stock */}
              <button
                type="button"
                onClick={() => setStockFilter(f => f === 'low' ? 'all' : 'low')}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  stockFilter === 'low' ? 'border-warning bg-warning-soft' : 'border-border bg-surface hover:border-warning/40'
                }`}
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold text-figures text-warning">{lowStockProducts.length}</p>
                  <p className="text-xs text-secondary">{t('inventory.alerts.lowStock')}</p>
                </div>
              </button>

              {/* Healthy */}
              <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
                <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <div>
                  <p className="text-2xl font-bold text-figures text-success">
                    {products.length - lowStockProducts.length}
                  </p>
                  <p className="text-xs text-secondary">{t('inventory.alerts.healthy')}</p>
                </div>
              </div>
            </div>

            {/* Alert detail table */}
            {alertProducts.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-secondary">{t('inventory.alerts.col.product')}</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('inventory.alerts.col.stock')}</th>
                      <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary sm:table-cell">{t('inventory.alerts.col.threshold')}</th>
                      <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary md:table-cell">{t('inventory.alerts.col.shortage')}</th>
                      <th className="hidden px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary lg:table-cell">{t('inventory.alerts.col.suggested')}</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {alertProducts.map(p => {
                      const threshold = p.low_stock_threshold ?? 0
                      const shortage  = Math.max(0, threshold - p.stock_quantity)
                      const suggested = Math.ceil(suggestedReorder(p))
                      return (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-medium">{p.name}</td>
                          <td className={`px-4 py-3 text-right text-figures ${p.stock_quantity === 0 ? 'text-danger font-semibold' : 'text-warning font-semibold'}`}>
                            {fmtQty(p.stock_quantity)} {p.unit}
                          </td>
                          <td className="hidden px-4 py-3 text-right text-figures text-secondary sm:table-cell">
                            {threshold > 0 ? fmtQty(threshold) : '—'}
                          </td>
                          <td className="hidden px-4 py-3 text-right text-figures text-secondary md:table-cell">
                            {shortage > 0 ? fmtQty(shortage) : '—'}
                          </td>
                          <td className="hidden px-4 py-3 text-right text-figures text-secondary lg:table-cell">
                            {suggested > 0 ? fmtQty(suggested) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="secondary" onClick={() => openRestock(p)}>
                              {t('inventory.restock.button')}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Movement history ───────────────────────────────────────────── */}
        <section>
          <div className="mb-4">
            <h1 className="heading text-2xl md:text-3xl">{t('inventory.title')}</h1>
            <p className="mt-1 text-sm text-secondary">
              {movements.length === 0 ? t('inventory.subtitle') : t('inventory.count', { count: filteredMovements.length, total: movements.length })}
            </p>
          </div>

          {movements.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Select options={productOptions} value={filterProduct}
                onChange={e => setFilterProduct(e.target.value)} aria-label={t('inventory.filter.product')} />
              <Select options={typeOptions} value={filterType}
                onChange={e => setFilterType(e.target.value)} aria-label={t('inventory.filter.type')} />
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                aria-label={t('expenses.filter.from')} />
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                aria-label={t('expenses.filter.to')} />
            </div>
          )}

          {movements.length === 0 ? (
            <EmptyState icon={History} title={t('inventory.empty.title')} description={t('inventory.empty.desc')} />
          ) : filteredMovements.length === 0 ? (
            <EmptyState icon={History} title={t('contacts.noResults')} description={t('contacts.noResultsDesc')} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inventory.col.product')}</TableHead>
                    <TableHead>{t('inventory.col.type')}</TableHead>
                    <TableHead className="text-right">{t('inventory.col.change')}</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">{t('inventory.col.before')}</TableHead>
                    <TableHead className="text-right">{t('inventory.col.after')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('inventory.col.reason')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('inventory.col.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.product_name}</TableCell>
                      <TableCell>
                        <StatusBadge tone={movementTone(m.movement_type)}>
                          {t(`inventory.movementType.${m.movement_type}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className={`text-right text-figures font-semibold ${m.quantity_change > 0 ? 'text-success' : 'text-danger'}`}>
                        {m.quantity_change > 0 ? '+' : ''}{fmtQty(m.quantity_change)}
                      </TableCell>
                      <TableCell className="text-right text-figures hidden sm:table-cell">{fmtQty(m.stock_before)}</TableCell>
                      <TableCell className="text-right text-figures">{fmtQty(m.stock_after)}</TableCell>
                      <TableCell className="hidden text-secondary md:table-cell">{m.reason ?? '—'}</TableCell>
                      <TableCell className="text-secondary hidden sm:table-cell">{fmtDateTime(m.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      {/* ── Quick restock dialog ───────────────────────────────────────────── */}
      <Dialog
        open={restockProduct !== null}
        onOpenChange={o => { if (!o && !restockSubmitting) setRestockProduct(null) }}
        title={t('inventory.restock.title')}
        closeLabel={t('common.cancel')}
      >
        {restockProduct && (
          <div className="flex flex-col gap-4">
            {/* Product info */}
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <p className="font-semibold text-text">{restockProduct.name}</p>
              <p className="mt-0.5 text-secondary">
                {t('inventory.restock.currentStock')}{' '}
                <span className="font-semibold text-figures text-text">
                  {fmtQty(restockProduct.stock_quantity)} {restockProduct.unit}
                </span>
              </p>
            </div>

            <Select
              label={t('purchases.form.supplier')}
              options={supplierOptions}
              value={restockSupplierId}
              onChange={e => setRestockSupplierId(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('inventory.restock.quantity')}
                inputMode="decimal"
                value={restockQty}
                onChange={e => setRestockQty(e.target.value)}
              />
              <Input
                label={t('inventory.restock.unitCost')}
                helperText="ETB"
                inputMode="decimal"
                value={restockCost}
                onChange={e => setRestockCost(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setRestockProduct(null)} disabled={restockSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button loading={restockSubmitting} onClick={() => void handleRestock()}>
                {t('inventory.restock.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
