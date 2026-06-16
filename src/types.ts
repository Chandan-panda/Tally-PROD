export type AccountType = 'bank' | 'credit_card' | 'upi_wallet' | 'cash' | 'investment' | 'loan'
export type TxType = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Profile {
  id: string
  display_name: string | null
  currency: string
  locale: string
  theme: 'light' | 'dark' | 'system'
  first_day_of_week: number
  dob: string | null
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null
}

export interface Account {
  id: string
  name: string
  type: AccountType
  opening_balance: number
  icon: string
  color: string
  archived: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  icon: string
  color: string
  archived: boolean
  sort: number
}

export interface Transaction {
  id: string
  type: TxType
  amount: number
  account_id: string
  to_account_id: string | null
  category_id: string | null
  date: string
  note: string | null
  tags: string[] | null
  created_at: string
}

export interface Budget {
  id: string
  category_id: string
  amount: number
  rollover: boolean
}

export interface Goal {
  id: string
  name: string
  target_amount: number
  target_date: string | null
  icon: string
  color: string
  created_at: string
}

export interface GoalContribution {
  id: string
  goal_id: string
  amount: number
  date: string
  note: string | null
}

export interface RecurringRule {
  id: string
  type: TxType
  amount: number
  account_id: string
  to_account_id: string | null
  category_id: string | null
  note: string | null
  frequency: Frequency
  interval: number
  next_date: string
  end_date: string | null
  auto_post: boolean
  active: boolean
}

export interface SplitShare {
  id: string
  split_id: string
  person: string
  amount: number
  settled: boolean
}

export interface Split {
  id: string
  description: string
  total_amount: number
  date: string
  shares: SplitShare[]
}

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: string; liability?: boolean }[] = [
  { value: 'bank', label: 'Bank account', icon: '\ud83c\udfe6' },
  { value: 'credit_card', label: 'Credit card', icon: '\ud83d\udcb3', liability: true },
  { value: 'upi_wallet', label: 'UPI / Wallet', icon: '\ud83d\udcf1' },
  { value: 'cash', label: 'Cash', icon: '\ud83d\udcb5' },
  { value: 'investment', label: 'Investment', icon: '\ud83d\udcc8' },
  { value: 'loan', label: 'Loan', icon: '\ud83e\uddfe', liability: true }
]

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD', 'AED', 'CHF']

export const PALETTE = ['#1d6e5a', '#b23f2e', '#b07d2b', '#3a5a8c', '#7c5cad', '#2e7d8c', '#7c9a6d', '#a85d7a', '#5c5346', '#c46a3f']
