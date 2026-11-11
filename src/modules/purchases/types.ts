/** Purchase domain types — Phase 6.3. */

import type { PaymentMethod } from '../retail/types'

export interface PurchaseItem {
  id: string
  purchase_id: string
  product_id: string | null
  product_name: string
  quantity: number
  unit_cost: number
  line_total: number
  created_at: string
}

export interface Purchase {
  id: string
  owner_id: string
  supplier_id: string | null
  supplier_name: string
  purchase_date: string      // ISO date YYYY-MM-DD
  total_cost: number
  amount_paid: number        // F2: amount already paid toward this purchase (0 until migration 0021 is applied)
  notes: string | null
  idempotency_key: string
  created_at: string
  updated_at: string
}

export interface PurchaseWithItems extends Purchase {
  purchase_items: PurchaseItem[]
}

/** One editable row in the purchase form. */
export interface PurchaseLineInput {
  product_id: string
  quantity: string    // string so the input is editable before parsing
  unit_cost: string
}

/** Payload sent to receive_purchase() RPC. */
export interface ReceivePurchasePayload {
  owner_id: string
  supplier_id: string | null
  purchase_date: string
  notes: string | null
  idempotency_key: string
  items: { product_id: string; quantity: number; unit_cost: number }[]
}

// ── Supplier payments (F2) ────────────────────────────────────────────────────

export type PurchasePaymentStatus = 'unpaid' | 'partial' | 'paid'

/** A single cash/bank outflow recorded against a purchase (supplier_payments). */
export interface SupplierPayment {
  id: string
  owner_id: string
  purchase_id: string
  supplier_id: string | null
  supplier_name: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string        // ISO date YYYY-MM-DD
  note: string | null
  idempotency_key: string
  created_at: string
}

/** Payload sent to record_supplier_payment() RPC. */
export interface RecordSupplierPaymentPayload {
  owner_id: string
  purchase_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  note: string | null
  idempotency_key: string
}

/** Result returned by record_supplier_payment(). */
export interface RecordSupplierPaymentResult {
  payment_id: string
  purchase_id: string
  amount_paid: number | null
  balance_due: number | null
  already_exists: boolean
}

/**
 * Derive the payment status from the amounts. Used in the UI so we never store a
 * redundant status column that could drift out of sync. Treats a missing
 * amount_paid (pre-migration rows or an un-applied migration) as 0 / unpaid.
 */
export function purchasePaymentStatus(totalCost: number, amountPaid: number): PurchasePaymentStatus {
  const paid = amountPaid ?? 0
  if (paid <= 0) return 'unpaid'
  if (paid >= totalCost) return 'paid'
  return 'partial'
}
