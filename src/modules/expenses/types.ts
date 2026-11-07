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
  | 'other'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'utilities', 'transport', 'supplies',
  'salaries', 'marketing', 'maintenance', 'other',
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
