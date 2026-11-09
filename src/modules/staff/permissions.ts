/**
 * Role permission presets and helpers — Phase 12.
 *
 * Role presets are the defaults when creating a new staff member.
 * Owners can override any individual permission toggle.
 */
import type { PermissionKey, StaffPermissions, StaffRole } from './types'

/** All permission keys in display order. */
export const ALL_PERMISSIONS: PermissionKey[] = [
  'pos',
  'cancel_sale',
  'manage_products',
  'stock_adjustments',
  'receive_purchases',
  'manage_customers',
  'manage_suppliers',
  'manage_expenses',
  'view_reports',
  'manage_staff',
  'manage_subscription',
  'manage_business_settings',
]

/** Deny-all template — used as the base for unknown roles. */
const DENY_ALL: StaffPermissions = {
  pos:                      false,
  cancel_sale:              false,
  manage_products:          false,
  stock_adjustments:        false,
  receive_purchases:        false,
  manage_customers:         false,
  manage_suppliers:         false,
  manage_expenses:          false,
  view_reports:             false,
  manage_staff:             false,
  manage_subscription:      false,
  manage_business_settings: false,
}

/** Role permission presets. Keys map to DB get_default_permissions() result. */
export const ROLE_DEFAULTS: Record<StaffRole, StaffPermissions> = {
  manager: {
    ...DENY_ALL,
    pos:               true,
    cancel_sale:       true,
    manage_products:   true,
    stock_adjustments: true,
    receive_purchases: true,
    manage_customers:  true,
    manage_suppliers:  true,
    manage_expenses:   true,
    view_reports:      true,
  },
  cashier: {
    ...DENY_ALL,
    pos:              true,
    manage_customers: true,
  },
  inventory: {
    ...DENY_ALL,
    manage_products:   true,
    stock_adjustments: true,
    receive_purchases: true,
    manage_suppliers:  true,
  },
  accountant: {
    ...DENY_ALL,
    manage_expenses: true,
    view_reports:    true,
  },
}

export function getDefaultPermissions(role: StaffRole): StaffPermissions {
  return { ...ROLE_DEFAULTS[role] }
}

/** Owner always has all permissions. */
export const OWNER_PERMISSIONS: StaffPermissions = {
  pos:                      true,
  cancel_sale:              true,
  manage_products:          true,
  stock_adjustments:        true,
  receive_purchases:        true,
  manage_customers:         true,
  manage_suppliers:         true,
  manage_expenses:          true,
  view_reports:             true,
  manage_staff:             true,
  manage_subscription:      true,
  manage_business_settings: true,
}

/**
 * Compute SHA-256 hex of a string using the Web Crypto API.
 * Used to hash the 4-digit PIN before sending to the server.
 * NOTE: SHA-256 is used because bcrypt is unavailable in browsers.
 * The Edge Function receives only the hash — the plain PIN never leaves the device.
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data    = encoder.encode(pin)
  const buffer  = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify a PIN by hashing and comparing to the stored hash.
 * Returns true if they match.
 */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const hash = await hashPin(pin)
  return hash === storedHash
}
