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
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'telebirr' | 'bank_transfer'
export type PaymentStatus = 'paid' | 'pending' | 'cancelled'

export interface Sale {
  id: string
  owner_id: string
  sale_number: string
  subtotal: number
  total: number
  payment_method: PaymentMethod
  payment_status: PaymentStatus
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
  /** UUID generated once per checkout attempt. Re-sending the same key is safe
   *  — the RPC returns the original result instead of creating a duplicate. */
  idempotency_key: string
  items: { product_id: string; quantity: number }[]
}
