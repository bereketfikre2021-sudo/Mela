/**
 * StaffPage — Phase 12.
 *
 * Allows the business owner to manage staff members:
 *  - View all staff with their role, status, and permissions.
 *  - Add new staff (name, role, permission toggles, 4-digit PIN).
 *  - Edit permissions for existing staff.
 *  - Deactivate / reactivate staff.
 *  - Remove staff (with confirmation).
 *  - View the last 50 activity log entries.
 *
 * Only visible to owners (canDo('manage_staff')).
 * Requires Premium subscription (staff is a Premium feature).
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Pencil, Plus, Shield, Trash2 } from 'lucide-react'

import { Button }          from '../design-system/Button'
import { Dialog }          from '../design-system/Dialog'
import { EmptyState }      from '../design-system/EmptyState'
import { Input }           from '../design-system/Input'
import { Skeleton }        from '../design-system/LoadingState'
import { useNotification } from '../design-system/Notification'
import { Select }          from '../design-system/Select'
import { StatusBadge }     from '../design-system/StatusBadge'

import { useAuth }         from '../modules/auth/AuthContext'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import { useStaff }        from '../modules/staff/StaffContext'
import {
  createStaffMember,
  deactivateStaff,
  deleteStaff,
  getActivityLog,
  listStaff,
  reactivateStaff,
  updateStaffPermissions,
} from '../modules/staff/api'
import { ALL_PERMISSIONS, getDefaultPermissions, hashPin } from '../modules/staff/permissions'
import type { ActivityLogEntry, StaffMember, StaffPermissions, StaffRole } from '../modules/staff/types'

type DialogMode = 'add' | 'editPerms' | 'delete' | null

const ROLES: StaffRole[] = ['manager', 'cashier', 'inventory', 'accountant']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ET', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function StaffPage() {
  const { t }             = useTranslation()
  const navigate          = useNavigate()
  const { user, profile } = useAuth()
  const { isActive }      = useSubscription()
  const { canDo }         = useStaff()
  const { notify }        = useNotification()

  const [staffList,   setStaffList]   = useState<StaffMember[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  const [dialogMode,  setDialogMode]  = useState<DialogMode>(null)
  const [selected,    setSelected]    = useState<StaffMember | null>(null)
  const [submitting,  setSubmitting]  = useState(false)

  // Add staff form state
  const [newName,    setNewName]    = useState('')
  const [newRole,    setNewRole]    = useState<StaffRole>('cashier')
  const [newPerms,   setNewPerms]   = useState<StaffPermissions>(getDefaultPermissions('cashier'))
  const [newPin,     setNewPin]     = useState('')
  const [showPin,    setShowPin]    = useState(false)
  const [pinError,   setPinError]   = useState('')
  const [nameError,  setNameError]  = useState('')

  // Edit permissions form state
  const [editPerms, setEditPerms] = useState<StaffPermissions | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [staffRes, logRes] = await Promise.all([
      listStaff(user.id),
      getActivityLog(user.id, 50),
    ])
    if (staffRes.data)  setStaffList(staffRes.data)
    if (logRes.data)    setActivityLog(logRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => { void load() }, [load])

  // Premium gate
  if (!isActive) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          title={t('staff.premiumRequired')}
          description={t('staff.premiumRequiredDesc')}
          action={
            <Button size="sm" onClick={() => navigate('/app/subscription')}>
              {t('subscription.upgradeButton')}
            </Button>
          }
        />
      </div>
    )
  }

  // Permission gate (staff members without manage_staff see this)
  if (!canDo('manage_staff')) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          title={t('staff.accessRestricted')}
          description={t('staff.accessRestrictedDesc')}
        />
      </div>
    )
  }

  function openAdd() {
    setNewName('')
    setNewRole('cashier')
    setNewPerms(getDefaultPermissions('cashier'))
    setNewPin('')
    setShowPin(false)
    setPinError('')
    setNameError('')
    setDialogMode('add')
  }

  function openEditPerms(member: StaffMember) {
    setSelected(member)
    setEditPerms({ ...member.permissions })
    setDialogMode('editPerms')
  }

  function openDelete(member: StaffMember) {
    setSelected(member)
    setDialogMode('delete')
  }

  function closeDialog() {
    setDialogMode(null)
    setSelected(null)
    setEditPerms(null)
  }

  function handleRoleChange(role: StaffRole) {
    setNewRole(role)
    setNewPerms(getDefaultPermissions(role))
  }

  function toggleNewPerm(key: keyof StaffPermissions) {
    setNewPerms(p => ({ ...p, [key]: !p[key] }))
  }

  function toggleEditPerm(key: keyof StaffPermissions) {
    setEditPerms(p => p ? { ...p, [key]: !p[key] } : p)
  }

  async function handleAdd() {
    if (!user || !profile) return
    let valid = true

    if (newName.trim().length < 1) {
      setNameError(t('validation.required'))
      valid = false
    } else {
      setNameError('')
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinError(t('staff.form.pinError'))
      valid = false
    } else {
      setPinError('')
    }

    if (!valid) return

    setSubmitting(true)
    const pin_hash = await hashPin(newPin)
    const { error } = await createStaffMember(user.id, profile.id, {
      name:        newName.trim(),
      role:        newRole,
      pin_hash,
      permissions: newPerms,
    })
    setSubmitting(false)

    if (error) {
      notify({ title: t('notification.error.title'), description: error.message, tone: 'danger' })
      return
    }

    notify({ title: t('staff.notifications.added'), tone: 'success' })
    closeDialog()
    void load()
  }

  async function handleSavePerms() {
    if (!user || !selected || !editPerms) return
    setSubmitting(true)
    const { error } = await updateStaffPermissions(user.id, selected.id, editPerms)
    setSubmitting(false)
    if (error) {
      notify({ title: t('notification.error.title'), description: error.message, tone: 'danger' })
      return
    }
    notify({ title: t('staff.notifications.updated'), tone: 'success' })
    closeDialog()
    void load()
  }

  async function handleToggleStatus(member: StaffMember) {
    if (!user) return
    if (member.status === 'active') {
      const { error } = await deactivateStaff(user.id, member.id)
      if (error) { notify({ title: t('notification.error.title'), description: error.message, tone: 'danger' }); return }
      notify({ title: t('staff.notifications.deactivated'), tone: 'success' })
    } else {
      const { error } = await reactivateStaff(user.id, member.id)
      if (error) { notify({ title: t('notification.error.title'), description: error.message, tone: 'danger' }); return }
      notify({ title: t('staff.notifications.reactivated'), tone: 'success' })
    }
    void load()
  }

  async function handleDelete() {
    if (!user || !selected) return
    setSubmitting(true)
    const { error } = await deleteStaff(user.id, selected.id)
    setSubmitting(false)
    if (error) {
      notify({ title: t('notification.error.title'), description: error.message, tone: 'danger' })
      return
    }
    notify({ title: t('staff.notifications.deleted'), tone: 'success' })
    closeDialog()
    void load()
  }

  const activeCount = staffList.filter(s => s.status === 'active').length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text">{t('staff.title')}</h1>
          <p className="mt-1 text-sm text-secondary">
            {t('staff.subtitle', { count: activeCount })}
          </p>
        </div>
        <Button size="sm" leadingIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
          {t('staff.addStaff')}
        </Button>
      </div>

      {/* Staff list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : staffList.length === 0 ? (
        <EmptyState
          title={t('staff.empty.title')}
          description={t('staff.empty.desc')}
          action={
            <Button size="sm" leadingIcon={<Plus className="h-4 w-4" />} onClick={openAdd}>
              {t('staff.addStaff')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {staffList.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border border-border text-sm font-semibold text-secondary select-none">
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-text">{member.name}</p>
                <p className="text-xs text-secondary">
                  {t(`staff.role.${member.role}`, { defaultValue: member.role })}
                </p>
              </div>
              <StatusBadge tone={member.status === 'active' ? 'success' : 'neutral'}>
                {t(`staff.status.${member.status}`)}
              </StatusBadge>
              <div className="flex gap-1">
                <button
                  type="button"
                  title={t('staff.editPermissions')}
                  onClick={() => openEditPerms(member)}
                  className="rounded-lg p-2 text-secondary hover:bg-background hover:text-text transition-colors"
                >
                  <Shield className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={member.status === 'active' ? t('staff.deactivate') : t('staff.reactivate')}
                  onClick={() => void handleToggleStatus(member)}
                  className="rounded-lg p-2 text-secondary hover:bg-background hover:text-text transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={t('staff.remove')}
                  onClick={() => openDelete(member)}
                  className="rounded-lg p-2 text-secondary hover:bg-background hover:text-danger transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activity log */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-text">{t('staff.activityLog.title')}</h2>
        {activityLog.length === 0 ? (
          <p className="text-sm text-secondary">{t('staff.activityLog.empty')}</p>
        ) : (
          <div className="space-y-1">
            {activityLog.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-background transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text">
                    <span className="font-medium">
                      {entry.performed_by
                        ? (staffList.find(s => s.id === entry.performed_by)?.name ?? t('staff.activityLog.unknownStaff'))
                        : t('staff.activityLog.owner')}
                    </span>
                    {' — '}
                    {t(`staff.activityLog.action.${entry.action_type}`, { defaultValue: entry.action_type })}
                  </p>
                  {entry.details && (
                    <p className="text-xs text-secondary truncate">
                      {Object.values(entry.details).filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted shrink-0 mt-0.5">{formatDate(entry.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add Staff Dialog ── */}
      <Dialog
        open={dialogMode === 'add'}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={t('staff.form.titleAdd')}
      >
        <div className="space-y-4">
          <Input
            label={t('staff.form.name')}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            error={nameError}
            autoFocus
          />

          <Select
            label={t('staff.form.role')}
            value={newRole}
            onChange={e => handleRoleChange(e.target.value as StaffRole)}
            options={ROLES.map(r => ({ value: r, label: t(`staff.role.${r}`, { defaultValue: r }) }))}
          />

          {/* Permission toggles */}
          <div>
            <p className="mb-2 text-sm font-medium text-text">{t('staff.form.permissions')}</p>
            <div className="rounded-xl border border-border divide-y divide-border">
              {ALL_PERMISSIONS.map(key => (
                <label
                  key={key}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-background transition-colors"
                >
                  <span className="text-sm text-text">
                    {t(`staff.permission.${key}`, { defaultValue: key })}
                  </span>
                  <input
                    type="checkbox"
                    checked={newPerms[key]}
                    onChange={() => toggleNewPerm(key)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* PIN input */}
          <div className="relative">
            <Input
              label={t('staff.form.pin')}
              type={showPin ? 'text' : 'password'}
              value={newPin}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                setNewPin(v)
                setPinError('')
              }}
              placeholder="••••"
              error={pinError}
              helperText={t('staff.form.pinHelper')}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPin(v => !v)}
                  className="text-secondary hover:text-text"
                  aria-label={showPin ? t('staff.form.hidePin') : t('staff.form.showPin')}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={closeDialog} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleAdd()} loading={submitting}>
              {t('staff.form.submit')}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Edit Permissions Dialog ── */}
      <Dialog
        open={dialogMode === 'editPerms'}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={t('staff.form.titleEditPerms', { name: selected?.name })}
      >
        {editPerms && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border divide-y divide-border">
              {ALL_PERMISSIONS.map(key => (
                <label
                  key={key}
                  className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-background transition-colors"
                >
                  <span className="text-sm text-text">
                    {t(`staff.permission.${key}`, { defaultValue: key })}
                  </span>
                  <input
                    type="checkbox"
                    checked={editPerms[key]}
                    onChange={() => toggleEditPerm(key)}
                    className="h-4 w-4 rounded accent-primary"
                  />
                </label>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={closeDialog} disabled={submitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={() => void handleSavePerms()} loading={submitting}>
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={dialogMode === 'delete'}
        onOpenChange={open => { if (!open) closeDialog() }}
        title={t('staff.delete.title')}
      >
        <p className="text-sm text-text mb-6">
          {t('staff.delete.desc', { name: selected?.name })}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={closeDialog} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()} loading={submitting}>
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
