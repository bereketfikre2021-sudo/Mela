/**
 * Income module types — personal finance.
 */

export type IncomeSource =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'rental'
  | 'gift'
  | 'investment'
  | 'other'

export const INCOME_SOURCES: IncomeSource[] = [
  'salary', 'freelance', 'business', 'rental', 'investment', 'gift', 'other',
]

export interface IncomeEntry {
  id:          string
  owner_id:    string
  source:      IncomeSource
  amount:      number
  note:        string | null
  received_at: string   // ISO timestamptz
  created_at:  string
  updated_at:  string
}

export interface IncomeInput {
  source:      IncomeSource
  amount:      number
  note:        string | null
  received_at: string
}
