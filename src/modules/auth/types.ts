/**
 * Auth + business profile domain types for MELA Phase 1.
 *
 * Phase 1 = a single business per owner. Owner details (owner_name, phone) and
 * the language preference live on the business row itself; the owner's email
 * comes from auth.users.
 */

/** The four supported business types (stored as `businesses.type`). */
export type BusinessType = 'retail' | 'fnb' | 'bakery' | 'service'

/** A persisted business profile row. */
export interface Business {
  id: string
  owner_id: string
  name: string
  type: BusinessType
  owner_name: string
  phone: string
  language: 'en' | 'am'
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
}
