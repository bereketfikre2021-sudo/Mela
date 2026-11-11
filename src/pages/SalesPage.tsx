import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Plus, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Select } from '../design-system/Select'
import { Skeleton } from '../design-system/LoadingState'
import { StatusBadge } from '../design-system/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table'
import { useSales } from '../modules/retail/useSales'
import { getSale, getSalePayments, recordSalePayment } from '../modules/retail/salesApi'
import { useNotification } from '../design-system/Notification'
import { useAuth } from '../modules/auth/AuthContext'
import type { PaymentMethod, PaymentStatus, SalePayment, SaleWithItems } from '../modules/retail/types'
import { Breadcrumb } from '../components/Breadcrumb'

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

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

function todayISO() { return new Date().toISOString().slice(0, 10) }

function statusTone(s: PaymentStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (s === 'paid')      return 'success'
  if (s === 'partial')   return 'warning'
  if (s === 'pending')   return 'warning'
  return 'neutral'
}

function startOf(period: Period): Date | null {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week')  { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return null
}

export function SalesPage() {
  const { t }       = useTranslation()
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { notify }  = useNotification()
  const { sales, status, errorMessage, reload } = useSales()
  const [period,    setPeriod]    = useState<Period>('today')
  const [selected,  setSelected]  = useState<SaleWithItems | null>(null)

  // ── Payment history state ──────────────────────────────────────────────────
  const [payHistory,        setPayHistory]        = useState<SalePayment[]>([])
  const [payHistoryLoading, setPayHistoryLoading] = useState(false)

  // ── Record payment dialog state ────────────────────────────────────────────
  const [payOpen,       setPayOpen]       = useState(false)
  const [payAmount,     setPayAmount]     = useState('')
  const [payMethod,     setPayMethod]     = useState<PaymentMethod>('cash')
  const [payDate,       setPayDate]       = useState(todayISO())
  const [payNote,       setPayNote]       = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  const loadPayHistory = useCallback(async (saleId: string) => {
    setPayHistoryLoading(true)
    const { data } = await getSalePayments(saleId)
    setPayHistory(data ?? [])
    setPayHistoryLoading(false)
  }, [])

  async function openDetail(sale: SaleWithItems) {
    setSelected(sale)
    setPayHistory([])
    await loadPayHistory(sale.id)
  }

  async function refreshSelected() {
    if (!selected) return
    setPayHistoryLoading(true)
    await loadPayHistory(selected.id)
    setPayHistoryLoading(false)
  }

  function openPayDialog() {
    setPayAmount('')
    setPayMethod('cash')
    setPayDate(todayISO())
    setPayNote('')
    setPayOpen(true)
  }

  async function handleRecordPayment() {
    if (!user || !selected) return
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      notify({ tone: 'danger', title: t('expenses.form.errors.invalidAmount') })
      return
    }
    const balance = selected.total - (selected.amount_paid ?? 0)
    if (amt > balance + 0.001) {
      notify({ tone: 'danger', title: t('sales.payment.overpay') })
      return
    }
    setPaySubmitting(true)
    const { error } = await recordSalePayment({
      owner_id:        user.id,
      sale_id:         selected.id,
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
    notify({ tone: 'success', title: t('sales.paymentRecorded') })
    setPayOpen(false)
    // Refresh payment history and reload the sale to get the updated status
    const [, freshSaleRes] = await Promise.all([
      refreshSelected(),
      getSale(selected.id),
    ])
    if (freshSaleRes.data) setSelected(freshSaleRes.data)
    void reload()
  }

  const filtered = useMemo(() => {
    const cutoff = startOf(period)
    if (!cutoff) return sales
    return sales.filter(s => new Date(s.sold_at) >= cutoff)
  }, [sales, period])

  const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
    { value: 'cash',          label: t('pos.payment.cash') },
    { value: 'telebirr',      label: t('pos.payment.telebirr') },
    { value: 'cbe_birr',      label: t('pos.payment.cbe_birr') },
    { value: 'bank_transfer', label: t('pos.payment.bank_transfer') },
  ]

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: t('sales.filter.today') },
    { key: 'week',  label: t('sales.filter.week')  },
    { key: 'month', label: t('sales.filter.month') },
    { key: 'all',   label: t('sales.filter.all')   },
  ]

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
          <div>
            <Breadcrumb items={[{ label: t('sales.title') }]} />
            <h1 className="text-2xl font-bold text-text">{t('sales.title')}</h1>
          </div>
          <Button size="sm" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/pos')}>
            {t('nav.newSale')}
          </Button>
        </div>

        {/* Period filter */}
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          {periods.map(p => (
            <button key={p.key} type="button" onClick={() => setPeriod(p.key)}
              className={['flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
                period === p.key ? 'bg-surface text-text shadow-sm' : 'text-secondary hover:text-text'].join(' ')}>
              {p.label}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-sm text-secondary">{t('sales.count', { count: filtered.length })}</p>
        )}

        {filtered.length === 0 ? (
          <EmptyState icon={Receipt} title={t('sales.empty.title')}
            description={period === 'today' ? t('sales.empty.todayDesc') : t('sales.empty.desc')}
            action={<Button size="sm" leadingIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/app/pos')}>{t('nav.newSale')}</Button>}
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
                    <TableCell className="hidden text-secondary sm:table-cell">{fmtDate(s.sold_at)}</TableCell>
                    <TableCell className="text-right">{fmtPrice(s.total)}</TableCell>
                    <TableCell className="hidden text-secondary md:table-cell">{t(`sales.payment.${s.payment_method}`)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone(s.payment_status)} dot>
                        {t(`sales.status.${s.payment_status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <button type="button" onClick={() => void openDetail(s)}
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

      {/* ── Sale detail dialog ───────────────────────────────────────────── */}
      <Dialog open={selected !== null} onOpenChange={open => { if (!open) { setSelected(null); setPayHistory([]) } }}
        title={selected?.sale_number ?? ''} closeLabel={t('common.close')}>
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
              {selected.customer_name && (
                <div>
                  <dt className="text-secondary">{t('sales.detail.customer')}</dt>
                  <dd className="font-medium">{selected.customer_name}</dd>
                </div>
              )}
              {selected.notes && (
                <div className="col-span-2">
                  <dt className="text-secondary">{t('sales.detail.notes')}</dt>
                  <dd className="font-medium">{selected.notes}</dd>
                </div>
              )}
            </dl>

            {/* Items */}
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

            {/* Payment status panel */}
            {selected.payment_status !== 'paid' && selected.payment_status !== 'cancelled' && (() => {
              const amtPaid = selected.amount_paid ?? 0
              const balance = selected.total - amtPaid
              return (
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-secondary space-y-0.5">
                      {amtPaid > 0 && (
                        <p>{t('sales.amountPaid', { amount: fmtPrice(amtPaid) })}</p>
                      )}
                      <p className="font-medium text-text">{t('sales.balanceDue', { amount: fmtPrice(balance) })}</p>
                    </div>
                    <Button size="sm" onClick={openPayDialog}>
                      {t('sales.recordPayment')}
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* Payment history */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-secondary uppercase tracking-wide">
                {t('sales.paymentHistory')}
              </h3>
              {payHistoryLoading ? (
                <div className="space-y-1">
                  {[1,2].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
                </div>
              ) : payHistory.length === 0 ? (
                <p className="text-sm text-secondary">{t('sales.noPayments')}</p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {payHistory.map(pay => (
                    <div key={pay.id} className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-text">{fmtShortDate(pay.payment_date)}</p>
                        <p className="text-xs text-secondary">
                          {t(`pos.payment.${pay.payment_method}`)}
                          {pay.note ? ` · ${pay.note}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                        <span className="text-sm font-semibold text-text">{fmtPrice(pay.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Record payment dialog ────────────────────────────────────────── */}
      <Dialog open={payOpen} onOpenChange={o => { if (!o && !paySubmitting) setPayOpen(false) }}
        title={t('sales.recordPayment')} closeLabel={t('common.cancel')}>
        <div className="flex flex-col gap-4">
          {selected && (() => {
            const balance = selected.total - (selected.amount_paid ?? 0)
            return <p className="text-sm text-secondary">{t('sales.balanceDue', { amount: fmtPrice(balance) })}</p>
          })()}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={t('sales.payment.amount')} inputMode="decimal"
              value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            <Input label={t('sales.payment.date')} type="date"
              value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>

          <Select label={t('sales.payment.method')} options={paymentMethodOptions}
            value={payMethod} onChange={e => setPayMethod(e.target.value as PaymentMethod)} />

          <Input label={t('sales.payment.note')} value={payNote}
            onChange={e => setPayNote(e.target.value)} maxLength={1000} />

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setPayOpen(false)} disabled={paySubmitting}>
              {t('common.cancel')}
            </Button>
            <Button loading={paySubmitting} onClick={() => void handleRecordPayment()}>
              {t('sales.payment.submit')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
