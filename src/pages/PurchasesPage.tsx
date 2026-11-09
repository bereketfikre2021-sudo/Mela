import { useState } from 'react'
import { Plus, ShoppingBag, X } from 'lucide-react'
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
import { getPurchase, receivePurchase } from '../modules/purchases/api'
import { enqueuePurchase } from '../lib/offlineQueue'
import { useSyncContext } from '../context/SyncContext'
import { usePurchases } from '../modules/purchases/usePurchases'
import { useProducts } from '../modules/retail/useProducts'
import { useSuppliers } from '../modules/suppliers/useSuppliers'
import type { PurchaseLineInput, PurchaseWithItems } from '../modules/purchases/types'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

/** Purchases page — Phase 6.3. */
export function PurchasesPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const { isOnline, refreshCount } = useSyncContext()
  const { purchases, status, errorMessage, reload } = usePurchases()
  const { products } = useProducts()
  const { suppliers } = useSuppliers()
  const { notify } = useNotification()
  const { canAddPurchaseThisMonth } = useSubscription()

  // ── Create dialog state ────────────────────────────────────────────────────
  const [createOpen,  setCreateOpen]  = useState(false)
  const [supplierId,  setSupplierId]  = useState('')
  const [purchDate,   setPurchDate]   = useState(todayISO())
  const [notes,       setNotes]       = useState('')
  const [lines,       setLines]       = useState<PurchaseLineInput[]>([
    { product_id: '', quantity: '', unit_cost: '' },
  ])
  const [submitting,  setSubmitting]  = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())

  // ── Detail dialog state ────────────────────────────────────────────────────
  const [detailOpen,   setDetailOpen]   = useState(false)
  const [detailData,   setDetailData]   = useState<PurchaseWithItems | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Form helpers ───────────────────────────────────────────────────────────
  function addLine() {
    setLines(prev => [...prev, { product_id: '', quantity: '', unit_cost: '' }])
  }

  function removeLine(i: number) {
    setLines(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, field: keyof PurchaseLineInput, value: string) {
    setLines(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      // Auto-fill unit cost from product's current cost_price when product changes
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === value)
        if (prod?.cost_price != null) {
          next[i].unit_cost = String(prod.cost_price)
        }
      }
      return next
    })
  }

  function lineTotal(line: PurchaseLineInput): number {
    const q = parseFloat(line.quantity)
    const c = parseFloat(line.unit_cost)
    if (isNaN(q) || isNaN(c)) return 0
    return Math.round(q * c * 100) / 100
  }

  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0)

  function resetForm() {
    setSupplierId('')
    setPurchDate(todayISO())
    setNotes('')
    setLines([{ product_id: '', quantity: '', unit_cost: '' }])
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!purchDate) return t('validation.required')
    for (const l of lines) {
      if (!l.product_id) return t('purchases.form.errors.selectProduct')
      const q = parseFloat(l.quantity)
      if (isNaN(q) || q <= 0) return t('purchases.form.errors.invalidQty')
      const c = parseFloat(l.unit_cost)
      if (isNaN(c) || c < 0)  return t('purchases.form.errors.invalidCost')
    }
    // No duplicate products
    const ids = lines.map(l => l.product_id)
    if (new Set(ids).size !== ids.length) return t('purchases.form.errors.duplicateProduct')
    return null
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!user) return
    const err = validate()
    if (err) { notify({ tone: 'danger', title: err }); return }

    const payload = {
      owner_id:        user.id,
      supplier_id:     supplierId || null,
      purchase_date:   purchDate,
      notes:           notes.trim() || null,
      idempotency_key: idempotencyKey,
      items: lines.map(l => ({
        product_id: l.product_id,
        quantity:   parseFloat(l.quantity),
        unit_cost:  parseFloat(l.unit_cost),
      })),
    }

    setSubmitting(true)

    if (!isOnline) {
      await enqueuePurchase(payload)
      await refreshCount()
      setSubmitting(false)
      notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
      setCreateOpen(false)
      resetForm()
      return
    }

    const { error } = await receivePurchase(payload)
    setSubmitting(false)

    if (error) {
      if (!navigator.onLine || error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
        await enqueuePurchase(payload)
        await refreshCount()
        notify({ tone: 'warning', title: t('sync.savedOffline'), description: t('sync.savedOfflineDesc') })
        setCreateOpen(false)
        resetForm()
        return
      }
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('purchases.notifications.received') })
    setCreateOpen(false)
    resetForm()
    await reload()
  }

  // ── View detail ────────────────────────────────────────────────────────────
  async function openDetail(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    const { data, error } = await getPurchase(id)
    setDetailLoading(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    setDetailData(data)
  }

  const productOptions = [
    { value: '', label: t('purchases.form.selectProduct') },
    ...products.map(p => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''}` })),
  ]

  const supplierOptions = [
    { value: '', label: t('purchases.form.noSupplier') },
    ...suppliers.map(s => ({ value: s.id, label: s.name })),
  ]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <div className="space-y-px rounded-lg border border-border overflow-hidden">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-none" />)}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState icon={ShoppingBag} title={t('notification.error.title')} description={errorMessage}
          action={<Button variant="secondary" onClick={() => void reload()}>{t('products.retry')}</Button>} />
      </div>
    )
  }

  return (
    <>
      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="py-6 md:py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="heading text-2xl md:text-3xl">{t('purchases.title')}</h1>
            <p className="mt-1 text-sm text-secondary">
              {purchases.length === 0
                ? t('purchases.subtitle')
                : t('purchases.count', { count: purchases.length })}
            </p>
          </div>
          <Button size="sm" leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            onClick={() => { resetForm(); setCreateOpen(true) }}
            disabled={!canAddPurchaseThisMonth()}
            title={!canAddPurchaseThisMonth() ? t('subscription.purchaseLimitReached') : undefined}>
            {t('purchases.receive')}
          </Button>
        </div>

        {purchases.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={t('purchases.empty.title')} description={t('purchases.empty.desc')}
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
                onClick={() => { resetForm(); setCreateOpen(true) }}
                disabled={!canAddPurchaseThisMonth()}
                title={!canAddPurchaseThisMonth() ? t('subscription.purchaseLimitReached') : undefined}>
                {t('purchases.receive')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('purchases.col.date')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('purchases.col.supplier')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('purchases.col.notes')}</TableHead>
                  <TableHead className="text-right">{t('purchases.col.total')}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.purchase_date)}</TableCell>
                    <TableCell className="hidden text-secondary sm:table-cell">{p.supplier_name}</TableCell>
                    <TableCell className="hidden max-w-xs truncate text-secondary md:table-cell">
                      {p.notes ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-figures">{fmtETB(p.total_cost)}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => void openDetail(p.id)}
                        className="text-xs font-medium text-primary hover:underline">
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

      {/* ── Create purchase dialog ────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o && !submitting) setCreateOpen(false) }}
        title={t('purchases.form.title')} closeLabel={t('common.cancel')}>
        <div className="flex flex-col gap-4">
          {/* Supplier + date */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label={t('purchases.form.supplier')} options={supplierOptions}
              value={supplierId} onChange={e => setSupplierId(e.target.value)} />
            <Input label={t('purchases.form.date')} type="date"
              value={purchDate} onChange={e => setPurchDate(e.target.value)} />
          </div>

          {/* Product lines */}
          <div>
            <p className="mb-2 text-sm font-medium text-text">{t('purchases.form.items')}</p>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_32px] items-end gap-2">
                  <Select
                    options={productOptions}
                    value={line.product_id}
                    onChange={e => updateLine(i, 'product_id', e.target.value)}
                    aria-label={t('purchases.form.product')}
                  />
                  <Input
                    placeholder={t('purchases.form.qtyPlaceholder')}
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', e.target.value)}
                    aria-label={t('purchases.form.qty')}
                  />
                  <Input
                    placeholder={t('purchases.form.costPlaceholder')}
                    inputMode="decimal"
                    value={line.unit_cost}
                    onChange={e => updateLine(i, 'unit_cost', e.target.value)}
                    aria-label={t('purchases.form.unitCost')}
                  />
                  <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
                    className="mb-0.5 rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                    aria-label={t('common.delete')}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t('purchases.form.addLine')}
            </button>
          </div>

          {/* Column header hint */}
          <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 text-xs text-secondary">
            <span>{t('purchases.form.product')}</span>
            <span>{t('purchases.form.qty')}</span>
            <span>{t('purchases.form.unitCost')}</span>
            <span />
          </div>

          {/* Notes */}
          <Input label={t('purchases.form.notes')} value={notes}
            onChange={e => setNotes(e.target.value)} maxLength={1000} />

          {/* Grand total */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
            <span className="text-sm font-semibold text-secondary">{t('purchases.form.total')}</span>
            <span className="text-figures font-semibold text-text">{fmtETB(grandTotal)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button loading={submitting} onClick={() => void handleSubmit()}>
              {t('purchases.form.submit')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Detail dialog ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={o => { if (!o) { setDetailOpen(false); setDetailData(null) } }}
        title={detailData ? `${t('purchases.detail.title')} · ${fmtDate(detailData.purchase_date)}` : t('purchases.detail.title')}
        closeLabel={t('common.close')}>
        {detailLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : detailData ? (
          <div className="flex flex-col gap-4">
            {/* Meta */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-secondary">{t('purchases.col.supplier')}</dt>
                <dd className="font-medium text-text">{detailData.supplier_name}</dd>
              </div>
              <div>
                <dt className="text-secondary">{t('purchases.col.date')}</dt>
                <dd className="font-medium text-text">{fmtDate(detailData.purchase_date)}</dd>
              </div>
              {detailData.notes && (
                <div className="col-span-2">
                  <dt className="text-secondary">{t('purchases.col.notes')}</dt>
                  <dd className="font-medium text-text">{detailData.notes}</dd>
                </div>
              )}
            </dl>

            {/* Items table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-secondary">{t('purchases.detail.product')}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('purchases.detail.qty')}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('purchases.detail.unitCost')}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide text-secondary">{t('purchases.detail.lineTotal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {detailData.purchase_items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5">{item.product_name}</td>
                      <td className="px-3 py-2.5 text-right text-figures">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-figures">{fmtETB(item.unit_cost)}</td>
                      <td className="px-3 py-2.5 text-right text-figures">{fmtETB(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-background font-semibold">
                    <td colSpan={3} className="px-3 py-2.5 text-right text-xs uppercase tracking-wide text-secondary">
                      {t('purchases.detail.total')}
                    </td>
                    <td className="px-3 py-2.5 text-right text-figures">{fmtETB(detailData.total_cost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
