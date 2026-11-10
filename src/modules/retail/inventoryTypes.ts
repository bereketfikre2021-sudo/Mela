/** Inventory movement domain types — Phase 6.2. */

export type MovementType = 'purchase' | 'sale' | 'adjustment' | 'return' | 'damaged'

export const MANUAL_MOVEMENT_TYPES: MovementType[] = ['purchase', 'adjustment', 'return', 'damaged']

export interface InventoryMovement {
  id: string
  owner_id: string
  product_id: string | null
  product_name: string
  movement_type: MovementType
  quantity_change: number
  stock_before: number
  stock_after: number
  reason: string | null
  reference_id: string | null
  created_at: string
}

export interface AdjustStockPayload {
  owner_id: string
  product_id: string
  movement_type: MovementType
  quantity_change: number
  reason: string | null
}
