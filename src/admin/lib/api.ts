/**
 * Admin data access.
 *
 * ALL cross-owner reads use adminSupabase (service-role key) which bypasses
 * RLS entirely. The anon-key supabase client is only used for:
 *   - is_admin() check (via admin_users SELECT policy)
 *   - site_settings / plan_limits reads (open to all authenticated)
 *   - reject_payment_submission() RPC (is_admin-gated)
 *
 * This separation prevents the admin's identity from leaking into the
 * customer-facing app — the customer app uses the anon client which now
 * has no admin bypass policies on any customer-data table.
 */
import { supabase } from '../../lib/supabase'
import { adminSupabase } from './adminSupabase'
import type {
  AdminBusiness, AdminPaymentSubmission, AdminPlanLimits,
  AdminStaffMember, AdminSubscription, SiteSetting,
} from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient()      { return { data: null, error: { message: 'Supabase not configured' } } as const }
function noAdminClient() { return { data: null, error: { message: 'Service-role key not configured. Set VITE_SUPABASE_SERVICE_ROLE_KEY.' } } as const }

// ── Businesses (service-role reads) ───────────────────────────────────────────

export async function getAllBusinesses(search?: string): Result<AdminBusiness[]> {
  if (!adminSupabase) return noAdminClient()
  let q = adminSupabase.from('businesses').select('*').order('created_at', { ascending: false }).limit(500)
  if (search) q = q.ilike('name', `%${search}%`)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminBusiness[], error: null }
}

export async function getBusiness(ownerId: string): Result<AdminBusiness> {
  if (!adminSupabase) return noAdminClient()
  const { data, error } = await adminSupabase.from('businesses').select('*').eq('owner_id', ownerId).single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminBusiness, error: null }
}

// ── Subscriptions (service-role reads) ───────────────────────────────────────

export async function getAllSubscriptions(): Result<AdminSubscription[]> {
  if (!adminSupabase) return noAdminClient()
  const { data, error } = await adminSupabase
    .from('subscriptions').select('*').order('updated_at', { ascending: false }).limit(500)
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminSubscription[], error: null }
}

export async function getSubscriptionForOwner(ownerId: string): Result<AdminSubscription | null> {
  if (!adminSupabase) return noAdminClient()
  const { data, error } = await adminSupabase
    .from('subscriptions').select('*').eq('owner_id', ownerId).maybeSingle()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminSubscription | null, error: null }
}

export async function overrideSubscription(
  id: string,
  patch: Partial<Pick<AdminSubscription, 'plan' | 'status' | 'current_period_end' | 'grace_ends_at'>>
): Result<void> {
  if (!adminSupabase) return noAdminClient()
  const { error } = await adminSupabase.from('subscriptions').update(patch).eq('id', id)
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Payment submissions (service-role reads) ──────────────────────────────────

export async function getAllPaymentSubmissions(
  status?: 'pending' | 'approved' | 'rejected'
): Result<AdminPaymentSubmission[]> {
  if (!adminSupabase) return noAdminClient()
  let q = adminSupabase.from('payment_submissions').select('*').order('submitted_at', { ascending: false }).limit(200)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPaymentSubmission[], error: null }
}

export async function getPaymentSubmission(id: string): Result<AdminPaymentSubmission> {
  if (!adminSupabase) return noAdminClient()
  const { data, error } = await adminSupabase.from('payment_submissions').select('*').eq('id', id).single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPaymentSubmission, error: null }
}

export async function approvePayment(submission: AdminPaymentSubmission): Result<void> {
  if (!adminSupabase) return noAdminClient()
  const { error } = await adminSupabase.rpc('activate_subscription', {
    p_owner_id:              submission.owner_id,
    p_plan:                  submission.plan,
    p_billing_cycle:         submission.billing_cycle,
    p_payment_submission_id: submission.id,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

/** Reject payment — uses is_admin-gated RPC via anon client. */
export async function rejectPayment(id: string, notes?: string): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.rpc('reject_payment_submission', {
    p_submission_id:  id,
    p_reviewer_notes: notes ?? null,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Plan limits (anon client — open read policy for all authenticated) ────────

export async function getPlanLimits(): Result<AdminPlanLimits[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.from('plan_limits').select('*').order('plan')
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPlanLimits[], error: null }
}

export async function updatePlanLimits(
  plan: string,
  patch: Partial<Omit<AdminPlanLimits, 'plan' | 'updated_at'>>
): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.from('plan_limits').update(patch).eq('plan', plan)
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Site settings (anon client — open read, is_admin-gated write) ─────────────

export async function getSiteSettings(): Result<SiteSetting[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.from('site_settings').select('*').order('key')
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as SiteSetting[], error: null }
}

export async function updateSiteSetting(key: string, value: string): Result<void> {
  if (!supabase) return noClient()
  const { error } = await supabase.from('site_settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Staff members (service-role reads) ───────────────────────────────────────

export async function getAllStaff(ownerId?: string): Result<AdminStaffMember[]> {
  if (!adminSupabase) return noAdminClient()
  let q = adminSupabase.from('staff_members').select('*').order('created_at', { ascending: false }).limit(500)
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminStaffMember[], error: null }
}

// ── Activity log (service-role reads) ────────────────────────────────────────

export async function getActivityLog(ownerId?: string, limit = 100) {
  if (!adminSupabase) return noAdminClient()
  let q = adminSupabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data ?? [], error: null }
}

// ── Dashboard stats (service-role reads) ─────────────────────────────────────

export async function getDashboardStats() {
  if (!adminSupabase) return noAdminClient()
  const [biz, subs, pending] = await Promise.all([
    adminSupabase.from('businesses').select('id', { count: 'exact', head: true }),
    adminSupabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'premium'),
    adminSupabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return {
    data: {
      totalBusinesses:      biz.count     ?? 0,
      premiumSubscriptions: subs.count    ?? 0,
      pendingPayments:      pending.count ?? 0,
    },
    error: null,
  }
}
