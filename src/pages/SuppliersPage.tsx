import { useMemo, useState } from 'react'
import { Mail, Pencil, Phone, Plus, Trash2, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { EmptyState } from '../design-system/EmptyState'
import { Input } from '../design-system/Input'
import { Skeleton } from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { useAuth } from '../modules/auth/AuthContext'
import { SupplierForm } from '../modules/suppliers/SupplierForm'
import { createSupplier, deleteSupplier, updateSupplier } from '../modules/suppliers/api'
import { useSuppliers } from '../modules/suppliers/useSuppliers'
import type { Supplier, SupplierInput } from '../modules/suppliers/types'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'

type DialogMode = 'add' | 'edit' | 'delete' | null

export function SuppliersPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { suppliers, status, errorMessage, reload } = useSuppliers()
  const { notify } = useNotification()
  const { canAddSupplier } = useSubscription()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected,   setSelected]   = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search,     setSearch]     = useState('')

  function openAdd()              { setSelected(null); setDialogMode('add') }
  function openEdit(s: Supplier)  { setSelected(s);    setDialogMode('edit') }
  function openDel(s: Supplier)   { setSelected(s);    setDialogMode('delete') }
  function closeDialog()          { setDialogMode(null); setSelected(null) }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return suppliers
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q))
    )
  }, [suppliers, search])

  async function handleAdd(input: SupplierInput) {
    if (!user) return
    setSubmitting(true)
    const { error } = await createSupplier(input, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('suppliers.notifications.added') })
    closeDialog(); await reload()
  }

  async function handleEdit(input: SupplierInput) {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await updateSupplier(selected.id, input, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('suppliers.notifications.updated') })
    closeDialog(); await reload()
  }

  async function handleDelete() {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await deleteSupplier(selected.id, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('suppliers.notifications.deleted') })
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
        <EmptyState icon={Truck} title={t('notification.error.title')} description={errorMessage}
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
            <h1 className="heading text-2xl md:text-3xl">{t('suppliers.title')}</h1>
            <p className="mt-1 text-sm text-secondary">
              {suppliers.length === 0 ? t('suppliers.subtitle') : t('suppliers.count', { count: suppliers.length })}
            </p>
          </div>
          <Button size="sm" leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}
            disabled={!canAddSupplier()}
            title={!canAddSupplier() ? t('subscription.supplierLimitReached') : undefined}>
            {t('suppliers.add')}
          </Button>
        </div>

        {/* Search */}
        {suppliers.length > 0 && (
          <div className="mb-4">
            <Input
              placeholder={t('contacts.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label={t('contacts.searchPlaceholder')}
            />
          </div>
        )}

        {/* Content */}
        {suppliers.length === 0 ? (
          <EmptyState icon={Truck} title={t('suppliers.empty.title')} description={t('suppliers.empty.desc')}
            action={<Button leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}
              disabled={!canAddSupplier()}
              title={!canAddSupplier() ? t('subscription.supplierLimitReached') : undefined}>{t('suppliers.add')}</Button>} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Truck} title={t('contacts.noResults')} description={t('contacts.noResultsDesc')} />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {filtered.map(s => (
              <div key={s.id} className="flex items-start justify-between gap-3 bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text truncate">{s.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-secondary">
                    {s.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" aria-hidden="true" />{s.phone}
                      </span>
                    )}
                    {s.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" aria-hidden="true" />{s.email}
                      </span>
                    )}
                  </div>
                  {s.address && <p className="mt-0.5 truncate text-xs text-secondary">{s.address}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => openEdit(s)}
                    aria-label={t('contacts.actions.edit', { name: s.name })}
                    className="rounded p-1.5 text-secondary hover:bg-background hover:text-text">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => openDel(s)}
                    aria-label={t('contacts.actions.delete', { name: s.name })}
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
        title={t('suppliers.form.titleAdd')} closeLabel={t('common.close')}>
        <SupplierForm mode="add" onSubmit={handleAdd} onCancel={closeDialog} submitting={submitting} />
      </Dialog>

      <Dialog open={dialogMode === 'edit' && selected !== null} onOpenChange={o => { if (!o) closeDialog() }}
        title={t('suppliers.form.titleEdit')} closeLabel={t('common.close')}>
        {selected && <SupplierForm mode="edit" initial={selected} onSubmit={handleEdit} onCancel={closeDialog} submitting={submitting} />}
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
