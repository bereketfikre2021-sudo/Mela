/**
 * ProfileMenu – top-bar profile avatar + dropdown.
 *
 * Shows owner initials as an avatar. On click opens a dropdown with:
 *  - Owner name + active business name (read-only header)
 *  - My Businesses section: lists all owned businesses with a switch action
 *  - Edit profile / Subscription / Staff links
 *  - Sign out
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, Check, ChevronDown, CreditCard, LogOut, Plus, Settings, UserCog, Users2 } from 'lucide-react'
import { useAuth } from '../modules/auth/AuthContext'
import { useSubscription } from '../modules/subscriptions/SubscriptionContext'
import { useStaff } from '../modules/staff/StaffContext'
import { listStaff } from '../modules/staff/api'
import { StaffSwitcher } from './StaffSwitcher'
import { BusinessAvatar } from './BusinessAvatar'
import type { StaffMember } from '../modules/staff/types'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function ProfileMenu() {
  const { t }      = useTranslation()
  const navigate   = useNavigate()
  const { businesses, activeBusiness, user, switchBusiness, signOut } = useAuth()
  const { isActive }           = useSubscription()
  const { currentStaffMember } = useStaff()

  const [open,         setOpen]         = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [staffList,    setStaffList]    = useState<StaffMember[]>([])
  const [switching,    setSwitching]    = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Load staff list when Premium is active
  useEffect(() => {
    if (isActive && user) {
      void listStaff(user.id).then(({ data }) => {
        if (data) setStaffList(data.filter(s => s.status === 'active'))
      })
    }
  }, [isActive, user])

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  const ownerName    = activeBusiness?.owner_name ?? user?.email ?? ''
  const businessName = activeBusiness?.name ?? ''
  const displayName  = currentStaffMember ? currentStaffMember.name : ownerName
  const avatarText   = initials(displayName) || '?'

  async function handleSignOut() {
    setOpen(false)
    await signOut()
  }

  async function handleSwitchBusiness(id: string) {
    if (id === activeBusiness?.id) return
    setSwitching(id)
    await switchBusiness(id)
    setSwitching(null)
    setOpen(false)
    // Stay on current page – the new business context is now active
    navigate('/app', { replace: true })
  }

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  function openSwitcher() {
    setOpen(false)
    setSwitcherOpen(true)
  }

  const canAddMore = businesses.length < 3
  const hasMultiple = businesses.length > 1

  return (
    <>
      <div ref={rootRef} className="relative">
        {/* Avatar button */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={t('profileMenu.openMenu')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm font-medium text-text transition-colors hover:bg-background"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white select-none">
            {avatarText}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-secondary transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-layer"
          >
            {/* Header – owner + active business */}
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-semibold text-text">{ownerName}</p>
              {businessName && (
                <p className="mt-0.5 truncate text-xs text-secondary">{businessName}</p>
              )}
              {user?.email && (
                <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
              )}
              {currentStaffMember && (
                <p className="mt-1 truncate text-xs font-medium text-primary">
                  {t('profileMenu.staffActive', { name: currentStaffMember.name })}
                </p>
              )}
            </div>

            {/* ── My Businesses ───────────────────────────────────────── */}
            {(hasMultiple || canAddMore) && (
              <div className="border-b border-border py-2">
                <p className="px-4 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t('profileMenu.myBusinesses')}
                </p>
                {businesses.map(biz => {
                  const isActive  = biz.id === activeBusiness?.id
                  const isLoading = switching === biz.id
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      role="menuitem"
                      onClick={() => void handleSwitchBusiness(biz.id)}
                      disabled={isActive || isLoading}
                      className={[
                        'flex w-full items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                        isActive
                          ? 'bg-primary-soft text-primary cursor-default'
                          : 'text-text hover:bg-background',
                      ].join(' ')}
                    >
                      <BusinessAvatar business={biz} size="sm" />
                      <span className="min-w-0 flex-1 truncate font-medium">{biz.name}</span>
                      {isLoading && (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      )}
                      {isActive && !isLoading && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </button>
                  )
                })}

                {/* Add another business */}
                {canAddMore && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go('/onboarding/new')}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-secondary transition-colors hover:bg-background hover:text-primary text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-dashed border-current">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium">{t('profileMenu.addBusiness')}</span>
                    <span className="ml-auto text-xs text-muted">
                      {t('selectBusiness.remaining', { count: 3 - businesses.length })}
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* ── Settings actions ────────────────────────────────────── */}
            <div className="py-1">
              <MenuItem
                icon={<Settings className="h-4 w-4" />}
                label={t('profileMenu.settings')}
                onClick={() => go('/app/profile')}
              />
              <MenuItem
                icon={<CreditCard className="h-4 w-4" />}
                label={t('profileMenu.subscription')}
                onClick={() => go('/app/subscription')}
              />
              {isActive && (
                <MenuItem
                  icon={<Users2 className="h-4 w-4" />}
                  label={t('profileMenu.staff')}
                  onClick={() => go('/app/staff')}
                />
              )}
              {isActive && staffList.length > 0 && (
                <MenuItem
                  icon={<UserCog className="h-4 w-4" />}
                  label={t('profileMenu.switchStaff')}
                  onClick={openSwitcher}
                />
              )}
              {/* Show all-businesses page when user has only 1 (to add more) */}
              {!hasMultiple && canAddMore && (
                <MenuItem
                  icon={<Building2 className="h-4 w-4" />}
                  label={t('profileMenu.addBusiness')}
                  onClick={() => go('/onboarding/new')}
                />
              )}
            </div>

            <div className="border-t border-border py-1">
              <MenuItem
                icon={<LogOut className="h-4 w-4" />}
                label={t('profileMenu.signOut')}
                onClick={() => void handleSignOut()}
                danger
              />
            </div>
          </div>
        )}
      </div>

      {/* Staff Switcher Sheet */}
      <StaffSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        staffList={staffList}
        ownerName={ownerName}
      />
    </>
  )
}

function MenuItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
        danger
          ? 'text-danger hover:bg-danger-soft'
          : 'text-text hover:bg-background',
      ].join(' ')}
    >
      <span className={danger ? 'text-danger' : 'text-secondary'}>{icon}</span>
      {label}
    </button>
  )
}
