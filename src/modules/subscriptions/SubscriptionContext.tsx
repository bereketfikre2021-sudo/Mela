/**
 * SubscriptionContext — Phase 11 Stage 2.
 *
 * Provides plan entitlements and usage-based can* helpers to the whole app.
 * The DB enforces limits atomically; these helpers are UI-only feedback.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { getPlanLimits, getSubscription } from './api'
import type { PlanLimits, SubscriptionPlan, SubscriptionStatus } from './types'

// ── Usage counts ──────────────────────────────────────────────────────────────

interface UsageCounts {
  products: number
  customers: number
  suppliers: number
  salesThisMonth: number
  purchasesThisMonth: number
}

const DEFAULT_USAGE: UsageCounts = {
  products: 0,
  customers: 0,
  suppliers: 0,
  salesThisMonth: 0,
  purchasesThisMonth: 0,
}

// ── Context value ─────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  plan: SubscriptionPlan
  status: SubscriptionStatus | null
  isActive: boolean
  limits: PlanLimits | null
  loading: boolean
  refresh: () => Promise<void>
  canAddProduct: () => boolean
  canAddCustomer: () => boolean
  canAddSupplier: () => boolean
  canAddSaleThisMonth: () => boolean
  canAddPurchaseThisMonth: () => boolean
  hasAdvancedReports: boolean
}

const SAFE_DEFAULTS: SubscriptionContextValue = {
  plan: 'free',
  status: null,
  isActive: false,
  limits: null,
  loading: false,
  refresh: async () => { /* no-op */ },
  canAddProduct: () => true,
  canAddCustomer: () => true,
  canAddSupplier: () => true,
  canAddSaleThisMonth: () => true,
  canAddPurchaseThisMonth: () => true,
  hasAdvancedReports: false,
}

const SubscriptionContext = createContext<SubscriptionContextValue>(SAFE_DEFAULTS)

export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** ISO string for midnight on the first day of the current month (UTC). */
function startOfCurrentMonth(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** ISO string for midnight on the first day of the next month (UTC). */
function endOfCurrentMonth(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
}

/** Fetch a simple count for a table. Returns 0 on error (optimistic). */
async function fetchTableCount(table: string): Promise<number> {
  if (!supabase) return 0
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
  return count ?? 0
}

/**
 * Fetch a count for rows in a table filtered to the current calendar month.
 * Returns 0 on error (optimistic).
 */
async function fetchMonthlyCount(
  table: string,
  startOfMonth: string,
  endOfMonth: string
): Promise<number> {
  if (!supabase) return 0
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfMonth)
    .lt('created_at', endOfMonth)
  return count ?? 0
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()

  const [plan, setPlan] = useState<SubscriptionPlan>('free')
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [usage, setUsage] = useState<UsageCounts>(DEFAULT_USAGE)
  const [loading, setLoading] = useState(false)

  // If supabase is not configured, bail out with safe defaults immediately.
  if (!supabase) {
    return (
      <SubscriptionContext.Provider value={SAFE_DEFAULTS}>
        {children}
      </SubscriptionContext.Provider>
    )
  }

  const load = useCallback(async (userId: string) => {
    setLoading(true)
    try {
      // 1. Fetch subscription row (may be null for free users)
      const { data: sub, error: subErr } = await getSubscription(userId)
      if (subErr) {
        // Failed to fetch — fall back to free defaults
        setPlan('free')
        setStatus(null)
        setLimits(null)
        setUsage(DEFAULT_USAGE)
        return
      }

      const resolvedPlan: SubscriptionPlan = sub?.plan ?? 'free'
      const resolvedStatus: SubscriptionStatus | null = sub?.status ?? null

      setPlan(resolvedPlan)
      setStatus(resolvedStatus)

      // 2. Fetch plan limits
      const { data: planData } = await getPlanLimits(resolvedPlan)
      setLimits(planData)

      // 3. Fetch usage counts
      const startOfMonth = startOfCurrentMonth()
      const endOfMonth = endOfCurrentMonth()

      const [products, customers, suppliers, salesThisMonth, purchasesThisMonth] =
        await Promise.all([
          fetchTableCount('products'),
          fetchTableCount('customers'),
          fetchTableCount('suppliers'),
          fetchMonthlyCount('sales', startOfMonth, endOfMonth),
          fetchMonthlyCount('purchases', startOfMonth, endOfMonth),
        ])

      setUsage({ products, customers, suppliers, salesThisMonth, purchasesThisMonth })
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount and whenever the authenticated user changes
  useEffect(() => {
    if (authStatus === 'authenticated' && user) {
      void load(user.id)
    } else if (authStatus === 'unauthenticated') {
      // Reset to defaults when signed out
      setPlan('free')
      setStatus(null)
      setLimits(null)
      setUsage(DEFAULT_USAGE)
      setLoading(false)
    }
  }, [authStatus, user, load])

  const refresh = useCallback(async () => {
    if (user) await load(user.id)
  }, [user, load])

  // isActive: premium AND in an access-granting status
  const isActive = plan === 'premium' && (status === 'active' || status === 'grace')

  // can* helpers: optimistic (return true) when limits not yet loaded
  const canAddProduct = useCallback((): boolean => {
    if (!limits) return true
    return usage.products < limits.max_products
  }, [limits, usage.products])

  const canAddCustomer = useCallback((): boolean => {
    if (!limits) return true
    return usage.customers < limits.max_customers
  }, [limits, usage.customers])

  const canAddSupplier = useCallback((): boolean => {
    if (!limits) return true
    return usage.suppliers < limits.max_suppliers
  }, [limits, usage.suppliers])

  const canAddSaleThisMonth = useCallback((): boolean => {
    if (!limits) return true
    return usage.salesThisMonth < limits.max_sales_per_month
  }, [limits, usage.salesThisMonth])

  const canAddPurchaseThisMonth = useCallback((): boolean => {
    if (!limits) return true
    return usage.purchasesThisMonth < limits.max_purchases_per_month
  }, [limits, usage.purchasesThisMonth])

  const hasAdvancedReports = limits?.advanced_reports ?? false

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      plan,
      status,
      isActive,
      limits,
      loading,
      refresh,
      canAddProduct,
      canAddCustomer,
      canAddSupplier,
      canAddSaleThisMonth,
      canAddPurchaseThisMonth,
      hasAdvancedReports,
    }),
    [
      plan,
      status,
      isActive,
      limits,
      loading,
      refresh,
      canAddProduct,
      canAddCustomer,
      canAddSupplier,
      canAddSaleThisMonth,
      canAddPurchaseThisMonth,
      hasAdvancedReports,
    ]
  )

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}
