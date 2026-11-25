/**
 * Auth + business profile domain types.
 */

/** All supported business types (stored as `businesses.type`). */
export type BusinessType = 'retail' | 'fnb' | 'fastfood' | 'bakery' | 'service' | 'cosmetics' | 'salon' | 'baltina' | 'personal'

/** A persisted business profile row. */
export interface Business {
  id: string
  owner_id: string
  name: string
  type: BusinessType
  owner_name: string
  phone: string
  language: 'en' | 'am'
  closing_time: string | null
  avatar_url: string | null
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
  avatar_url?: string | null
}

/** Cloud-synced user profile – tracks which business is currently active. */
export interface UserProfile {
  user_id: string
  active_business_id: string | null
  created_at: string
  updated_at: string
}
