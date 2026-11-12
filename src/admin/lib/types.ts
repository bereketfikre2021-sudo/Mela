/** Shared admin-layer types. */

export interface AdminUser {
  id: string
  user_id: string
  email: string
  created_at: string
}

export interface AdminBusiness {
  id: string
  owner_id: string
  name: string
  type: string
  owner_name: string
  phone: string
  language: string
  closing_time: string | null
  created_at: string
  updated_at: string
}

export interface AdminSubscription {
  id: string
  owner_id: string
  plan: 'free' | 'premium'
  status: string
  current_period_start: string | null
  current_period_end: string | null
  grace_ends_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface AdminPaymentSubmission {
  id: string
  owner_id: string
  plan: string
  billing_cycle: string
  amount_etb: number
  payment_method: string
  transaction_reference: string
  screenshot_url: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
  chapa_tx_ref: string | null
  created_at: string
  updated_at: string
}

export interface AdminPlanLimits {
  plan: string
  max_products: number
  max_sales_per_month: number
  max_customers: number
  max_suppliers: number
  max_purchases_per_month: number
  inventory_history_days: number
  advanced_reports: boolean
  max_staff: number
  updated_at: string
}

export interface SiteSetting {
  key: string
  value: string
  updated_at: string
}

export interface AdminStaffMember {
  id: string
  owner_id: string
  business_id: string
  name: string
  role: string
  permissions: Record<string, boolean>
  synthetic_email: string
  auth_user_id: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface AdminActivityLogEntry {
  id: string
  owner_id: string
  business_id: string
  performed_by: string | null
  action_type: string
  reference_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}
