/**
 * Auth + business profile domain types — Phase 9 adds cosmetics and salon.
 */

/** All supported business types (stored as `businesses.type`). */
export type BusinessType = 'retail' | 'fnb' | 'bakery' | 'service' | 'cosmetics' | 'salon'

/** A persisted business profile row. */
export interface Business {
  id: string
  owner_id: string
  name: string
  type: BusinessType
  owner_name: string
  phone: string
  language: 'en' | 'am'
  closing_time: string | null  // HH:MM format, e.g. "18:00"
  created_at: string
  updated_at: string
}

/** The editable subset used when creating or updating a business profile. */
export interface BusinessInput {
  name: string
  type: BusinessType
  owner_name: string
  phone: string
  language: 'en' | 'am'
  closing_time: string | null
}
