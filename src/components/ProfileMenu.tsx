/**
 * ProfileMenu — top-bar profile avatar + dropdown.
 *
 * Shows owner initials as an avatar. On click opens a dropdown with:
 *  - Owner name + business name (read-only header)
 *  - Edit profile (→ /app/profile)
 *  - Edit business details (→ /app/profile, same page handles both)
 *  - Divider
 *  - Sign out / log out
 *  - "Log in to another account" (sign out first, then /login)
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, LogOut, Settings } from 'lucide-react'

import { useAuth } from '../modules/auth/AuthContext'

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function ProfileMenu() {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const { profile, user, signOut } = useAuth()

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  const ownerName    = profile?.owner_name ?? user?.email ?? ''
  const businessName = profile?.name ?? ''
  const avatarText   = initials(ownerName) || '?'

  async function handleSignOut() {
    setOpen(false)
    await signOut()
  }

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
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
          className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-layer"
        >
          {/* Header — owner + business info */}
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-text">{ownerName}</p>
            {businessName && (
              <p className="mt-0.5 truncate text-xs text-secondary">{businessName}</p>
            )}
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-muted">{user.email}</p>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <MenuItem icon={<Settings className="h-4 w-4" />} label={t('profileMenu.settings')}
              onClick={() => go('/app/profile')} />
          </div>

          <div className="border-t border-border py-1">
            <MenuItem icon={<LogOut className="h-4 w-4" />} label={t('profileMenu.signOut')}
              onClick={() => void handleSignOut()} danger />
          </div>
        </div>
      )}
    </div>
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
