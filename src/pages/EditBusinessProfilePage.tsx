import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { EmptyState } from '../design-system/EmptyState'
import { useNotification } from '../design-system/Notification'
import { Spinner } from '../design-system/LoadingState'
import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { Input } from '../design-system/Input'
import { useAuth } from '../modules/auth/AuthContext'
import { updateBusiness, getBusinessDataSummary } from '../modules/auth/api'
import { BusinessForm } from '../modules/auth/BusinessForm'
import { getProducts } from '../modules/retail/api'
import type { BusinessInput } from '../modules/auth/types'

interface DataSummary {
  products:  number
  sales:     number
  expenses:  number
  customers: number
}

/** Edit the existing business profile, with a danger-zone delete section. */
export function EditBusinessProfilePage() {
  const { t }        = useTranslation()
  const navigate     = useNavigate()
  const { notify }   = useNotification()
  const { user, profile, businesses, profileStatus, refreshProfile, deleteBusiness } = useAuth()

  const [submitting,    setSubmitting]    = useState(false)
  const [hasData,       setHasData]       = useState(false)

  // Danger zone state
  const [deleteOpen,    setDeleteOpen]    = useState(false)
  const [confirmName,   setConfirmName]   = useState('')
  const [deleting,      setDeleting]      = useState(false)
  const [dataSummary,   setDataSummary]   = useState<DataSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const isLastBusiness = businesses.length <= 1
  const nameMatches    = confirmName.trim() === (profile?.name ?? '')

  // Check if owner has products (to lock business type)
  useEffect(() => {
    if (!user) return
    getProducts().then(({ data }) => {
      if (data && data.length > 0) setHasData(true)
    })
  }, [user])

  // Load data summary when delete dialog opens
  useEffect(() => {
    if (!deleteOpen || !user || dataSummary) return
    setSummaryLoading(true)
    getBusinessDataSummary(user.id).then(summary => {
      setDataSummary(summary)
      setSummaryLoading(false)
    })
  }, [deleteOpen, user, dataSummary])

  async function handleSubmit(input: BusinessInput) {
    if (!user || !profile) return
    setSubmitting(true)
    const { error } = await updateBusiness(profile.id, input, user.id)
    setSubmitting(false)
    if (error) {
      notify({ tone: 'danger', title: t('auth.errors.generic'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('business.edit.success'), description: t('business.edit.successDesc') })
    await refreshProfile()
    navigate('/app')
  }

  async function handleDelete() {
    if (!profile || !nameMatches) return
    setDeleting(true)
    const { error } = await deleteBusiness(profile.id)
    setDeleting(false)
    if (error) {
      notify({ tone: 'danger', title: t('auth.errors.generic'), description: error.message })
      return
    }
    notify({ tone: 'success', title: t('business.delete.success') })
    // If no businesses left → onboarding, else → app (next business is now active)
    navigate(businesses.length <= 1 ? '/onboarding' : '/app', { replace: true })
  }

  function openDelete() {
    setConfirmName('')
    setDeleteOpen(true)
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (profileStatus === 'loading' || !profile) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Spinner size="lg" label={t('app.home.loadingProfile')} />
      </div>
    )
  }

  if (profileStatus === 'error') {
    return (
      <EmptyState
        title={t('notification.error.title')}
        description={t('notification.error.desc')}
        action={
          <button type="button" onClick={() => void refreshProfile()}
            className="text-sm font-medium text-primary hover:underline">
            {t('common.confirm')}
          </button>
        }
      />
    )
  }

  return (
    <div className="mx-auto max-w-xl py-6 md:py-10 space-y-10">

      {/* ── Edit form ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="heading text-2xl md:text-3xl">{t('business.edit.title')}</h1>
        <p className="mt-3 text-sm text-secondary">{t('business.edit.subtitle')}</p>
        <div className="mt-8">
          <BusinessForm
            mode="edit"
            initial={profile}
            hasData={hasData}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </div>
      </div>

      {/* ── Danger zone ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-danger/30 bg-danger-soft/20 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-danger">{t('business.delete.dangerZone')}</h2>
            <p className="mt-1 text-sm text-secondary">{t('business.delete.dangerDesc')}</p>

            {isLastBusiness && (
              <p className="mt-2 text-xs font-medium text-warning">
                {t('business.delete.lastBusinessWarning')}
              </p>
            )}

            <Button
              variant="danger"
              size="sm"
              className="mt-4"
              leadingIcon={<Trash2 className="h-4 w-4" />}
              onClick={openDelete}
            >
              {t('business.delete.button', { name: profile.name })}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Delete confirmation dialog ───────────────────────────────────────── */}
      <Dialog
        open={deleteOpen}
        onOpenChange={o => { if (!o) setDeleteOpen(false) }}
        title={t('business.delete.dialogTitle')}
        closeLabel={t('common.cancel')}
      >
        <div className="flex flex-col gap-4">

          {/* What will be deleted */}
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
            <p className="font-semibold">{t('business.delete.willDelete')}</p>
            <ul className="mt-2 space-y-0.5 text-xs">
              <li>✗ {t('business.delete.item.profile')}</li>
              <li>✗ {t('business.delete.item.subscription')}</li>
              <li>✗ {t('business.delete.item.staff')}</li>
              <li>✗ {t('business.delete.item.payments')}</li>
            </ul>
          </div>

          {/* What will NOT be deleted */}
          <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
            <p className="font-semibold text-text">{t('business.delete.willNotDelete')}</p>
            {summaryLoading ? (
              <p className="mt-1 text-xs text-secondary">{t('common.loading')}</p>
            ) : dataSummary ? (
              <ul className="mt-2 space-y-0.5 text-xs text-secondary">
                <li>→ {t('business.delete.item.products', { count: dataSummary.products })}</li>
                <li>→ {t('business.delete.item.sales', { count: dataSummary.sales })}</li>
                <li>→ {t('business.delete.item.expenses', { count: dataSummary.expenses })}</li>
                <li>→ {t('business.delete.item.customers', { count: dataSummary.customers })}</li>
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-secondary">{t('business.delete.dataNote')}</p>
          </div>

          {/* Type the business name to confirm */}
          <div>
            <p className="mb-2 text-sm text-text">
              {t('business.delete.typeToConfirm', { name: profile.name })}
            </p>
            <Input
              value={confirmName}
              onChange={e => setConfirmName(e.target.value)}
              placeholder={profile.name}
              autoComplete="off"
              autoFocus
            />
            {confirmName.length > 0 && !nameMatches && (
              <p className="mt-1.5 text-xs text-danger">{t('business.delete.nameMismatch')}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              fullWidth
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={!nameMatches}
              onClick={() => void handleDelete()}
              fullWidth
              leadingIcon={<Trash2 className="h-4 w-4" />}
            >
              {t('business.delete.confirmButton')}
            </Button>
          </div>

        </div>
      </Dialog>

    </div>
  )
}
