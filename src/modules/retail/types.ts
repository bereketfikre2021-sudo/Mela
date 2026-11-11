/**
 * Retail module domain types — Phase 2.1–2.3 (products + sales).
 */

/** A persisted product row from public.products. */
export interface Product {
  id: string
  owner_id: string
  name: string
  sku: string | null
  selling_price: number
  cost_price: number | null
  stock_quantity: number
  unit: string
  low_stock_threshold: number | null
  image_url: string | null
  barcode: string | null
  created_at: string
  updated_at: string
}

/** Fields accepted when creating or updating a product. */
export interface ProductInput {
  name: string
  sku: string | null
  selling_price: number
  cost_price: number | null
  stock_quantity: number
  unit: string
  low_stock_threshold: number | null
  image_url: string | null
  barcode: string | null
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'telebirr' | 'cbe_birr' | 'bank_transfer'
export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'cancelled'

export interface Sale {
  id: string
  owner_id: string
  sale_number: string
  subtotal: number
  total: number
  amount_paid: number      // F3: cumulative payments received (0 for unpaid)
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  customer_name: string | null
  customer_id: string | null
  notes: string | null
  sold_at: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  unit_cost: number | null   // NULL for sales before migration 0006 or when cost was unknown
  quantity: number
  line_total: number
  created_at: string
}

export interface SaleWithItems extends Sale {
  sale_items: SaleItem[]
}

/** One line in the POS cart. */
export interface CartItem {
  product: Product
  quantity: number
}

/** Payload sent to the complete_sale() RPC. */
export interface CheckoutPayload {
  owner_id: string
  sale_number: string
  payment_method: PaymentMethod
  idempotency_key: string
  items: { product_id: string; quantity: number }[]
  customer_name?: string | null
  customer_id?: string | null
  notes?: string | null
}

// ── Sale payments (F3) ────────────────────────────────────────────────────────

/** A single payment record in the sale_payments ledger. */
export interface SalePayment {
  id: string
  owner_id: string
  sale_id: string
  customer_id: string | null
  customer_name: string | null
  amount: number
  payment_method: PaymentMethod
  payment_date: string   // YYYY-MM-DD
  note: string | null
  idempotency_key: string
  created_at: string
}

export interface RecordSalePaymentPayload {
  owner_id: string
  sale_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  note: string | null
  idempotency_key: string
}

export interface RecordSalePaymentResult {
  payment_id: string
  sale_id: string
  amount_paid: number | null
  balance_due: number | null
  payment_status: PaymentStatus | null
  already_exists: boolean
}

/** Derive payment status from totals. Used when the DB field is unavailable
 *  (e.g. pre-migration rows). Falls back to 'pending' for zero-paid. */
export function salePaymentStatus(total: number, amountPaid: number): PaymentStatus {
  const paid = amountPaid ?? 0
  if (paid >= total) return 'paid'
  if (paid > 0)      return 'partial'
  return 'pending'
}
