import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Mail, Pencil, Phone, Plus, ShoppingBag, Trash2, Users, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select } from '../design-system/Select'
import { StatusBadge } from '../design-system/StatusBadge'
import { useAuth } from '../modules/auth/AuthContext'
import { CustomerForm } from '../modules/customers/CustomerForm'
import { createCustomer, deleteCustomer, updateCustomer } from '../modules/customers/api'
import { useCustomers } from '../modules/customers/useCustomers'
import type { Customer, CustomerInput } from '../modules/customers/types'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import { getBusinessConfig } from '../modules/auth/businessConfig'
import { getOutstandingBalances, getSalesByCustomer, recordSalePayment } from '../modules/retail/salesApi'
import { Breadcrumb } from '../components/Breadcrumb'
import type { PaymentMethod, SaleWithItems } from '../modules/retail/types'

type DialogMode = 'add' | 'edit' | 'delete' | null

export function CustomersPage() {
  const { t } = useTranslation()
  const { user, profile } = useAuth()
  const isService = getBusinessConfig(profile?.type ?? 'retail').isServiceBased
  const { customers, status, errorMessage, reload } = useCustomers()
  const { notify } = useNotification()
  const { canAddCustomer } = useSubscription()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected,   setSelected]   = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search,     setSearch]     = useState('')

  // Customer history
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
  const [history,         setHistory]         = useState<SaleWithItems[]>([])
  const [historyLoading,  setHistoryLoading]  = useState(false)

  // Per-sale payment history — not expanded inline in this dialog;
  // full history is available via the Sales page.

  // Record-payment dialog state (inside customer history dialog)
  const [payDialogSale, setPayDialogSale] = useState<SaleWithItems | null>(null)
  const [payAmount,     setPayAmount]     = useState('')
  const [payMethod,     setPayMethod]     = useState<PaymentMethod>('cash')
  const [payDate,       setPayDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [payNote,       setPayNote]       = useState('')
  const [paySubmitting, setPaySubmitting] = useState(false)

  async function openHistory(c: Customer) {
    setHistoryCustomer(c)
    setHistoryLoading(true)
    setHistory([])
    const { data } = await getSalesByCustomer(c.id)
    setHistory(data ?? [])
    setHistoryLoading(false)
  }

  // Outstanding = sum of (total - amount_paid) for unpaid/partial sales
  const pendingBalance = history
    .filter(s => s.payment_status === 'pending' || s.payment_status === 'partial')
    .reduce((sum, s) => sum + (s.total - (s.amount_paid ?? 0)), 0)

  function openPayDialog(sale: SaleWithItems) {
    setPayDialogSale(sale)
    setPayAmount('')
    setPayMethod('cash')
    setPayDate(new Date().toISOString().slice(0, 10))
    setPayNote('')
  }

  async function handleRecordPayment() {
    if (!user || !payDialogSale || !historyCustomer) return
    const amt = parseFloat(payAmount)
    if (isNaN(amt) || amt <= 0) {
      notify({ tone: 'danger', title: t('expenses.form.errors.invalidAmount') })
      return
    }
    const balance = payDialogSale.total - (payDialogSale.amount_paid ?? 0)
    if (amt > balance + 0.001) {
      notify({ tone: 'danger', title: t('sales.payment.overpay') })
      return
    }
    setPaySubmitting(true)
    const { error } = await recordSalePayment({
      owner_id:        user.id,
      sale_id:         payDialogSale.id,
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
    setPayDialogSale(null)
    await Promise.all([openHistory(historyCustomer), loadOutstanding()])
  }

  // ── Outstanding receivables ("who owes me money") ───────────────────────
  // One query fetches every customer's pending-sales total; no schema change.
  const [outstanding, setOutstanding] = useState<Map<string, number>>(new Map())
  const [showOnlyOwing, setShowOnlyOwing] = useState(false)

  const loadOutstanding = useCallback(async () => {
    const { data } = await getOutstandingBalances()
    const map = new Map<string, number>()
    for (const row of data ?? []) map.set(row.customerId, row.amount)
    setOutstanding(map)
  }, [])

  useEffect(() => { void loadOutstanding() }, [loadOutstanding])

  const totalOutstanding = useMemo(
    () => [...outstanding.values()].reduce((sum, n) => sum + n, 0),
    [outstanding]
  )
  const owingCount = useMemo(
    () => [...outstanding.values()].filter(n => n > 0).length,
    [outstanding]
  )
  // If everyone settles their debt, drop the "only owing" filter so the list
  // doesn't appear empty.
  useEffect(() => { if (owingCount === 0) setShowOnlyOwing(false) }, [owingCount])

  function openAdd()              { setSelected(null);  setDialogMode('add') }
  function openEdit(c: Customer)  { setSelected(c);     setDialogMode('edit') }
  function openDel(c: Customer)   { setSelected(c);     setDialogMode('delete') }
  function closeDialog()          { setDialogMode(null); setSelected(null) }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = customers
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
      )
    }
    if (showOnlyOwing) list = list.filter(c => (outstanding.get(c.id) ?? 0) > 0)
    return list
  }, [customers, search, showOnlyOwing, outstanding])

  async function handleAdd(input: CustomerInput) {
    if (!user) return
    setSubmitting(true)
    const { error } = await createCustomer(input, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('customers.notifications.added') })
    closeDialog(); await reload()
  }

  async function handleEdit(input: CustomerInput) {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await updateCustomer(selected.id, input, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('customers.notifications.updated') })
    closeDialog(); await reload()
  }

  async function handleDelete() {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await deleteCustomer(selected.id, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('customers.notifications.deleted') })
    closeDialog(); await reload()
  }

  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="space-y-px rounded-lg border border-border overflow-hidden">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-none" />)}
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="py-6 md:py-10">
        <EmptyState icon={Users} title={t('notification.error.title')} description={errorMessage}
          action={<Button variant="secondary" onClick={() => void reload()}>{t('products.retry')}</Button>} />
      </div>
    )
  }

  return (
    <>
      <div className="py-6 md:py-10">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Breadcrumb items={[{ label: isService ? t('customers.titleClients') : t('customers.title') }]} />
            <h1 className="heading text-2xl md:text-3xl">
              {isService ? t('customers.titleClients') : t('customers.title')}
            </h1>
            <p className="mt-1 text-sm text-secondary">
              {customers.length === 0
                ? t('customers.subtitle')
                : isService
                  ? t('customers.countClient', { count: customers.length })
                  : t('customers.count', { count: customers.length })}
            </p>
          </div>
          <Button size="sm" leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}
            disabled={!canAddCustomer()}
            title={!canAddCustomer() ? t('subscription.customerLimitReached') : undefined}>
            {isService ? t('customers.addClient') : t('customers.add')}
          </Button>
        </div>

        {/* Search */}
        {customers.length > 0 && (
          <div className="mb-4">
            <Input
              placeholder={t('contacts.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label={t('contacts.searchPlaceholder')}
            />
          </div>
        )}

        {/* Outstanding receivables — who owes me money */}
        {totalOutstanding > 0 && (
          <div className="mb-4 rounded-xl border border-warning-soft bg-warning-soft px-4 py-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-text">
                {t('customers.outstanding.totalLabel')}: ETB {totalOutstanding.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-secondary">
              {t('customers.outstanding.owesYou', { count: owingCount })}
            </p>
          </div>
        )}

        {/* Filter: show only customers who owe */}
        {owingCount > 0 && (
          <label className="mb-4 flex items-center gap-2 text-sm text-secondary select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyOwing}
              onChange={e => setShowOnlyOwing(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            {t('customers.outstanding.filterOwed')}
          </label>
        )}

        {/* Empty */}
        {customers.length === 0 ? (
          <EmptyState icon={Users}
            title={isService ? t('customers.emptyClient.title') : t('customers.empty.title')}
            description={isService ? t('customers.emptyClient.desc') : t('customers.empty.desc')}
            action={<Button leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}
              disabled={!canAddCustomer()}
              title={!canAddCustomer() ? t('subscription.customerLimitReached') : undefined}>
              {isService ? t('customers.addClient') : t('customers.add')}
            </Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={t('contacts.noResults')} description={t('contacts.noResultsDesc')} />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {filtered.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text truncate">{c.name}</p>
                  {(outstanding.get(c.id) ?? 0) > 0 && (
                    <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                      {t('customers.pendingBalance', { amount: `ETB ${(outstanding.get(c.id) ?? 0).toLocaleString('en-ET', { minimumFractionDigits: 2 })}` })}
                    </span>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-secondary">
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden="true" />{c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" aria-hidden="true" />{c.email}
                      </span>
                    )}
                  </div>
                  {c.address && <p className="mt-0.5 truncate text-xs text-secondary">{c.address}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => void openHistory(c)}
                    aria-label={t('customers.viewHistory', { name: c.name })}
                    className="rounded p-1.5 text-secondary hover:bg-background hover:text-primary">
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => openEdit(c)}
                    aria-label={t('contacts.actions.edit', { name: c.name })}
                    className="rounded p-1.5 text-secondary hover:bg-background hover:text-text">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => openDel(c)}
                    aria-label={t('contacts.actions.delete', { name: c.name })}
                    className="rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogMode === 'add'} onOpenChange={o => { if (!o) closeDialog() }}
        title={isService ? t('customers.form.titleAddClient') : t('customers.form.titleAdd')} closeLabel={t('common.close')}>
        <CustomerForm mode="add" onSubmit={handleAdd} onCancel={closeDialog} submitting={submitting} />
      </Dialog>

      <Dialog open={dialogMode === 'edit' && selected !== null} onOpenChange={o => { if (!o) closeDialog() }}
        title={isService ? t('customers.form.titleEditClient') : t('customers.form.titleEdit')} closeLabel={t('common.close')}>
        {selected && <CustomerForm mode="edit" initial={selected} onSubmit={handleEdit} onCancel={closeDialog} submitting={submitting} />}
      </Dialog>

      <Dialog open={dialogMode === 'delete' && selected !== null} onOpenChange={o => { if (!o) closeDialog() }}
        title={t('contacts.delete.title')}
        description={t('contacts.delete.desc', { name: selected?.name ?? '' })}
        closeLabel={t('common.cancel')}
        footer={
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={submitting}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={submitting} onClick={() => void handleDelete()}>{t('common.delete')}</Button>
          </>
        }
      />

      {/* ── Customer history dialog ─────────────────────────────────── */}
      <Dialog
        open={historyCustomer !== null}
        onOpenChange={o => { if (!o) setHistoryCustomer(null) }}
        title={historyCustomer ? `${historyCustomer.name} — ${isService ? t('customers.historyTitleService') : t('customers.historyTitle')}` : ''}
        closeLabel={t('common.close')}
      >
        {historyLoading ? (
          <div className="space-y-2 py-2">
            {[1,2,3].map(i => <div key={i} className="h-10 rounded bg-background animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <p className="py-4 text-sm text-secondary text-center">{t('customers.noHistory')}</p>
        ) : (
          <div className="space-y-3">
            {pendingBalance > 0 && (
              <div className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-warning font-medium">
                {t('customers.pendingBalance', { amount: `ETB ${pendingBalance.toLocaleString('en-ET', { minimumFractionDigits: 2 })}` })}
              </div>
            )}
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
              {history.map(s => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text">{s.sale_number}</p>
                    <p className="text-xs text-secondary">{new Date(s.sold_at).toLocaleDateString('en-ET', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    {(s.payment_status === 'partial') && (s.amount_paid ?? 0) > 0 && (
                      <p className="text-xs text-warning">{t('sales.amountPaid', { amount: `ETB ${(s.amount_paid ?? 0).toLocaleString('en-ET', { minimumFractionDigits: 2 })}` })}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={s.payment_status === 'paid' ? 'success' : s.payment_status === 'partial' ? 'warning' : s.payment_status === 'pending' ? 'warning' : 'neutral'} dot>
                      {t(`sales.status.${s.payment_status}`)}
                    </StatusBadge>
                    <span className="text-sm font-semibold text-text">ETB {s.total.toLocaleString('en-ET', { minimumFractionDigits: 2 })}</span>
                    {(s.payment_status === 'pending' || s.payment_status === 'partial') && (
                      <button type="button" onClick={() => openPayDialog(s)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-secondary hover:bg-background hover:text-primary">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('sales.recordPayment')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Record payment dialog (inside customer context) ───────────── */}
      <Dialog open={payDialogSale !== null} onOpenChange={o => { if (!o && !paySubmitting) setPayDialogSale(null) }}
        title={t('sales.recordPayment')} closeLabel={t('common.cancel')}>
        <div className="flex flex-col gap-4">
          {payDialogSale && (() => {
            const balance = payDialogSale.total - (payDialogSale.amount_paid ?? 0)
            return <p className="text-sm text-secondary">{t('sales.balanceDue', { amount: `ETB ${balance.toLocaleString('en-ET', { minimumFractionDigits: 2 })}` })}</p>
          })()}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label={t('sales.payment.amount')} inputMode="decimal"
              value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            <Input label={t('sales.payment.date')} type="date"
              value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <Select label={t('sales.payment.method')}
            options={[
              { value: 'cash',          label: t('pos.payment.cash') },
              { value: 'telebirr',      label: t('pos.payment.telebirr') },
              { value: 'cbe_birr',      label: t('pos.payment.cbe_birr') },
              { value: 'bank_transfer', label: t('pos.payment.bank_transfer') },
            ]}
            value={payMethod}
            onChange={e => setPayMethod(e.target.value as PaymentMethod)}
          />
          <Input label={t('sales.payment.note')} value={payNote}
            onChange={e => setPayNote(e.target.value)} maxLength={1000} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setPayDialogSale(null)} disabled={paySubmitting}>
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
