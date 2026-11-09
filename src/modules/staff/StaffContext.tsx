/**
 * StaffContext — Phase 12.
 *
 * Tracks which staff member is currently active on this device.
 * - null currentStaffMember = owner is operating (always full permissions).
 * - A StaffMember value = that staff member's session is active.
 *
 * Staff context is intentionally NOT persisted to localStorage.
 * Closing/reloading the app resets to the owner context (security).
 *
 * PIN verification is done client-side via SHA-256 hash comparison.
 * This is a UX check only — the DB enforces all actual permission gates.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { OWNER_PERMISSIONS, verifyPin } from './permissions'
import type { PermissionKey, StaffMember, StaffPermissions } from './types'

interface StaffContextValue {
  /** The currently active staff member. null = owner is active. */
  currentStaffMember: StaffMember | null
  /** Full permission set for whoever is currently active. */
  activePermissions: StaffPermissions
  /** Returns true if the current user (owner or staff) has the given permission. */
  canDo: (permission: PermissionKey) => boolean
  /**
   * Switch to a staff member context after verifying their PIN.
   * Returns true on success, false on wrong PIN.
   */
  switchToStaff: (staffMember: StaffMember, pin: string) => Promise<boolean>
  /** Switch back to the owner context. No PIN required. */
  switchToOwner: () => void
}

const StaffContext = createContext<StaffContextValue>({
  currentStaffMember: null,
  activePermissions:  OWNER_PERMISSIONS,
  canDo:              () => true,
  switchToStaff:      async () => false,
  switchToOwner:      () => { /* no-op */ },
})

export function useStaff(): StaffContextValue {
  const ctx = useContext(StaffContext)
  return ctx
}

export function StaffProvider({ children }: { children: ReactNode }) {
  const [currentStaffMember, setCurrentStaffMember] = useState<StaffMember | null>(null)

  const activePermissions: StaffPermissions = useMemo(
    () => currentStaffMember?.permissions ?? OWNER_PERMISSIONS,
    [currentStaffMember]
  )

  const canDo = useCallback(
    (permission: PermissionKey): boolean => {
      // Owner always has full access
      if (!currentStaffMember) return true
      return activePermissions[permission] === true
    },
    [currentStaffMember, activePermissions]
  )

  const switchToStaff = useCallback(
    async (staffMember: StaffMember, pin: string): Promise<boolean> => {
      if (staffMember.status !== 'active') return false
      const ok = await verifyPin(pin, staffMember.pin_hash)
      if (ok) setCurrentStaffMember(staffMember)
      return ok
    },
    []
  )

  const switchToOwner = useCallback(() => {
    setCurrentStaffMember(null)
  }, [])

  const value = useMemo<StaffContextValue>(
    () => ({
      currentStaffMember,
      activePermissions,
      canDo,
      switchToStaff,
      switchToOwner,
    }),
    [currentStaffMember, activePermissions, canDo, switchToStaff, switchToOwner]
  )

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  )
}
