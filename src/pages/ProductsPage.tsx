import { useState } from 'react'
import { Pencil, Plus, Trash2, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useAuth } from '../modules/auth/AuthContext'
import { createProduct, deleteProduct, updateProduct } from '../modules/retail/api'
import { ProductForm } from '../modules/retail/ProductForm'
import { useProducts } from '../modules/retail/useProducts'
import type { Product, ProductInput } from '../modules/retail/types'

type DialogMode = 'add' | 'edit' | 'delete' | null

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
  const { user } = useAuth()
  const { products, status, errorMessage, reload } = useProducts()
  const { notify } = useNotification()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected, setSelected] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function openAdd() { setSelected(null); setDialogMode('add') }
  function openEdit(p: Product) { setSelected(p); setDialogMode('edit') }
  function openDelete(p: Product) { setSelected(p); setDialogMode('delete') }
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
        <h1 className="heading text-2xl md:text-3xl">{t('products.title')}</h1>
        <p className="mt-1 text-sm text-secondary">
          {products.length === 0
            ? t('products.subtitle')
            : t('products.count', { count: products.length })}
        </p>
      </div>
      <Button
        size="sm"
        leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        onClick={openAdd}
      >
        {t('products.addProduct')}
      </Button>
    </div>
  )

  // ── Empty ──────────────────────────────────────────────────────────────────
  const content = products.length === 0 ? (
    <EmptyState
      icon={Package}
      title={t('products.empty.title')}
      description={t('products.empty.desc')}
      action={
        <Button
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={openAdd}
        >
          {t('products.addProduct')}
        </Button>
      }
    />
  ) : (
    // ── List ────────────────────────────────────────────────────────────────
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('products.col.name')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('products.col.sku')}</TableHead>
            <TableHead className="text-right">{t('products.col.price')}</TableHead>
            <TableHead className="text-right">{t('products.col.stock')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('products.col.unit')}</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(p => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="hidden text-secondary sm:table-cell">
                {p.sku ?? '—'}
              </TableCell>
              <TableCell className="text-right text-figures">{fmtPrice(p.selling_price)}</TableCell>
              <TableCell className="text-right text-figures">{fmtQty(p.stock_quantity)}</TableCell>
              <TableCell className="hidden text-secondary md:table-cell">{p.unit}</TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
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
        title={t('products.form.titleAdd')}
        closeLabel={t('common.close')}
      >
        <ProductForm
          mode="add"
          onSubmit={handleAdd}
          onCancel={closeDialog}
          submitting={submitting}
        />
      </Dialog>

      {/* ── Edit dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={dialogMode === 'edit' && selected !== null}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={t('products.form.titleEdit')}
        closeLabel={t('common.close')}
      >
        {selected && (
          <ProductForm
            mode="edit"
            initial={selected}
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
    </>
  )
}
