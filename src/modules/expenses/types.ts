/**
 * Expense module domain types — Phase 3.1.
 */

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'transport'
  | 'supplies'
  | 'salaries'
  | 'marketing'
  | 'maintenance'
  | 'food_ingredients'
  | 'packaging'
  | 'bank_charges'
  | 'taxes_fees'
  | 'equipment'
  | 'other'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'utilities', 'salaries', 'food_ingredients', 'supplies',
  'transport', 'packaging', 'bank_charges', 'taxes_fees',
  'equipment', 'marketing', 'maintenance', 'other',
]

export interface Expense {
  id: string
  owner_id: string
  title: string
  amount: number
  category: ExpenseCategory
  description: string | null
  expense_date: string   // ISO date string (YYYY-MM-DD)
  created_at: string
  updated_at: string
}

export interface ExpenseInput {
  title: string
  amount: number
  category: ExpenseCategory
  description: string | null
  expense_date: string
}
