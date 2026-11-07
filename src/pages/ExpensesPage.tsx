import { useMemo, useState } from 'react'
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
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
import { createExpense, deleteExpense, updateExpense } from '../modules/expenses/api'
import { ExpenseForm } from '../modules/expenses/ExpenseForm'
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../modules/expenses/types'
import { useExpenses } from '../modules/expenses/useExpenses'

type DialogMode = 'add' | 'edit' | 'delete' | null

function fmtAmount(n: number) {
  return `ETB ${n.toLocaleString('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  // expense_date is YYYY-MM-DD; format for display without timezone shift
  const [y, m, d] = iso.slice(0, 10).split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('en-ET', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Expense management page — Phase 3.1. */
export function ExpensesPage() {
  const { t }    = useTranslation()
  const { user } = useAuth()
  const { expenses, status, errorMessage, reload } = useExpenses()
  const { notify } = useNotification()

  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selected,   setSelected]   = useState<Expense | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [search,      setSearch]      = useState('')
  const [filterCat,   setFilterCat]   = useState<ExpenseCategory | ''>('')
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')

  function openAdd()              { setSelected(null);  setDialogMode('add') }
  function openEdit(e: Expense)   { setSelected(e);     setDialogMode('edit') }
  function openDelete(e: Expense) { setSelected(e);     setDialogMode('delete') }
  function closeDialog()          { setDialogMode(null); setSelected(null) }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (search.trim() && !e.title.toLowerCase().includes(search.trim().toLowerCase())) return false
      if (filterCat && e.category !== filterCat) return false
      if (filterFrom && e.expense_date < filterFrom) return false
      if (filterTo   && e.expense_date > filterTo)   return false
      return true
    })
  }, [expenses, search, filterCat, filterFrom, filterTo])

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  // ── Mutations ──────────────────────────────────────────────────────────────
  async function handleAdd(input: Parameters<typeof createExpense>[0]) {
    if (!user) return
    setSubmitting(true)
    const { error } = await createExpense(input, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('expenses.notifications.added') })
    closeDialog(); await reload()
  }

  async function handleEdit(input: Parameters<typeof createExpense>[0]) {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await updateExpense(selected.id, input, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('expenses.notifications.updated') })
    closeDialog(); await reload()
  }

  async function handleDelete() {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await deleteExpense(selected.id, user.id)
    setSubmitting(false)
    if (error) { notify({ tone: 'danger', title: t('notification.error.title'), description: error.message }); return }
    notify({ tone: 'success', title: t('expenses.notifications.deleted') })
    closeDialog(); await reload()
  }

  const categoryFilterOptions = [
    { value: '', label: t('expenses.filter.allCategories') },
    ...EXPENSE_CATEGORIES.map(c => ({ value: c, label: t(`expenses.categories.${c}`) })),
  ]

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="py-6 md:py-10">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="space-y-px rounded-lg border border-border overflow-hidden">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-none" />)}
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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

  // ── Header + filters ───────────────────────────────────────────────────────
  const header = (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading text-2xl md:text-3xl">{t('expenses.title')}</h1>
          <p className="mt-1 text-sm text-secondary">
            {expenses.length === 0
              ? t('expenses.subtitle')
              : t('expenses.count', { count: expenses.length })}
          </p>
        </div>
        <Button
          size="sm"
          leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={openAdd}
        >
          {t('expenses.addExpense')}
        </Button>
      </div>

      {expenses.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder={t('expenses.filter.search')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t('expenses.filter.search')}
          />
          <Select
            options={categoryFilterOptions}
            value={filterCat}
            onChange={e => setFilterCat(e.target.value as ExpenseCategory | '')}
            aria-label={t('expenses.filter.category')}
          />
          <Input
            type="date"
            placeholder={t('expenses.filter.from')}
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            aria-label={t('expenses.filter.from')}
          />
          <Input
            type="date"
            placeholder={t('expenses.filter.to')}
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            aria-label={t('expenses.filter.to')}
          />
        </div>
      )}
    </div>
  )

  // ── Empty (no expenses at all) ─────────────────────────────────────────────
  if (expenses.length === 0) {
    return (
      <>
        <div className="py-6 md:py-10">
          {header}
          <EmptyState
            icon={Receipt}
            title={t('expenses.empty.title')}
            description={t('expenses.empty.desc')}
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" aria-hidden="true" />} onClick={openAdd}>
                {t('expenses.addExpense')}
              </Button>
            }
          />
        </div>
        <Dialog open={dialogMode === 'add'} onOpenChange={o => { if (!o) closeDialog() }}
          title={t('expenses.form.titleAdd')} closeLabel={t('common.close')}>
          <ExpenseForm mode="add" onSubmit={handleAdd} onCancel={closeDialog} submitting={submitting} />
        </Dialog>
      </>
    )
  }

  // ── No results after filtering ─────────────────────────────────────────────
  const noResults = filtered.length === 0

  return (
    <>
      <div className="py-6 md:py-10">
        {header}

        {noResults ? (
          <EmptyState
            icon={Receipt}
            title={t('expenses.empty.noResults')}
            description={t('expenses.empty.noResultsDesc')}
          />
        ) : (
          <>
            {/* Summary row */}
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-secondary">
                {filtered.length !== expenses.length
                  ? t('expenses.filteredCount', { count: filtered.length, total: expenses.length })
                  : t('expenses.count', { count: expenses.length })}
              </span>
              <span className="text-figures font-semibold">{fmtAmount(totalFiltered)}</span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('expenses.col.title')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('expenses.col.category')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('expenses.col.date')}</TableHead>
                    <TableHead className="text-right">{t('expenses.col.amount')}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(exp => (
                    <TableRow key={exp.id}>
                      <TableCell>
                        <p className="font-medium">{exp.title}</p>
                        {exp.description && (
                          <p className="mt-0.5 truncate text-xs text-secondary max-w-xs">{exp.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-secondary sm:table-cell">
                        {t(`expenses.categories.${exp.category}`)}
                      </TableCell>
                      <TableCell className="hidden text-secondary md:table-cell">
                        {fmtDate(exp.expense_date)}
                      </TableCell>
                      <TableCell className="text-right text-figures">
                        {fmtAmount(exp.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => openEdit(exp)}
                            aria-label={t('expenses.actions.edit', { title: exp.title })}
                            className="rounded p-1.5 text-secondary hover:bg-background hover:text-text">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => openDelete(exp)}
                            aria-label={t('expenses.actions.delete', { title: exp.title })}
                            className="rounded p-1.5 text-secondary hover:bg-danger-soft hover:text-danger">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* ── Add ─────────────────────────────────────────────────────────────── */}
      <Dialog open={dialogMode === 'add'} onOpenChange={o => { if (!o) closeDialog() }}
        title={t('expenses.form.titleAdd')} closeLabel={t('common.close')}>
        <ExpenseForm mode="add" onSubmit={handleAdd} onCancel={closeDialog} submitting={submitting} />
      </Dialog>

      {/* ── Edit ────────────────────────────────────────────────────────────── */}
      <Dialog open={dialogMode === 'edit' && selected !== null}
        onOpenChange={o => { if (!o) closeDialog() }}
        title={t('expenses.form.titleEdit')} closeLabel={t('common.close')}>
        {selected && (
          <ExpenseForm mode="edit" initial={selected} onSubmit={handleEdit}
            onCancel={closeDialog} submitting={submitting} />
        )}
      </Dialog>

      {/* ── Delete ──────────────────────────────────────────────────────────── */}
      <Dialog open={dialogMode === 'delete' && selected !== null}
        onOpenChange={o => { if (!o) closeDialog() }}
        title={t('expenses.delete.title')}
        description={t('expenses.delete.desc', { title: selected?.title ?? '' })}
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
