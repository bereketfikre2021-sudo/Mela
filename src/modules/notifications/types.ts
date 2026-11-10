/**
 * In-app notification types — Phase 14.
 */

export type NotificationKind =
  | 'daily_summary'   // End-of-day sales/expense summary
  | 'low_stock'       // Product below threshold
  | 'pending_payment' // Outstanding payments
  | 'activity'        // General activity (staff action, etc.)

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  read: boolean
  created_at: number   // Date.now()
  data?: Record<string, unknown>  // optional payload (e.g. sale id)
}
