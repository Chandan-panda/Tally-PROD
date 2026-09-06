import type {
  Account,
  Budget,
  Category,
  Goal,
  GoalContribution,
  Profile,
  RecurringRule,
  Split,
  Transaction
} from '../types'

function dateFromNow(offset: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function datePreviousMonth(day: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(1)
  date.setMonth(date.getMonth() - 1)
  date.setDate(day)
  return date.toISOString().slice(0, 10)
}

export const DEMO_PROFILE: Profile = {
  id: 'demo-profile',
  display_name: 'Demo explorer',
  currency: 'INR',
  locale: 'en-IN',
  theme: 'light',
  first_day_of_week: 1,
  dob: null,
  gender: null
}

export const DEMO_ACCOUNTS: Account[] = [
  {
    id: 'demo-account-bank',
    name: 'Everyday bank',
    type: 'bank',
    opening_balance: 42000,
    icon: '▣',
    color: '#2f7d74',
    archived: false,
    created_at: dateFromNow(-45)
  },
  {
    id: 'demo-account-cash',
    name: 'Cash wallet',
    type: 'cash',
    opening_balance: 6500,
    icon: '◈',
    color: '#d29a43',
    archived: false,
    created_at: dateFromNow(-40)
  },
  {
    id: 'demo-account-card',
    name: 'Credit card',
    type: 'credit_card',
    opening_balance: -12000,
    icon: '▤',
    color: '#c26352',
    archived: false,
    created_at: dateFromNow(-35)
  }
]

export const DEMO_CATEGORIES: Category[] = [
  {
    id: 'demo-category-salary',
    name: 'Salary',
    kind: 'income',
    icon: '↗',
    color: '#2f7d74',
    archived: false,
    sort: 0
  },
  {
    id: 'demo-category-groceries',
    name: 'Groceries',
    kind: 'expense',
    icon: '⌂',
    color: '#79986d',
    archived: false,
    sort: 1
  },
  {
    id: 'demo-category-dining',
    name: 'Dining out',
    kind: 'expense',
    icon: '◌',
    color: '#d2774c',
    archived: false,
    sort: 2
  },
  {
    id: 'demo-category-transport',
    name: 'Transport',
    kind: 'expense',
    icon: '△',
    color: '#5479a1',
    archived: false,
    sort: 3
  },
  {
    id: 'demo-category-shopping',
    name: 'Shopping',
    kind: 'expense',
    icon: '□',
    color: '#aa6d8c',
    archived: false,
    sort: 4
  },
  {
    id: 'demo-category-bills',
    name: 'Bills & utilities',
    kind: 'expense',
    icon: '⌁',
    color: '#b58a39',
    archived: false,
    sort: 5
  }
]

export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tx-salary-current',
    type: 'income',
    amount: 85000,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-salary',
    date: dateFromNow(-5),
    note: 'Monthly salary',
    tags: ['income'],
    created_at: dateFromNow(-5)
  },
  {
    id: 'demo-tx-rent-current',
    type: 'expense',
    amount: 24000,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-bills',
    date: dateFromNow(-4),
    note: 'Apartment rent',
    tags: ['fixed'],
    created_at: dateFromNow(-4)
  },
  {
    id: 'demo-tx-groceries-current',
    type: 'expense',
    amount: 3250,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-groceries',
    date: dateFromNow(-3),
    note: 'Weekly groceries',
    tags: ['home'],
    created_at: dateFromNow(-3)
  },
  {
    id: 'demo-tx-dining-current',
    type: 'expense',
    amount: 1450,
    account_id: 'demo-account-card',
    to_account_id: null,
    category_id: 'demo-category-dining',
    date: dateFromNow(-2),
    note: 'Dinner with friends',
    tags: ['social'],
    created_at: dateFromNow(-2)
  },
  {
    id: 'demo-tx-transport-current',
    type: 'expense',
    amount: 980,
    account_id: 'demo-account-cash',
    to_account_id: null,
    category_id: 'demo-category-transport',
    date: dateFromNow(-1),
    note: 'Metro and cab',
    tags: ['commute'],
    created_at: dateFromNow(-1)
  },
  {
    id: 'demo-tx-shopping-current',
    type: 'expense',
    amount: 4200,
    account_id: 'demo-account-card',
    to_account_id: null,
    category_id: 'demo-category-shopping',
    date: dateFromNow(-7),
    note: 'New running shoes',
    tags: ['health'],
    created_at: dateFromNow(-7)
  },
  {
    id: 'demo-tx-salary-previous',
    type: 'income',
    amount: 85000,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-salary',
    date: datePreviousMonth(5),
    note: 'Monthly salary',
    tags: ['income'],
    created_at: datePreviousMonth(5)
  },
  {
    id: 'demo-tx-groceries-previous',
    type: 'expense',
    amount: 6100,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-groceries',
    date: datePreviousMonth(12),
    note: 'Groceries and supplies',
    tags: ['home'],
    created_at: datePreviousMonth(12)
  },
  {
    id: 'demo-tx-dining-previous',
    type: 'expense',
    amount: 5200,
    account_id: 'demo-account-card',
    to_account_id: null,
    category_id: 'demo-category-dining',
    date: datePreviousMonth(18),
    note: 'Restaurants',
    tags: ['social'],
    created_at: datePreviousMonth(18)
  }
]

export const DEMO_BUDGETS: Budget[] = [
  {
    id: 'demo-budget-groceries',
    category_id: 'demo-category-groceries',
    amount: 9000,
    rollover: false
  },
  {
    id: 'demo-budget-dining',
    category_id: 'demo-category-dining',
    amount: 6000,
    rollover: false
  },
  {
    id: 'demo-budget-transport',
    category_id: 'demo-category-transport',
    amount: 4500,
    rollover: false
  }
]

export const DEMO_GOALS: Goal[] = [
  {
    id: 'demo-goal-travel',
    name: 'Japan trip',
    target_amount: 180000,
    target_date: dateFromNow(160),
    icon: '◇',
    color: '#5479a1',
    created_at: dateFromNow(-30)
  },
  {
    id: 'demo-goal-emergency',
    name: 'Emergency reserve',
    target_amount: 250000,
    target_date: null,
    icon: '✦',
    color: '#2f7d74',
    created_at: dateFromNow(-20)
  }
]

export const DEMO_GOAL_CONTRIBUTIONS: GoalContribution[] = [
  {
    id: 'demo-contribution-travel',
    goal_id: 'demo-goal-travel',
    amount: 65000,
    date: dateFromNow(-12),
    note: 'Monthly contribution'
  },
  {
    id: 'demo-contribution-emergency',
    goal_id: 'demo-goal-emergency',
    amount: 120000,
    date: dateFromNow(-8),
    note: 'Initial reserve'
  }
]

export const DEMO_RECURRING_RULES: RecurringRule[] = [
  {
    id: 'demo-rule-salary',
    type: 'income',
    amount: 85000,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-salary',
    note: 'Monthly salary',
    frequency: 'monthly',
    interval: 1,
    next_date: dateFromNow(18),
    end_date: null,
    auto_post: false,
    active: true
  },
  {
    id: 'demo-rule-rent',
    type: 'expense',
    amount: 24000,
    account_id: 'demo-account-bank',
    to_account_id: null,
    category_id: 'demo-category-bills',
    note: 'Apartment rent',
    frequency: 'monthly',
    interval: 1,
    next_date: dateFromNow(22),
    end_date: null,
    auto_post: false,
    active: true
  }
]

export const DEMO_SPLITS: Split[] = [
  {
    id: 'demo-split-dinner',
    description: 'Dinner with friends',
    total_amount: 4800,
    date: dateFromNow(-6),
    shares: [
      {
        id: 'demo-share-1',
        split_id: 'demo-split-dinner',
        person: 'Aarav',
        amount: 1600,
        settled: true
      },
      {
        id: 'demo-share-2',
        split_id: 'demo-split-dinner',
        person: 'Maya',
        amount: 1600,
        settled: false
      }
    ]
  }
]

const DEMO_TABLES = {
  accounts: DEMO_ACCOUNTS,
  categories: DEMO_CATEGORIES,
  transactions: DEMO_TRANSACTIONS,
  budgets: DEMO_BUDGETS,
  goals: DEMO_GOALS,
  goal_contributions: DEMO_GOAL_CONTRIBUTIONS,
  recurring_rules: DEMO_RECURRING_RULES,
  splits: DEMO_SPLITS
}

export function demoRows<T>(table: keyof typeof DEMO_TABLES) {
  return [...DEMO_TABLES[table]] as T[]
}