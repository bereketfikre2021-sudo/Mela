/**
 * Subscription data access — Phase 11 Stage 2.
 *
 * Thin wrappers over the shared Supabase anon-key client.
 * All queries are owner-scoped by RLS (owner_id = auth.uid()).
 * The client is null when env vars are not configured; each function
 * returns a clear error in that case.
 */
import { supabase } from '../../lib/supabase'
import type {
  PaymentSubmission,
  PaymentSubmissionInput,
  PlanLimits,
  Subscription,
  SubscriptionPlan,
} from './types'

type Result<T> = Promise<{ data: T; error: null } | { data: null; error: { message: string } }>

function noClient(): { data: null; error: { message: string } } {
  return { data: null, error: { message: 'Supabase is not configured.' } }
}

/**
 * Fetch the subscriptions row for the given owner_id.
 * Returns null data (not error) if no row is found.
 */
export async function getSubscription(ownerId: string): Result<Subscription | null> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as Subscription) ?? null, error: null }
}

/** Fetch the plan_limits row for the given plan. */
export async function getPlanLimits(plan: SubscriptionPlan): Result<PlanLimits> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('plan_limits')
    .select('*')
    .eq('plan', plan)
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as PlanLimits, error: null }
}

/**
 * Fetch payment_submissions for the given owner_id,
 * ordered by submitted_at DESC, limited to 50 rows.
 */
export async function getPaymentHistory(ownerId: string): Result<PaymentSubmission[]> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('payment_submissions')
    .select('*')
    .eq('owner_id', ownerId)
    .order('submitted_at', { ascending: false })
    .limit(50)
  if (error) return { data: null, error: { message: error.message } }
  return { data: (data as PaymentSubmission[]) ?? [], error: null }
}

/** Insert a new payment_submissions row. Sets owner_id from the parameter. */
export async function submitPayment(
  ownerId: string,
  input: PaymentSubmissionInput
): Result<PaymentSubmission> {
  if (!supabase) return noClient()
  const { data, error } = await supabase
    .from('payment_submissions')
    .insert({ ...input, owner_id: ownerId })
    .select('*')
    .single()
  if (error) return { data: null, error: { message: error.message } }
  return { data: data as PaymentSubmission, error: null }
}
