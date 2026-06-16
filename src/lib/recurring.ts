import { addDays, addMonths, addWeeks, addYears, format, parseISO } from 'date-fns'
import { supabase } from './supabase'
import type { RecurringRule } from '../types'

export function advance(date: string, freq: RecurringRule['frequency'], interval: number): string {
  const d = parseISO(date)
  const next =
    freq === 'daily' ? addDays(d, interval)
    : freq === 'weekly' ? addWeeks(d, interval)
    : freq === 'monthly' ? addMonths(d, interval)
    : addYears(d, interval)
  return format(next, 'yyyy-MM-dd')
}

/** Posts all due occurrences of active auto-post rules and rolls next_date forward. */
export async function materializeDueRules(uid: string, rules: RecurringRule[]): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd')
  let posted = 0
  for (const rule of rules) {
    if (!rule.active) continue
    let next = rule.next_date
    const txs: Record<string, unknown>[] = []
    let guard = 0
    while (next <= today && (!rule.end_date || next <= rule.end_date) && guard < 366) {
      if (rule.auto_post) {
        txs.push({
          user_id: uid, type: rule.type, amount: rule.amount, account_id: rule.account_id,
          to_account_id: rule.to_account_id, category_id: rule.category_id, date: next, note: rule.note
        })
      }
      next = advance(next, rule.frequency, rule.interval)
      guard++
    }
    if (next !== rule.next_date && rule.auto_post) {
      if (txs.length) {
        const { error } = await supabase.from('transactions').insert(txs)
        if (!error) posted += txs.length
      }
      await supabase.from('recurring_rules').update({ next_date: next }).eq('id', rule.id)
    }
  }
  return posted
}

export function upcomingOccurrences(rules: RecurringRule[], days = 30): { rule: RecurringRule; date: string }[] {
  const horizon = format(addDays(new Date(), days), 'yyyy-MM-dd')
  const out: { rule: RecurringRule; date: string }[] = []
  for (const rule of rules) {
    if (!rule.active) continue
    let next = rule.next_date
    let guard = 0
    while (next <= horizon && (!rule.end_date || next <= rule.end_date) && guard < 60) {
      out.push({ rule, date: next })
      next = advance(next, rule.frequency, rule.interval)
      guard++
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
