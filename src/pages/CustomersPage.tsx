import { useMemo, useState } from 'react'
import { Mail, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { useAuth } from '../modules/auth/AuthContext'
import { CustomerForm } from '../modules/customers/CustomerForm'
import { createCustomer, deleteCustomer, updateCustomer } from '../modules/customers/api'
import { useCustomers } from '../modules/customers/useCustomers'
import type { Customer, CustomerInput } from '../modules/customers/types'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'

type DialogMode = 'add' | 'edit' | 'delete' | null

export function CustomersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { customers, status, errorMessage, reload } = useCustomers()
  const { notify } = useNotification()
  const { canAddCustomer } = useSubscription()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected,   setSelected]   = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search,     setSearch]     = useState('')

  function openAdd()              { setSelected(null);  setDialogMode('add') }
  function openEdit(c: Customer)  { setSelected(c);     setDialogMode('edit') }
  function openDel(c: Customer)   { setSelected(c);     setDialogMode('delete') }
  function closeDialog()          { setDialogMode(null); setSelected(null) }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    )
  }, [customers, search])

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
            <h1 className="heading text-2xl md:text-3xl">{t('customers.title')}</h1>
            <p className="mt-1 text-sm text-secondary">
              {customers.length === 0 ? t('customers.subtitle') : t('customers.count', { count: customers.length })}
            </p>
          </div>
          <Button size="sm" leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}
            disabled={!canAddCustomer()}
            title={!canAddCustomer() ? t('subscription.customerLimitReached') : undefined}>
            {t('customers.add')}
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

        {/* Empty */}
        {customers.length === 0 ? (
          <EmptyState icon={Users} title={t('customers.empty.title')} description={t('customers.empty.desc')}
            action={<Button leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}
              disabled={!canAddCustomer()}
              title={!canAddCustomer() ? t('subscription.customerLimitReached') : undefined}>{t('customers.add')}</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title={t('contacts.noResults')} description={t('contacts.noResultsDesc')} />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {filtered.map(c => (
              <div key={c.id} className="flex items-start justify-between gap-3 bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text truncate">{c.name}</p>
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
        title={t('customers.form.titleAdd')} closeLabel={t('common.close')}>
        <CustomerForm mode="add" onSubmit={handleAdd} onCancel={closeDialog} submitting={submitting} />
      </Dialog>

      <Dialog open={dialogMode === 'edit' && selected !== null} onOpenChange={o => { if (!o) closeDialog() }}
        title={t('customers.form.titleEdit')} closeLabel={t('common.close')}>
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
    </>
  )
}
