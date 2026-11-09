/**
 * Staff API — Phase 12.
 *
 * All DB-mutating operations go through RPCs (SECURITY DEFINER).
 * Staff creation goes through the Edge Function (requires service_role).
 */
import { supabase } from '../../lib/supabase'
import { env } from '../../lib/env'
import type { ActivityLogEntry, StaffMember, StaffMemberInput, StaffPermissions } from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/** List all staff members for the owner, ordered by created_at. */
export async function listStaff(ownerId: string): Result<StaffMember[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as StaffMember[]) ?? [], error: null }
}

/**
 * Create a new staff member via the Edge Function.
 * The Edge Function handles the Supabase Auth account creation (service_role).
 */
export async function createStaffMember(
  ownerId:    string,
  businessId: string,
  input:      StaffMemberInput
): Result<StaffMember> {
  if (!supabase) return noClient()

  // Get the caller's session JWT to pass to the Edge Function
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { data: null, error: { message: 'Not authenticated' } }

  const baseUrl = env.supabaseUrl?.replace(/\/$/, '') ?? ''
  const fnUrl   = `${baseUrl}/functions/v1/create-staff-member`

  try {
    const res = await fetch(fnUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey':        env.supabaseAnonKey ?? '',
      },
      body: JSON.stringify({
        owner_id:    ownerId,
        business_id: businessId,
        name:        input.name,
        role:        input.role,
        pin_hash:    input.pin_hash,
        permissions: input.permissions,
      }),
    })

    const json = await res.json() as { id?: string; staff?: StaffMember; error?: string }

    if (!res.ok) {
      return { data: null, error: { message: json.error ?? 'Failed to create staff member' } }
    }

    return { data: json.staff as StaffMember, error: null }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error'
    return { data: null, error: { message } }
  }
}

/** Update staff permissions via RPC. */
export async function updateStaffPermissions(
  ownerId:     string,
  staffId:     string,
  permissions: StaffPermissions
): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.rpc('update_staff_permissions', {
    p_owner_id:    ownerId,
    p_staff_id:    staffId,
    p_permissions: permissions,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

/** Deactivate a staff member via RPC. */
export async function deactivateStaff(ownerId: string, staffId: string): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.rpc('deactivate_staff', {
    p_owner_id: ownerId,
    p_staff_id: staffId,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

/** Reactivate a deactivated staff member via RPC. */
export async function reactivateStaff(ownerId: string, staffId: string): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.rpc('reactivate_staff', {
    p_owner_id: ownerId,
    p_staff_id: staffId,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

/** Delete a staff member via RPC. */
export async function deleteStaff(ownerId: string, staffId: string): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.rpc('delete_staff', {
    p_owner_id: ownerId,
    p_staff_id: staffId,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

/** Fetch the last N activity log entries for the owner. */
export async function getActivityLog(
  ownerId: string,
  limit = 50
): Result<ActivityLogEntry[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as ActivityLogEntry[]) ?? [], error: null }
}
