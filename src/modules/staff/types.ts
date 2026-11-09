/**
 * Staff module types — Phase 12.
 */

export type StaffRole = 'manager' | 'cashier' | 'inventory' | 'accountant'

export type StaffStatus = 'active' | 'deactivated'

/** All permission keys available in the system. */
export type PermissionKey =
  | 'pos'
  | 'cancel_sale'
  | 'manage_products'
  | 'stock_adjustments'
  | 'receive_purchases'
  | 'manage_customers'
  | 'manage_suppliers'
  | 'manage_expenses'
  | 'view_reports'
  | 'manage_staff'
  | 'manage_subscription'
  | 'manage_business_settings'

export type StaffPermissions = Record<PermissionKey, boolean>

export interface StaffMember {
  id:              string
  owner_id:        string
  business_id:     string
  name:            string
  role:            StaffRole
  permissions:     StaffPermissions
  pin_hash:        string
  synthetic_email: string
  auth_user_id:    string | null
  status:          StaffStatus
  created_at:      string
  updated_at:      string
}

export type StaffMemberInput = {
  name:        string
  role:        StaffRole
  pin_hash:    string          // SHA-256 hex, computed client-side
  permissions: StaffPermissions
}

export interface ActivityLogEntry {
  id:           string
  owner_id:     string
  business_id:  string
  performed_by: string | null  // null = owner acted directly
  action_type:
    | 'sale'
    | 'expense'
    | 'stock_adjustment'
    | 'purchase'
    | 'sale_cancellation'
    | 'staff_created'
    | 'staff_deactivated'
    | 'staff_deleted'
  reference_id: string | null
  details:      Record<string, unknown> | null
  created_at:   string
}
