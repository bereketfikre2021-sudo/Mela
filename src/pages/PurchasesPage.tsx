import { useState } from 'react'
import { CheckCircle2, CreditCard, Plus, ShoppingBag, X } from 'lucide-react'
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
import {
  getPurchase,
  getSupplierPayments,
  receivePurchase,
  recordSupplierPayment,
} from '../modules/purchases/api'
import { enqueuePurchase } from '../lib/offlineQueue'
import { useSyncContext } from '../context/SyncContext'
import { usePurchases } from '../modules/purchases/usePurchases'
import { useProducts } from '../modules/retail/useProducts'
import { useSuppliers } from '../modules/suppliers/useSuppliers'
import {
  purchasePaymentStatus,
  type PurchaseLineInput,
  type PurchaseWithItems,
  type SupplierPayment,
} from '../modules/purchases/types'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import type { PaymentMethod } from '../modules/retail/types'

function fmtETB(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

/** Purchases page — Phase 6.3 + F2. */
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
  const [detailOpen,    setDetailOpen]    = useState(false)
  const [detailData,    setDetailData]    = useState<PurchaseWithItems | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // ── Payment history state ──────────────────────────────────────────────────
  const [payHistory,        setPayHistory]        = useState<SupplierPayment[]>([])
  const [payHistoryLoading, setPayHistoryLoading] = useState(false)

  // ── Record payment dialog state ────────────────────────────────────────────
  const [payOpen,       setPayOpen]       = useState(false)
  const [payAmount,     setPayAmount]     = useState('')
  const [payMethod,     setPayMethod]     = useState<PaymentMethod>('cash')
  const [payDate,       setPayDate]       = useState(todayISO())
  const [payNote,       setPayNote]       = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

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
      if (field === 'product_id' && value) {
        const prod = products.find(p => p.id === value)
        if (prod?.cost_price != null) next[i].unit_cost = String(prod.cost_price)
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

  function validate(): string | null {
    if (!purchDate) return t('validation.required')
    for (const l of lines) {
      if (!l.product_id) return t('purchases.form.errors.selectProduct')
      const q = parseFloat(l.quantity)
      if (isNaN(q) || q <= 0) return t('purchases.form.errors.invalidQty')
      const c = parseFloat(l.unit_cost)
      if (isNaN(c) || c < 0)  return t('purchases.form.errors.invalidCost')
    }
    const ids = lines.map(l => l.product_id)
    if (new Set(ids).size !== ids.length) return t('purchases.form.errors.duplicateProduct')
    return null
  }

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

  // ── View detail + load payment history ────────────────────────────────────
  async function openDetail(id: string) {
    setDetailOpen(true)
    setDetailLoading(true)
    setPayHistory([])
    const [detailRes, histRes] = await Promise.all([
      getPurchase(id),
      getSupplierPayments(id),
    ])
    setDetailLoading(false)
    if (detailRes.error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: detailRes.error.message })
      return
    }
    setDetailData(detailRes.data)
    setPayHistory(histRes.data ?? [])
  }

  async function refreshDetailPayments() {
    if (!detailData) return
    setPayHistoryLoading(true)
    const [detailRes, histRes] = await Promise.all([
      getPurchase(detailData.id),
      getSupplierPayments(detailData.id),
    ])
    setPayHistoryLoading(false)
    if (detailRes.data) setDetailData(detailRes.data)
    setPayHistory(histRes.data ?? [])
  }

  // ── Record payment ────────────────────────────────────────────────────────
  function openPayDialog() {
    setPayAmount('')
    setPayMethod('cash')
    setPayDate(todayISO())
    setPayNote('')
    setPayOpen(true)
  }

  async function handleRecordPayment() {
    if (!user || !detailData) return
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      notify({ tone: 'danger', title: t('expenses.form.errors.invalidAmount') })
      return
    }
    const balance = detailData.total_cost - (detailData.amount_paid ?? 0)
    if (amt > balance + 0.001) {
      notify({ tone: 'danger', title: t('purchases.payment.overpay') })
      return
    }

    setPaySubmitting(true)
    const { error } = await recordSupplierPayment({
      owner_id:        user.id,
      purchase_id:     detailData.id,
      amount:          amt,
      payment_method:  payMethod,
      payment_date:    payDate,
      note:            payNote.trim() || null,
      idempotency_key: crypto.randomUUID(),
    })
    setPaySubmitting(false)

    if (error) {
      notify({ tone: 'danger', title: t('notification.error.title'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('purchases.payment.success') })
    setPayOpen(false)
    // refresh the detail + history + the main list so payment status badge updates
    await Promise.all([refreshDetailPayments(), reload()])
  }

  const productOptions = [
    { value: '', label: t('purchases.form.selectProduct') },
    ...products.map(p => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ''}` })),
  ]

  const supplierOptions = [
    { value: '', label: t('purchases.form.noSupplier') },
    ...suppliers.map(s => ({ value: s.id, label: s.name })),
  ]

  const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'cash',          label: t('pos.payment.cash') },
    { value: 'telebirr',      label: t('pos.payment.telebirr') },
    { value: 'cbe_birr',      label: t('pos.payment.cbe_birr') },
    { value: 'bank_transfer', label: t('pos.payment.bank_transfer') },
  ]

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
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map(p => {
                  const pStatus = purchasePaymentStatus(p.total_cost, p.amount_paid ?? 0)
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{fmtDate(p.purchase_date)}</TableCell>
                      <TableCell className="hidden text-secondary sm:table-cell">{p.supplier_name}</TableCell>
                      <TableCell className="hidden max-w-xs truncate text-secondary md:table-cell">
                        {p.notes ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-figures">{fmtETB(p.total_cost)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={pStatus === 'paid' ? 'success' : pStatus === 'partial' ? 'warning' : 'neutral'}
                          dot>
                          {t(`purchases.paymentStatus.${pStatus}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => void openDetail(p.id)}
                          className="text-xs font-medium text-primary hover:underline">
                          {t('sales.view')}
                        </button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Create purchase dialog ────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={o => { if (!o && !submitting) setCreateOpen(false) }}
        title={t('purchases.form.title')} closeLabel={t('common.cancel')}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label={t('purchases.form.supplier')} options={supplierOptions}
              value={supplierId} onChange={e => setSupplierId(e.target.value)} />
            <Input label={t('purchases.form.date')} type="date"
              value={purchDate} onChange={e => setPurchDate(e.target.value)} />
          </div>
          <div className="-mt-2">
            <button type="button" onClick={() => window.open('/app/suppliers', '_blank', 'noopener')}
              className="text-xs font-medium text-primary hover:underline">
              {t('stock.manageSuppliers')}
            </button>
          </div>

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

          <div className="grid grid-cols-[1fr_80px_80px_32px] gap-2 text-xs text-secondary">
            <span>{t('purchases.form.product')}</span>
            <span>{t('purchases.form.qty')}</span>
            <span>{t('purchases.form.unitCost')}</span>
            <span />
          </div>

          <Input label={t('purchases.form.notes')} value={notes}
            onChange={e => setNotes(e.target.value)} maxLength={1000} />

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
      <Dialog open={detailOpen} onOpenChange={o => { if (!o) { setDetailOpen(false); setDetailData(null); setPayHistory([]) } }}
        title={detailData ? `${t('purchases.detail.title')} · ${fmtDate(detailData.purchase_date)}` : t('purchases.detail.title')}
        closeLabel={t('common.close')}>
        {detailLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
          </div>
        ) : detailData ? (
          <div className="flex flex-col gap-5">
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

            {/* Payment status summary */}
            {(() => {
              const amtPaid = detailData.amount_paid ?? 0
              const balance = detailData.total_cost - amtPaid
              const pStatus = purchasePaymentStatus(detailData.total_cost, amtPaid)
              return (
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <StatusBadge
                        tone={pStatus === 'paid' ? 'success' : pStatus === 'partial' ? 'warning' : 'neutral'}
                        dot>
                        {t(`purchases.paymentStatus.${pStatus}`)}
                      </StatusBadge>
                      {pStatus !== 'paid' && (
                        <p className="mt-1 text-xs text-secondary">
                          {t('purchases.payment.balanceDue', { amount: fmtETB(balance) })}
                        </p>
                      )}
                      {pStatus === 'paid' && (
                        <p className="mt-1 text-xs text-success">{t('purchases.payment.paidFull')}</p>
                      )}
                    </div>
                    {pStatus !== 'paid' && (
                      <Button size="sm"
                        leadingIcon={<CreditCard className="h-4 w-4" aria-hidden="true" />}
                        onClick={openPayDialog}>
                        {t('purchases.payment.dialogTitle')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Payment history */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-secondary uppercase tracking-wide">
                {t('purchases.payment.historyTitle')}
              </h3>
              {payHistoryLoading ? (
                <div className="space-y-1">
                  {[1,2].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : payHistory.length === 0 ? (
                <p className="text-sm text-secondary">{t('purchases.payment.noHistory')}</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {payHistory.map(pay => (
                    <div key={pay.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-text">{fmtDate(pay.payment_date)}</p>
                        <p className="text-xs text-secondary">
                          {t(`pos.payment.${pay.payment_method}`)}
                          {pay.note ? ` · ${pay.note}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                        <span className="text-sm font-semibold text-text">{fmtETB(pay.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* ── Record payment dialog ────────────────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={o => { if (!o && !paySubmitting) setPayOpen(false) }}
        title={t('purchases.payment.dialogTitle')} closeLabel={t('common.cancel')}>
        <div className="flex flex-col gap-4">
          {detailData && (() => {
            const balance = detailData.total_cost - (detailData.amount_paid ?? 0)
            return (
              <p className="text-sm text-secondary">
                {t('purchases.payment.balanceDue', { amount: fmtETB(balance) })}
              </p>
            )
          })()}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t('purchases.payment.amount')}
              inputMode="decimal"
              value={payAmount}
              onChange={e => setPayAmount(e.target.value)}
            />
            <Input
              label={t('purchases.payment.date')}
              type="date"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
            />
          </div>

          <Select
            label={t('purchases.payment.method')}
            options={paymentMethodOptions}
            value={payMethod}
            onChange={e => setPayMethod(e.target.value as PaymentMethod)}
          />

          <Input
            label={t('purchases.payment.note')}
            value={payNote}
            onChange={e => setPayNote(e.target.value)}
            maxLength={1000}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={paySubmitting}>
              {t('common.cancel')}
            </Button>
            <Button loading={paySubmitting} onClick={() => void handleRecordPayment()}>
              {t('purchases.payment.submit')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
