/**
 * Admin data access.
 *
 * ALL queries go through adminSupabase — a separate client instance that
 * sends `x-admin-client: true` header. The RLS is_admin() policies check
 * this header, so admin SELECT policies NEVER fire when the same user is
 * browsing the customer-facing app (which uses the shared `supabase` client
 * without the header).
 *
 * This is the correct fix for the data-leak issue where an admin user saw
 * all customers' data in the customer app.
 */
import { adminSupabase as db } from './adminSupabase'
import type {
  AdminBusiness, AdminPaymentSubmission, AdminPlanLimits,
  AdminStaffMember, AdminSubscription, SiteSetting,
} from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient() { return { data: null, error: { message: 'Supabase not configured' } } as const }

// ── Businesses ────────────────────────────────────────────────────────────────

export async function getAllBusinesses(search?: string): Result<AdminBusiness[]> {
  if (!db) return noClient()
  let q = db.from('businesses').select('*').order('created_at', { ascending: false }).limit(500)
  if (search) q = q.ilike('name', `%${search}%`)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminBusiness[], error: null }
}

export async function getBusiness(ownerId: string): Result<AdminBusiness> {
  if (!db) return noClient()
  const { data, error } = await db.from('businesses').select('*').eq('owner_id', ownerId).single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminBusiness, error: null }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export async function getAllSubscriptions(): Result<AdminSubscription[]> {
  if (!db) return noClient()
  const { data, error } = await db
    .from('subscriptions').select('*').order('updated_at', { ascending: false }).limit(500)
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminSubscription[], error: null }
}

export async function getSubscriptionForOwner(ownerId: string): Result<AdminSubscription | null> {
  if (!db) return noClient()
  const { data, error } = await db
    .from('subscriptions').select('*').eq('owner_id', ownerId).maybeSingle()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminSubscription | null, error: null }
}

export async function overrideSubscription(
  id: string,
  patch: Partial<Pick<AdminSubscription, 'plan' | 'status' | 'current_period_end' | 'grace_ends_at'>>
): Result<void> {
  if (!db) return noClient()
  const { error } = await db.from('subscriptions').update(patch).eq('id', id)
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Payment submissions ───────────────────────────────────────────────────────

export async function getAllPaymentSubmissions(
  status?: 'pending' | 'approved' | 'rejected'
): Result<AdminPaymentSubmission[]> {
  if (!db) return noClient()
  let q = db.from('payment_submissions').select('*').order('submitted_at', { ascending: false }).limit(200)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPaymentSubmission[], error: null }
}

export async function getPaymentSubmission(id: string): Result<AdminPaymentSubmission> {
  if (!db) return noClient()
  const { data, error } = await db.from('payment_submissions').select('*').eq('id', id).single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPaymentSubmission, error: null }
}

export async function approvePayment(submission: AdminPaymentSubmission): Result<void> {
  if (!db) return noClient()
  const { error } = await db.rpc('activate_subscription', {
    p_owner_id:              submission.owner_id,
    p_plan:                  submission.plan,
    p_billing_cycle:         submission.billing_cycle,
    p_payment_submission_id: submission.id,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

export async function rejectPayment(id: string, notes?: string): Result<void> {
  if (!db) return noClient()
  const { error } = await db.rpc('reject_payment_submission', {
    p_submission_id:  id,
    p_reviewer_notes: notes ?? null,
  })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Plan limits ───────────────────────────────────────────────────────────────

export async function getPlanLimits(): Result<AdminPlanLimits[]> {
  if (!db) return noClient()
  const { data, error } = await db.from('plan_limits').select('*').order('plan')
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminPlanLimits[], error: null }
}

export async function updatePlanLimits(
  plan: string,
  patch: Partial<Omit<AdminPlanLimits, 'plan' | 'updated_at'>>
): Result<void> {
  if (!db) return noClient()
  const { error } = await db.from('plan_limits').update(patch).eq('plan', plan)
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Site settings ─────────────────────────────────────────────────────────────

export async function getSiteSettings(): Result<SiteSetting[]> {
  if (!db) return noClient()
  const { data, error } = await db.from('site_settings').select('*').order('key')
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as SiteSetting[], error: null }
}

export async function updateSiteSetting(key: string, value: string): Result<void> {
  if (!db) return noClient()
  const { error } = await db
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return { data: null, error: { message: error.message } }
  return { data: undefined, error: null }
}

// ── Staff members ─────────────────────────────────────────────────────────────

export async function getAllStaff(ownerId?: string): Result<AdminStaffMember[]> {
  if (!db) return noClient()
  let q = db.from('staff_members').select('*').order('created_at', { ascending: false }).limit(500)
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as AdminStaffMember[], error: null }
}

// ── Activity log ──────────────────────────────────────────────────────────────

export async function getActivityLog(ownerId?: string, limit = 100) {
  if (!db) return noClient()
  let q = db.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
  if (ownerId) q = q.eq('owner_id', ownerId)
  const { data, error } = await q
  if (error) return { data: null, error: { message: error.message } }
  return { data: data ?? [], error: null }
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

export async function getDashboardStats() {
  if (!db) return noClient()
  const [biz, subs, pending] = await Promise.all([
    db.from('businesses').select('id', { count: 'exact', head: true }),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'premium'),
    db.from('payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
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
