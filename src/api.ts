import { demoRows, DEMO_PROFILE } from './lib/demoData'
import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { makeMoneyFmt } from './lib/format'
import { useAuth } from './auth'
import type { Account, Budget, Category, Goal, GoalContribution, Profile, RecurringRule, Split, Transaction } from './types'

export function useUid() {
  const { session } = useAuth()
  return session?.user.id
}

function useTable<T>(table: string, order?: { col: string; asc?: boolean }) {
  const { session, isGuest } = useAuth()
  const uid = session?.user.id

  return useQuery({
    queryKey: [table, isGuest ? 'guest' : uid],
    enabled: Boolean(uid || isGuest),
    queryFn: async () => {
      if (isGuest) {
        return demoRows<T>(table as any)
      }

      let q = supabase.from(table).select('*').eq('user_id', uid)

      if (order) {
        q = q.order(order.col, {
          ascending: order.asc ?? true
        })
      }

      const { data, error } = await q

      if (error) throw error

      return data as T[]
    }
  })
}

export const useAccounts = () => {
  const query = useTable<Account>('accounts', { col: 'created_at' })
  return useMemo(() => ({
    ...query,
    data: query.data ? Array.from(new Map(query.data.map(a => [`${a.type}:${a.name}`, a])).values()) : query.data
  }), [query])
}
export const useCategories = () => {
  const query = useTable<Category>('categories', { col: 'sort' })
  return useMemo(() => ({
    ...query,
    data: query.data ? Array.from(new Map(query.data.map(c => [`${c.kind}:${c.name}`, c])).values()) : query.data
  }), [query])
}
export const useBudgets = () => useTable<Budget>('budgets')
export const useGoals = () => useTable<Goal>('goals', { col: 'created_at' })
export const useGoalContributions = () => useTable<GoalContribution>('goal_contributions', { col: 'date', asc: false })
export const useRecurringRules = () => useTable<RecurringRule>('recurring_rules', { col: 'next_date' })

export function useTransactions() {
  const { session, isGuest } = useAuth()
  const uid = session?.user.id

  return useQuery({
    queryKey: ['transactions', isGuest ? 'guest' : uid],
    enabled: Boolean(uid || isGuest),
    queryFn: async () => {
      if (isGuest) {
        return demoRows<Transaction>('transactions')
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      return data as Transaction[]
    }
  })
}

export function useSplits() {
  const { session, isGuest } = useAuth()
  const uid = session?.user.id

  return useQuery({
    queryKey: ['splits', isGuest ? 'guest' : uid],
    enabled: Boolean(uid || isGuest),
    queryFn: async () => {
      if (isGuest) {
        return demoRows<Split>('splits')
      }

      const { data, error } = await supabase
        .from('splits')
        .select('*, shares:split_shares(*)')
        .eq('user_id', uid)
        .order('date', { ascending: false })

      if (error) throw error

      return data as Split[]
    }
  })
}

export function useProfile() {
  const { session, isGuest } = useAuth()
  const uid = session?.user.id

  return useQuery({
    queryKey: ['profile', isGuest ? 'guest' : uid],
    enabled: Boolean(uid || isGuest),
    queryFn: async () => {
      if (isGuest) {
        return DEMO_PROFILE
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .maybeSingle()

      if (error) throw error

      return data as Profile | null
    }
  })
}

export function useMoneyFmt() {
  const { data: p } = useProfile()
  return useMemo(() => makeMoneyFmt(p?.currency || 'INR', p?.locale || 'en-IN'), [p?.currency, p?.locale])
}

/** Generic save (insert when no id, update when id present) + delete mutations per table. */
function useSave(table: string, keys: string[]) {
  const { session, isGuest, requireAuth } = useAuth()
  const uid = session?.user.id
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      if (isGuest) {
        requireAuth()
        throw new Error('AUTH_REQUIRED')
      }

      if (!uid) {
        throw new Error('No authenticated user')
      }

      const { id, ...rest } = row

      if (id) {
        const { error } = await supabase
          .from(table)
          .update(rest)
          .eq('id', id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from(table)
          .insert({
            ...rest,
            user_id: uid
          })

        if (error) throw error
      }
    },
    onSuccess: () => {
      keys.forEach(key => {
        qc.invalidateQueries({ queryKey: [key] })
      })
    }
  })
}

function useRemove(table: string, keys: string[]) {
  const { isGuest, requireAuth } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        requireAuth()
        throw new Error('AUTH_REQUIRED')
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      keys.forEach(key => {
        qc.invalidateQueries({ queryKey: [key] })
      })
    }
  })
}

export const useSaveAccount = () => useSave('accounts', ['accounts'])
export const useDeleteAccount = () => useRemove('accounts', ['accounts', 'transactions'])
export const useSaveCategory = () => useSave('categories', ['categories'])
export const useDeleteCategory = () => useRemove('categories', ['categories', 'transactions', 'budgets'])
export const useSaveTransaction = () => useSave('transactions', ['transactions'])
export const useDeleteTransaction = () => useRemove('transactions', ['transactions'])
export const useSaveBudget = () => useSave('budgets', ['budgets'])
export const useDeleteBudget = () => useRemove('budgets', ['budgets'])
export const useSaveGoal = () => useSave('goals', ['goals'])
export const useDeleteGoal = () => useRemove('goals', ['goals', 'goal_contributions'])
export const useSaveContribution = () => useSave('goal_contributions', ['goal_contributions'])
export const useDeleteContribution = () => useRemove('goal_contributions', ['goal_contributions'])
export const useSaveRule = () => useSave('recurring_rules', ['recurring_rules'])
export const useDeleteRule = () => useRemove('recurring_rules', ['recurring_rules'])

export function useSaveProfile() {
  const { session, isGuest, requireAuth } = useAuth()
  const uid = session?.user.id
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      if (isGuest) {
        requireAuth()
        throw new Error('AUTH_REQUIRED')
      }

      if (!uid) {
        throw new Error('No authenticated user')
      }

      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', uid)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    }
  })
}

export function useSaveSplit() {
  const { session, isGuest, requireAuth } = useAuth()
  const uid = session?.user.id
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; description: string; total_amount: number; date: string; shares: { person: string; amount: number; settled?: boolean }[] }) => {
      if (isGuest) {
        requireAuth()
        throw new Error('AUTH_REQUIRED')
      }

      if (!uid) {
        throw new Error('No authenticated user')
      }
      let splitId = input.id
      if (splitId) {
        const { error } = await supabase.from('splits').update({ description: input.description, total_amount: input.total_amount, date: input.date }).eq('id', splitId)
        if (error) throw error
        await supabase.from('split_shares').delete().eq('split_id', splitId)
      } else {
        const { data, error } = await supabase.from('splits').insert({ user_id: uid, description: input.description, total_amount: input.total_amount, date: input.date }).select().single()
        if (error || !data) throw error
        splitId = data.id
      }
      const { error: e2 } = await supabase.from('split_shares').insert(
        input.shares.map(s => ({ user_id: uid, split_id: splitId, person: s.person, amount: s.amount, settled: s.settled ?? false }))
      )
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['splits'] })
  })
}

export const useDeleteSplit = () => useRemove('splits', ['splits'])

export function useToggleShareSettled() {
  const { isGuest, requireAuth } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, settled }: { id: string; settled: boolean }) => {
      if (isGuest) {
        requireAuth()
        throw new Error('AUTH_REQUIRED')
      }
      const { error } = await supabase.from('split_shares').update({ settled }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['splits'] })
  })
}
