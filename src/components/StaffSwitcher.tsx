/**
 * StaffSwitcher — Phase 12.
 *
 * Bottom-sheet modal for switching between owner and staff contexts.
 * Triggered from ProfileMenu. Shows a PIN numpad for staff members.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Delete, UserCheck } from 'lucide-react'

import { Dialog } from '../design-system/Dialog'
import { Button } from '../design-system/Button'
import { useStaff } from '../modules/staff/StaffContext'
import type { StaffMember } from '../modules/staff/types'

interface StaffSwitcherProps {
  open:      boolean
  onClose:   () => void
  staffList: StaffMember[]
  ownerName: string
}

type View = 'list' | 'pin'

export function StaffSwitcher({ open, onClose, staffList, ownerName }: StaffSwitcherProps) {
  const { t } = useTranslation()
  const { currentStaffMember, switchToStaff, switchToOwner } = useStaff()

  const [view,          setView]          = useState<View>('list')
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [pin,           setPin]           = useState('')
  const [error,         setError]         = useState(false)
  const [shaking,       setShaking]       = useState(false)
  const [verifying,     setVerifying]     = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setView('list')
      setSelectedStaff(null)
      setPin('')
      setError(false)
      setShaking(false)
    }
  }, [open])

  function handleSelectStaff(member: StaffMember) {
    setSelectedStaff(member)
    setPin('')
    setError(false)
    setView('pin')
  }

  function handleSelectOwner() {
    switchToOwner()
    onClose()
  }

  function handlePinDigit(digit: string) {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    setError(false)
    if (next.length === 4) {
      void handleConfirmPin(next)
    }
  }

  function handlePinDelete() {
    setPin(p => p.slice(0, -1))
    setError(false)
  }

  const handleConfirmPin = useCallback(async (enteredPin: string) => {
    if (!selectedStaff) return
    setVerifying(true)
    const ok = await switchToStaff(selectedStaff, enteredPin)
    setVerifying(false)
    if (ok) {
      onClose()
    } else {
      setError(true)
      setShaking(true)
      setPin('')
      setTimeout(() => setShaking(false), 500)
    }
  }, [selectedStaff, switchToStaff, onClose])

  const activeStaff = staffList.filter(s => s.status === 'active')

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => { if (!isOpen) onClose() }}
      title={
        view === 'list'
          ? t('staff.switcher.title')
          : t('staff.switcher.enterPin', { name: selectedStaff?.name })
      }
    >
      {view === 'list' && (
        <div className="flex flex-col gap-1 py-1">
          {/* Owner row */}
          <button
            type="button"
            onClick={handleSelectOwner}
            className={[
              'flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
              !currentStaffMember
                ? 'bg-mint text-primary'
                : 'hover:bg-background text-text',
            ].join(' ')}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white select-none">
              {ownerName.slice(0, 2).toUpperCase() || 'OW'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">{ownerName}</p>
              <p className="text-xs text-secondary">{t('staff.switcher.ownerRole')}</p>
            </div>
            {!currentStaffMember && (
              <UserCheck className="h-4 w-4 text-primary shrink-0" />
            )}
          </button>

          {/* Staff rows */}
          {activeStaff.map(member => (
            <button
              key={member.id}
              type="button"
              onClick={() => handleSelectStaff(member)}
              className={[
                'flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
                currentStaffMember?.id === member.id
                  ? 'bg-mint text-primary'
                  : 'hover:bg-background text-text',
              ].join(' ')}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background border border-border text-sm font-semibold text-secondary select-none">
                {member.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="text-xs text-secondary">
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </p>
              </div>
              {currentStaffMember?.id === member.id && (
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
              )}
            </button>
          ))}

          {activeStaff.length === 0 && (
            <p className="px-4 py-3 text-sm text-secondary">{t('staff.switcher.noStaff')}</p>
          )}
        </div>
      )}

      {view === 'pin' && selectedStaff && (
        <div className="flex flex-col items-center gap-6 py-4">
          {/* PIN dots */}
          <div className={`flex gap-3 ${shaking ? 'animate-pulse' : ''}`}>
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={[
                  'h-4 w-4 rounded-full border-2 transition-colors',
                  i < pin.length
                    ? error ? 'border-danger bg-danger' : 'border-primary bg-primary'
                    : 'border-border bg-transparent',
                ].join(' ')}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-danger font-medium -mt-3">
              {t('staff.switcher.wrongPin')}
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                type="button"
                disabled={verifying || pin.length >= 4}
                onClick={() => handlePinDigit(d)}
                className="h-14 rounded-xl border border-border bg-surface text-lg font-semibold text-text transition-colors hover:bg-background active:bg-mint disabled:opacity-50"
              >
                {d}
              </button>
            ))}
            {/* Bottom row: empty, 0, backspace */}
            <div />
            <button
              type="button"
              disabled={verifying || pin.length >= 4}
              onClick={() => handlePinDigit('0')}
              className="h-14 rounded-xl border border-border bg-surface text-lg font-semibold text-text transition-colors hover:bg-background active:bg-mint disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={verifying || pin.length === 0}
              onClick={handlePinDelete}
              aria-label={t('staff.switcher.deleteDigit')}
              className="h-14 rounded-xl border border-border bg-surface text-text transition-colors hover:bg-background active:bg-mint disabled:opacity-50 flex items-center justify-center"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('list')}
          >
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </Dialog>
  )
}
