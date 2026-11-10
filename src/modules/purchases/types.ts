/** Purchase domain types — Phase 6.3. */

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
