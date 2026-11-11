/**
 * Stock page — Phase 7 simplified navigation.
 *
 * A practical product list showing stock status at a glance.
 * All advanced features (CRUD, adjustments, purchase, inventory history)
 * are accessible via action buttons — nothing is removed.
 */
import { useState } from 'react'
import { AlertTriangle, ArrowDownUp, ClipboardList, History, PackageX, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select } from '../design-system/Select'
import { useAuth } from '../modules/auth/AuthContext'
import { adjustStock } from '../modules/retail/inventoryApi'
import { receivePurchase } from '../modules/purchases/api'
import { enqueueStockAdjust, enqueuePurchase } from '../lib/offlineQueue'
import { useSyncContext } from '../context/SyncContext'
import { createProduct, updateProduct, deleteProduct } from '../modules/retail/api'
import { ProductForm } from '../modules/retail/ProductForm'
import { MANUAL_MOVEMENT_TYPES } from '../modules/retail/inventoryTypes'
import { useProducts } from '../modules/retail/useProducts'
import { useSuppliers } from '../modules/suppliers/useSuppliers'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import type { Product, ProductInput } from '../modules/retail/types'
import type { MovementType } from '../modules/retail/inventoryTypes'

function fmtPrice(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtQty(n: number) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
}

function stockStatus(p: Product): 'out' | 'low' | 'ok' {
  if (p.stock_quantity === 0) return 'out'
  if (p.low_stock_threshold && p.low_stock_threshold > 0 && p.stock_quantity <= p.low_stock_threshold) return 'low'
  return 'ok'
}

function StockIndicator({ status, qty, unit }: { status: 'out' | 'low' | 'ok'; qty: number; unit: string }) {
  const { t } = useTranslation()
  if (status === 'out') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-danger">
      <PackageX className="h-3.5 w-3.5" aria-hidden="true" />
      {t('inventory.alerts.outOfStock')}
    </span>
  )
  if (status === 'low') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-warning">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      {fmtQty(qty)} {unit}
    </span>
  )
  return (
    <span className="text-xs text-figures font-medium text-text">
      {fmtQty(qty)} {unit}
    </span>
  )
}

export function StockPage() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const bizConfig = getBusinessConfig(profile?.type ?? 'retail')
  const { isOnline, refreshCount } = useSyncContext()
  const { products, status, errorMessage, reload } = useProducts()
  const { suppliers } = useSuppliers()
  const { notify } = useNotification()

  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all')

  // Add product dialog
  const [addOpen,     setAddOpen]     = useState(false)
  const [addSubmit,   setAddSubmit]   = useState(false)

  // Edit product dialog
  const [editProduct,  setEditProduct]  = useState<Product | null>(null)
  const [editSubmit,   setEditSubmit]   = useState(false)

  // Delete product dialog
  const [deleteProductState, setDeleteProductState] = useState<Product | null>(null)
  const [deleteSubmit, setDeleteSubmit] = useState(false)

  // Adjust stock dialog
  const [adjProduct,  setAdjProduct]  = useState<Product | null>(null)
  const [adjType,     setAdjType]     = useState<MovementType>('purchase')
  const [adjQty,      setAdjQty]      = useState('')
  const [adjReason,   setAdjReason]   = useState('')
  const [adjSubmit,   setAdjSubmit]   = useState(false)
  const [adjError,    setAdjError]    = useState('')

  // Quick restock dialog
  const [rstProduct,  setRstProduct]  = useState<Product | null>(null)
  const [rstSupplier, setRstSupplier] = useState('')
  const [rstQty,      setRstQty]      = useState('')
  const [rstCost,     setRstCost]     = useState('')
  const [rstSubmit,   setRstSubmit]   = useState(false)
  const [rstKey]      = useState(() => crypto.randomUUID())

  const filtered = products.filter(p => {
    const q = search.trim().toLowerCase()
    if (q && !p.name.toLowerCase().includes(q) && !(p.sku?.toLowerCase().includes(q))) return false
    if (statusFilter === 'out' && p.stock_quantity !== 0) return false
    if (statusFilter === 'low') {
      const st = stockStatus(p)
      if (st !== 'low' && st !== 'out') return false
    }
    return true
  })

  const lowCount = products.filter(p => stockStatus(p) === 'low').length
  const outCount = products.filter(p => stockStatus(p) === 'out').length

  async function handleAdd(input: ProductInput) {
    if (!user) return
    setAddSubmit(true)
    const { error } = await createProduct(input, user.id)
    setAddSubmit(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('products.notifications.added') })
    setAddOpen(false)
    await reload()
  }

  async function handleEdit(input: ProductInput) {
    if (!user || !editProduct) return
    setEditSubmit(true)
    const { error } = await updateProduct(editProduct.id, input, user.id)
    setEditSubmit(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('products.notifications.updated') })
    setEditProduct(null)
    await reload()
  }

  async function handleDelete() {
    if (!user || !deleteProductState) return
    setDeleteSubmit(true)
    const { error } = await deleteProduct(deleteProductState.id, user.id)
    setDeleteSubmit(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('products.notifications.deleted') })
    setDeleteProductState(null)
    await reload()
  }

  async function handleAdjust() {
    if (!user || !adjProduct) return
    const n = parseFloat(adjQty)
    if (isNaN(n) || n <= 0) { setAdjError(t('inventory.adjust.invalidQty')); return }
    const sign = adjType === 'purchase' || adjType === 'return' ? 1 : -1
    const change = sign * Math.abs(n)
    if (adjProduct.stock_quantity + change < 0) {
      setAdjError(t('inventory.adjust.negativeStock', { available: fmtQty(adjProduct.stock_quantity) }))
      return
    }
    setAdjSubmit(true)

    const payload = {
      owner_id:        user.id,
      product_id:      adjProduct.id,
      movement_type:   adjType,
      quantity_change: change,
      reason:          adjReason.trim() || null,
    }

    if (!isOnline) {
      await enqueueStockAdjust(payload)
      await refreshCount()
      setAdjSubmit(false)
      notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
      setAdjProduct(null)
      return
    }

    const { error } = await adjustStock(payload)
    setAdjSubmit(false)

    if (error) {
      if (!navigator.onLine || error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        await enqueueStockAdjust(payload)
        await refreshCount()
        notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
        setAdjProduct(null)
        return
      }
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('inventory.adjust.success') })
    setAdjProduct(null)
    await reload()
  }

  async function handleRestock() {
    if (!user || !rstProduct) return
    const qty  = parseFloat(rstQty)
    const cost = parseFloat(rstCost)
    if (isNaN(qty) || qty <= 0)  { notify({ tone: 'danger', title: t('inventory.adjust.invalidQty') }); return }
    if (isNaN(cost) || cost < 0) { notify({ tone: 'danger', title: t('purchases.form.errors.invalidCost') }); return }
    setRstSubmit(true)

    const payload = {
      owner_id:        user.id,
      supplier_id:     rstSupplier || null,
      purchase_date:   new Date().toISOString().slice(0, 10),
      notes:           `Restock: ${rstProduct.name}`,
      idempotency_key: rstKey,
      items:           [{ product_id: rstProduct.id, quantity: qty, unit_cost: cost }],
    }

    if (!isOnline) {
      await enqueuePurchase(payload)
      await refreshCount()
      setRstSubmit(false)
      notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
      setRstProduct(null)
      return
    }

    const { error } = await receivePurchase(payload)
    setRstSubmit(false)

    if (error) {
      if (!navigator.onLine || error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        await enqueuePurchase(payload)
        await refreshCount()
        notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
        setRstProduct(null)
        return
      }
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('inventory.restock.success') })
    setRstProduct(null)
    await reload()
  }

  const supplierOptions = [
    { value: '', label: t('purchases.form.noSupplier') },
    ...suppliers.map(s => ({ value: s.id, label: s.name })),
  ]

  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10 space-y-3">
        <Skeleton className="h-8 w-40" />
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState icon={AlertTriangle} title={t('notification.error.title')} description={errorMessage}
          action={<Button variant="secondary" onClick={() => void reload()}>{t('products.retry')}</Button>} />
      </div>
    )
  }

  return (
    <>
      <div className="py-6 md:py-10 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="heading text-2xl md:text-3xl">{bizConfig.stockPageTitle}</h1>
            <p className="mt-1 text-sm text-secondary">
              {products.length === 0 ? bizConfig.stockEmptyDesc : `${products.length} ${bizConfig.stockLabel.toLowerCase()}`}
            </p>
          </div>
          <Button size="sm" leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => setAddOpen(true)}>
            {bizConfig.isServiceBased ? t('stock.addService') : t('products.addProduct')}
          </Button>
        </div>

        {/* Alert strip — only for non-service businesses */}
        {!bizConfig.isServiceBased && (lowCount > 0 || outCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {outCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(f => f === 'out' ? 'all' : 'out')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'out' ? 'bg-danger text-white' : 'bg-danger-soft text-danger hover:bg-danger/20'}`}
              >
                <PackageX className="h-3.5 w-3.5" aria-hidden="true" />
                {outCount} {t('inventory.alerts.outOfStock')}
              </button>
            )}
            {lowCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(f => f === 'low' ? 'all' : 'low')}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${statusFilter === 'low' ? 'bg-warning text-white' : 'bg-warning-soft text-warning hover:bg-warning/20'}`}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {lowCount} {t('inventory.alerts.lowStock')}
              </button>
            )}
            {statusFilter !== 'all' && (
              <button type="button" onClick={() => setStatusFilter('all')}
                className="text-xs text-secondary hover:text-text underline">
                {t('stock.showAll')}
              </button>
            )}
          </div>
        )}

        {/* Search */}
        {products.length > 0 && (
          <Input placeholder={t('stock.search')} value={search} onChange={e => setSearch(e.target.value)}
            aria-label={t('stock.search')} />
        )}

        {/* Secondary actions */}
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/app/inventory')}
            className="flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary">
            <History className="h-4 w-4" aria-hidden="true" />
            {t('stock.viewHistory')}
          </button>
          <span className="text-border">·</span>
          <button type="button" onClick={() => navigate('/app/purchases')}
            className="flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-primary">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            {t('stock.viewPurchases')}
          </button>
        </div>

        {/* Product / service list */}
        {products.length === 0 ? (
          <EmptyState icon={AlertTriangle}
            title={bizConfig.isServiceBased ? t('stock.emptyServices') : t('products.empty.title')}
            description={bizConfig.stockEmptyDesc}
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={() => setAddOpen(true)}>
                {bizConfig.isServiceBased ? t('stock.addService') : t('products.addProduct')}
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-secondary py-8">{t('contacts.noResults')}</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {filtered.map(p => {
              const st = bizConfig.isServiceBased ? 'ok' : stockStatus(p)
              return (
                <div key={p.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                  {/* Status dot — always green for services */}
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${st === 'out' ? 'bg-danger' : st === 'low' ? 'bg-warning' : 'bg-success'}`} aria-hidden="true" />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text truncate">{p.name}</p>
                    <div className="mt-0.5 flex items-center gap-3">
                      {/* Service: show price only. Product: show stock + price */}
                      {bizConfig.isServiceBased ? (
                        <span className="text-xs text-secondary">{fmtPrice(p.selling_price)}</span>
                      ) : (
                        <>
                          <StockIndicator status={st} qty={p.stock_quantity} unit={p.unit} />
                          <span className="text-xs text-secondary">{fmtPrice(p.selling_price)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons — edit/delete for service businesses */}
                  {bizConfig.isServiceBased && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button"
                        onClick={() => setEditProduct(p)}
                        aria-label={t('products.actions.edit', { name: p.name })}
                        className="rounded p-1.5 text-secondary hover:bg-background hover:text-text">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button"
                        onClick={() => setDeleteProductState(p)}
                        aria-label={t('products.actions.delete', { name: p.name })}
                        className="rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {/* Action buttons — only restock + adjust for physical-stock businesses */}
                  {!bizConfig.isServiceBased && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button"
                        onClick={() => {
                          setRstProduct(p)
                          setRstQty(String(Math.max(1, Math.ceil((p.low_stock_threshold ?? 0) * 2 - p.stock_quantity))))
                          setRstCost(p.cost_price != null ? String(p.cost_price) : '')
                          setRstSupplier('')
                        }}
                        aria-label={t('inventory.restock.button')}
                        title={t('inventory.restock.button')}
                        className="rounded p-1.5 text-secondary hover:bg-primary-soft hover:text-primary">
                        <ClipboardList className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button"
                        onClick={() => { setAdjProduct(p); setAdjType('purchase'); setAdjQty(''); setAdjReason(''); setAdjError('') }}
                        aria-label={t('inventory.adjust.ariaLabel', { name: p.name })}
                        className="rounded p-1.5 text-secondary hover:bg-background hover:text-text">
                        <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button"
                        onClick={() => setEditProduct(p)}
                        aria-label={t('products.actions.edit', { name: p.name })}
                        className="rounded p-1.5 text-secondary hover:bg-background hover:text-text">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button"
                        onClick={() => setDeleteProductState(p)}
                        aria-label={t('products.actions.delete', { name: p.name })}
                        className="rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger">
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* [products management link removed — edit/delete now inline] */}
      </div>

      {/* ── Add product dialog ─────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={o => { if (!o) setAddOpen(false) }}
        title={t('products.form.titleAdd')} closeLabel={t('common.close')}>
        <ProductForm mode="add" onSubmit={handleAdd} onCancel={() => setAddOpen(false)} submitting={addSubmit} />
      </Dialog>

      {/* ── Adjust stock dialog ────────────────────────────────────────────── */}
      <Dialog open={adjProduct !== null} onOpenChange={o => { if (!o) setAdjProduct(null) }}
        title={t('inventory.adjust.title')} closeLabel={t('common.cancel')}>
        {adjProduct && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <p className="text-secondary">{t('inventory.adjust.currentStock')}</p>
              <p className="mt-0.5 text-xl font-semibold text-figures text-text">
                {fmtQty(adjProduct.stock_quantity)} {adjProduct.unit}
              </p>
              <p className="font-medium text-text">{adjProduct.name}</p>
            </div>
            <Select label={t('inventory.adjust.type')}
              options={MANUAL_MOVEMENT_TYPES.map(mt => ({ value: mt, label: t(`inventory.movementType.${mt}`) }))}
              value={adjType} onChange={e => { setAdjType(e.target.value as MovementType); setAdjError('') }} />
            <Input label={t('inventory.adjust.quantity')} helperText={t('inventory.adjust.quantityHelper')}
              inputMode="decimal" value={adjQty}
              onChange={e => { setAdjQty(e.target.value); setAdjError('') }} error={adjError} />
            <Input label={t('inventory.adjust.reason')} helperText={t('inventory.adjust.reasonHelper')}
              value={adjReason} onChange={e => setAdjReason(e.target.value)} maxLength={500} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setAdjProduct(null)} disabled={adjSubmit}>{t('common.cancel')}</Button>
              <Button loading={adjSubmit} onClick={() => void handleAdjust()}>{t('inventory.adjust.confirm')}</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Quick restock dialog ───────────────────────────────────────────── */}
      <Dialog open={rstProduct !== null} onOpenChange={o => { if (!o && !rstSubmit) setRstProduct(null) }}
        title={t('inventory.restock.title')} closeLabel={t('common.cancel')}>
        {rstProduct && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <p className="font-semibold text-text">{rstProduct.name}</p>
              <p className="mt-0.5 text-secondary">
                {t('inventory.restock.currentStock')}{' '}
                <span className="font-semibold text-figures text-text">{fmtQty(rstProduct.stock_quantity)} {rstProduct.unit}</span>
              </p>
            </div>
            <Select label={t('purchases.form.supplier')} options={supplierOptions}
              value={rstSupplier} onChange={e => setRstSupplier(e.target.value)} />
            <div className="-mt-2">
              <button type="button" onClick={() => navigate('/app/suppliers')}
                className="text-xs font-medium text-primary hover:underline">
                {t('stock.manageSuppliers')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('inventory.restock.quantity')} inputMode="decimal"
                value={rstQty} onChange={e => setRstQty(e.target.value)} />
              <Input label={t('inventory.restock.unitCost')} helperText="ETB"
                inputMode="decimal" value={rstCost} onChange={e => setRstCost(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setRstProduct(null)} disabled={rstSubmit}>{t('common.cancel')}</Button>
              <Button loading={rstSubmit} onClick={() => void handleRestock()}>{t('inventory.restock.confirm')}</Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Edit product dialog ────────────────────────────────────────────── */}
      <Dialog open={editProduct !== null} onOpenChange={o => { if (!o) setEditProduct(null) }}
        title={bizConfig.isServiceBased ? t('products.form.titleEditService') : t('products.form.titleEdit')}
        closeLabel={t('common.close')}>
        {editProduct && (
          <ProductForm
            mode="edit"
            initial={editProduct}
            isServiceBased={bizConfig.isServiceBased}
            onSubmit={handleEdit}
            onCancel={() => setEditProduct(null)}
            submitting={editSubmit}
          />
        )}
      </Dialog>

      {/* ── Delete confirmation dialog ─────────────────────────────────────── */}
      <Dialog
        open={deleteProductState !== null}
        onOpenChange={o => { if (!o) setDeleteProductState(null) }}
        title={t('products.delete.title')}
        description={t('products.delete.desc', { name: deleteProductState?.name ?? '' })}
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteProductState(null)} disabled={deleteSubmit}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={deleteSubmit} onClick={() => void handleDelete()}>
              {t('common.delete')}
            </Button>
          </>
        }
      />
    </>
  )
}
