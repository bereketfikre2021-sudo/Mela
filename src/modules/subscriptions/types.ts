/**
 * Subscription types — Phase 11 Stage 2.
 */

export type SubscriptionPlan = 'free' | 'premium'

export type SubscriptionStatus =
  | 'active'
  | 'pending_payment'
  | 'grace'
  | 'expired'
  | 'cancelled'

export interface Subscription {
  id: string
  owner_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  grace_ends_at: string | null
  cancelled_at: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface PlanLimits {
  plan: SubscriptionPlan
  max_products: number
  max_sales_per_month: number
  max_customers: number
  max_suppliers: number
  max_purchases_per_month: number
  inventory_history_days: number
  advanced_reports: boolean
  updated_at: string
}

export interface PaymentSubmission {
  id: string
  owner_id: string
  plan: 'premium'
  billing_cycle: 'monthly' | 'yearly'
  amount_etb: number
  payment_method: 'telebirr' | 'cbe_birr' | 'bank_transfer'
  transaction_reference: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewer_notes: string | null
  chapa_tx_ref: string | null
  created_at: string
  updated_at: string
}

export interface PaymentSubmissionInput {
  plan: 'premium'
  billing_cycle: 'monthly' | 'yearly'
  amount_etb: number
  payment_method: 'telebirr' | 'cbe_birr' | 'bank_transfer'
  transaction_reference: string
}
