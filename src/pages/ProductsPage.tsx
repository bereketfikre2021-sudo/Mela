import { useState } from 'react'
import { ArrowDownUp, Pencil, Plus, Trash2, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select } from '../design-system/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useAuth } from '../modules/auth/AuthContext'
import { adjustStock } from '../modules/retail/inventoryApi'
import { MANUAL_MOVEMENT_TYPES } from '../modules/retail/inventoryTypes'
import { createProduct, deleteProduct, updateProduct } from '../modules/retail/api'
import { ProductForm } from '../modules/retail/ProductForm'
import { useProducts } from '../modules/retail/useProducts'
import type { Product, ProductInput } from '../modules/retail/types'
import type { MovementType } from '../modules/retail/inventoryTypes'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { Breadcrumb } from '../components/Breadcrumb'

type DialogMode = 'add' | 'edit' | 'delete' | 'adjust' | null

/** Format a numeric price as ETB without a library. */
function fmtPrice(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtQty(n: number) {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)
}

/** Retail products CRUD page — Phase 2.2. */
export function ProductsPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const isServiceBased = getBusinessConfig(profile?.type ?? 'retail').isServiceBased
  const { products, status, errorMessage, reload } = useProducts()
  const { notify } = useNotification()
  const { canAddProduct } = useSubscription()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Adjustment state
  const [adjType,     setAdjType]     = useState<MovementType>('purchase')
  const [adjQty,      setAdjQty]      = useState('')
  const [adjReason,   setAdjReason]   = useState('')
  const [adjError,    setAdjError]    = useState('')
  const [adjPreview,  setAdjPreview]  = useState<number | null>(null)

  function openAdd() { setSelected(null); setDialogMode('add') }
  function openEdit(p: Product) { setSelected(p); setDialogMode('edit') }
  function openDelete(p: Product) { setSelected(p); setDialogMode('delete') }
  function openAdjust(p: Product) {
    setSelected(p)
    setAdjType('purchase')
    setAdjQty('')
    setAdjReason('')
    setAdjError('')
    setAdjPreview(null)
    setDialogMode('adjust')
  }
  function closeDialog() { setDialogMode(null); setSelected(null) }

  async function handleAdd(input: ProductInput) {
    if (!user) return
    setSubmitting(true)
    const { error } = await createProduct(input, user.id)
    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('products.notifications.added') })
    closeDialog()
    await reload()
  }

  async function handleEdit(input: ProductInput) {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await updateProduct(selected.id, input, user.id)
    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('products.notifications.updated') })
    closeDialog()
    await reload()
  }

  async function handleDelete() {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await deleteProduct(selected.id, user.id)
    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('products.notifications.deleted') })
    closeDialog()
    await reload()
  }

  function handleAdjQtyChange(val: string) {
    setAdjQty(val)
    setAdjError('')
    if (!selected) return
    const n = parseFloat(val)
    if (!isNaN(n) && n !== 0) {
      const sign = adjType === 'purchase' || adjType === 'return' ? 1 : -1
      const preview = selected.stock_quantity + sign * Math.abs(n)
      setAdjPreview(preview)
    } else {
      setAdjPreview(null)
    }
  }

  async function handleAdjust() {
    if (!user || !selected) return
    const n = parseFloat(adjQty)
    if (isNaN(n) || n <= 0) { setAdjError(t('inventory.adjust.invalidQty')); return }
    const sign = adjType === 'purchase' || adjType === 'return' ? 1 : -1
    const change = sign * Math.abs(n)
    if (selected.stock_quantity + change < 0) {
      setAdjError(t('inventory.adjust.negativeStock', { available: fmtQty(selected.stock_quantity) }))
      return
    }
    setSubmitting(true)
    const { error } = await adjustStock({
      owner_id: user.id,
      product_id: selected.id,
      movement_type: adjType,
      quantity_change: change,
      reason: adjReason.trim() || null,
    })
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('inventory.adjust.success') })
    closeDialog()
    await reload()
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="space-y-px rounded-lg border border-border overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
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
            <Button variant="secondary" onClick={() => void reload()}>
              {t('products.retry')}
            </Button>
          }
        />
      </div>
    )
  }

  // ── Header (shared by empty + list) ───────────────────────────────────────
  const header = (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <Breadcrumb items={[{ label: isServiceBased ? t('products.titleServices') : t('products.title') }]} />
        <h1 className="heading text-2xl md:text-3xl">
          {isServiceBased ? t('products.titleServices') : t('products.title')}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {products.length === 0
            ? t('products.subtitle')
            : isServiceBased
              ? t('products.countService', { count: products.length })
              : t('products.count', { count: products.length })}
        </p>
      </div>
      <Button
        size="sm"
        leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        onClick={openAdd}
        disabled={!canAddProduct()}
        title={!canAddProduct() ? t('subscription.productLimitReached') : undefined}
      >
        {isServiceBased ? t('products.addService') : t('products.addProduct')}
      </Button>
    </div>
  )

  // ── Empty ──────────────────────────────────────────────────────────────────
  const content = products.length === 0 ? (
    <EmptyState
      icon={Package}
      title={isServiceBased ? t('products.emptyService.title') : t('products.empty.title')}
      description={isServiceBased ? t('products.emptyService.desc') : t('products.empty.desc')}
      action={
        <Button
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={openAdd}
          disabled={!canAddProduct()}
          title={!canAddProduct() ? t('subscription.productLimitReached') : undefined}
        >
          {isServiceBased ? t('products.addService') : t('products.addProduct')}
        </Button>
      }
    />
  ) : (
    // ── List ────────────────────────────────────────────────────────────────
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isServiceBased ? t('products.col.serviceName') : t('products.col.name')}</TableHead>
            <TableHead className="text-right">
              {isServiceBased ? t('products.col.servicePrice') : t('products.col.price')}
            </TableHead>
            {!isServiceBased && <TableHead className="text-right">{t('products.col.stock')}</TableHead>}
            {!isServiceBased && <TableHead className="hidden md:table-cell">{t('products.col.unit')}</TableHead>}
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-right text-figures">{fmtPrice(p.selling_price)}</TableCell>
              {!isServiceBased && <TableCell className="text-right text-figures">{fmtQty(p.stock_quantity)}</TableCell>}
              {!isServiceBased && <TableCell className="hidden text-secondary md:table-cell">{p.unit}</TableCell>}
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {/* Stock adjust — product businesses only */}
                  {!isServiceBased && (
                  <button
                    type="button"
                    onClick={() => openAdjust(p)}
                    aria-label={t('inventory.adjust.ariaLabel', { name: p.name })}
                    className="rounded p-1.5 text-secondary hover:bg-primary-soft hover:text-primary"
                  >
                    <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    aria-label={t('products.actions.edit', { name: p.name })}
                    className="rounded p-1.5 text-secondary hover:bg-background hover:text-text"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDelete(p)}
                    aria-label={t('products.actions.delete', { name: p.name })}
                    className="rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <>
      <div className="py-6 md:py-10">
        {header}
        {content}
      </div>

      {/* ── Add dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'add'}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={isServiceBased ? t('products.form.titleAddService') : t('products.form.titleAdd')}
        closeLabel={t('common.close')}
      >
        <ProductForm
          mode="add"
          isServiceBased={isServiceBased}
          onSubmit={handleAdd}
          onCancel={closeDialog}
          submitting={submitting}
        />
      </Dialog>

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'edit' && selected !== null}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={isServiceBased ? t('products.form.titleEditService') : t('products.form.titleEdit')}
        closeLabel={t('common.close')}
      >
        {selected && (
          <ProductForm
            mode="edit"
            initial={selected}
            isServiceBased={isServiceBased}
            onSubmit={handleEdit}
            onCancel={closeDialog}
            submitting={submitting}
          />
        )}
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'delete' && selected !== null}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={t('products.delete.title')}
        description={t('products.delete.desc', { name: selected?.name ?? '' })}
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" loading={submitting} onClick={() => void handleDelete()}>
              {t('common.delete')}
            </Button>
          </>
        }
      />

      {/* ── Stock adjustment dialog ──────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'adjust' && selected !== null}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={t('inventory.adjust.title')}
        closeLabel={t('common.cancel')}
      >
        {selected && (
          <div className="flex flex-col gap-4">
            {/* Current stock info */}
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <p className="text-secondary">{t('inventory.adjust.currentStock')}</p>
              <p className="mt-0.5 text-xl font-semibold text-figures text-text">
                {fmtQty(selected.stock_quantity)} {selected.unit}
              </p>
              <p className="mt-0.5 font-medium text-text">{selected.name}</p>
            </div>

            {/* Movement type */}
            <Select
              label={t('inventory.adjust.type')}
              options={MANUAL_MOVEMENT_TYPES.map(mt => ({
                value: mt,
                label: t(`inventory.movementType.${mt}`),
              }))}
              value={adjType}
              onChange={e => {
                setAdjType(e.target.value as MovementType)
                setAdjPreview(null)
                setAdjError('')
              }}
            />

            {/* Quantity */}
            <Input
              label={t('inventory.adjust.quantity')}
              helperText={t('inventory.adjust.quantityHelper')}
              inputMode="decimal"
              value={adjQty}
              onChange={e => handleAdjQtyChange(e.target.value)}
              error={adjError}
            />

            {/* Preview */}
            {adjPreview !== null && (
              <div className={`rounded-lg border px-3 py-2 text-sm ${adjPreview < 0 ? 'border-danger-soft bg-danger-soft text-danger' : 'border-primary-soft bg-primary-soft text-primary'}`}>
                {t('inventory.adjust.preview')}{' '}
                <span className="font-semibold text-figures">{fmtQty(adjPreview)} {selected.unit}</span>
              </div>
            )}

            {/* Reason */}
            <Input
              label={t('inventory.adjust.reason')}
              helperText={t('inventory.adjust.reasonHelper')}
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
              maxLength={500}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={closeDialog} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button loading={submitting} onClick={() => void handleAdjust()}>
                {t('inventory.adjust.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
