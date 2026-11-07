/**
 * Retail module domain types — Phase 2.1 (product catalogue).
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
