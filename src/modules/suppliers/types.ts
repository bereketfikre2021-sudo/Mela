/** Supplier domain types — Phase 6.1. */

export interface Supplier {
  id: string
  owner_id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SupplierInput {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
}
