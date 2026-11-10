/**
 * Admin data access — uses both anon-key (for is_admin-gated reads/updates)
 * and service-role (for activate_subscription and direct subscription overrides).
 */
import { supabase } from '../../lib/supabase'
import { adminSupabase } from './adminSupabase'
import type {
  AdminBusiness, AdminPaymentSubmission, AdminPlanLimits,
  AdminStaffMember, AdminSubscription, SiteSetting,
} from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient() { return { data: null, error: { message: 'Supabase not configured' } } as const }

// ── Businesses ────────────────────────────────────────────────────────────────

export async function getAllBusinesses(search?: string): Result<AdminBusiness[]> {
  if (!supabase) return noClient()
  let q = supabase.from('businesses').select('*').order('created_at', { ascending: false }).limit(500)
  if (search) q = q.ilike('name', `%${search}%`)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminBusiness[], error: null }
}

export async function getBusiness(id: string): Result<AdminBusiness> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminBusiness, error: null }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function getAllSubscriptions(): Result<AdminSubscription[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('subscriptions').select('*').order('updated_at', { ascending: false }).limit(500)
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminSubscription[], error: null }
}

export async function getSubscriptionForOwner(ownerId: string): Result<AdminSubscription | null> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('subscriptions').select('*').eq('owner_id', ownerId).maybeSingle()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminSubscription | null, error: null }
}

/** Override subscription plan/status directly — uses service-role client. */
export async function overrideSubscription(
  id: string,
  patch: Partial<Pick<AdminSubscription, 'plan' | 'status' | 'current_period_end' | 'grace_ends_at'>>
): Result<void> {
  if (!adminSupabase) return { data: null, error: { message: 'Service-role client not configured. Set VITE_SUPABASE_SERVICE_ROLE_KEY.' } }
  const { error } = await adminSupabase.from('subscriptions').update(patch).eq('id', id)
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Payment submissions ───────────────────────────────────────────────────────

export async function getAllPaymentSubmissions(
  status?: 'pending' | 'approved' | 'rejected'
): Result<(AdminPaymentSubmission & { business?: AdminBusiness })[]> {
  if (!supabase) return noClient()
  let q = supabase.from('payment_submissions').select('*').order('submitted_at', { ascending: false }).limit(200)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPaymentSubmission[], error: null }
}

export async function getPaymentSubmission(id: string): Result<AdminPaymentSubmission> {
  if (!supabase) return noClient()
  const { data, error } = await supabase.from('payment_submissions').select('*').eq('id', id).single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPaymentSubmission, error: null }
}

/** Approve payment — calls activate_subscription() via service-role. */
export async function approvePayment(submission: AdminPaymentSubmission): Result<void> {
  if (!adminSupabase) return { data: null, error: { message: 'Service-role client not configured.' } }
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

// ── Plan limits ───────────────────────────────────────────────────────────────

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

// ── Site settings ─────────────────────────────────────────────────────────────

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

// ── Staff members ─────────────────────────────────────────────────────────────

export async function getAllStaff(ownerId?: string): Result<AdminStaffMember[]> {
  if (!supabase) return noClient()
  let q = supabase.from('staff_members').select('*').order('created_at', { ascending: false }).limit(500)
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminStaffMember[], error: null }
}

// ── Activity log ──────────────────────────────────────────────────────────────

export async function getActivityLog(ownerId?: string, limit = 100) {
  if (!supabase) return noClient()
  let q = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data ?? [], error: null }
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export async function getDashboardStats() {
  if (!supabase) return noClient()
  const [biz, subs, pending] = await Promise.all([
    supabase.from('businesses').select('id', { count: 'exact', head: true }),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'premium'),
    supabase.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  return {
    data: {
      totalBusinesses: biz.count ?? 0,
      premiumSubscriptions: subs.count ?? 0,
      pendingPayments: pending.count ?? 0,
    },
    error: null,
  }
}
