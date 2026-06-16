import type { Account, Transaction } from '../types'

export function accountBalance(acc: Account, txs: Transaction[]): number {
  let bal = Number(acc.opening_balance)
  for (const t of txs) {
    const amt = Number(t.amount)
    if (t.type === 'income' && t.account_id === acc.id) bal += amt
    else if (t.type === 'expense' && t.account_id === acc.id) bal -= amt
    else if (t.type === 'transfer') {
      if (t.account_id === acc.id) bal -= amt
      if (t.to_account_id === acc.id) bal += amt
    }
  }
  return bal
}

export function netWorth(accounts: Account[], txs: Transaction[]): number {
  return accounts.filter(a => !a.archived).reduce((s, a) => s + accountBalance(a, txs), 0)
}

/** Cumulative net worth by month (yyyy-MM) from the earliest transaction to now. */
export function netWorthSeries(accounts: Account[], txs: Transaction[]): { month: string; value: number }[] {
  const active = accounts.filter(a => !a.archived)
  const activeIds = new Set(active.map(a => a.id))
  const opening = active.reduce((s, a) => s + Number(a.opening_balance), 0)
  const deltas = new Map<string, number>()
  for (const t of txs) {
    const m = t.date.slice(0, 7)
    let d = 0
    const amt = Number(t.amount)
    if (t.type === 'income' && activeIds.has(t.account_id)) d = amt
    else if (t.type === 'expense' && activeIds.has(t.account_id)) d = -amt
    else if (t.type === 'transfer') {
      if (activeIds.has(t.account_id)) d -= amt
      if (t.to_account_id && activeIds.has(t.to_account_id)) d += amt
    }
    deltas.set(m, (deltas.get(m) || 0) + d)
  }
  const months = [...deltas.keys()].sort()
  if (months.length === 0) {
    const now = new Date().toISOString().slice(0, 7)
    return [{ month: now, value: opening }]
  }
  let acc = opening
  const out: { month: string; value: number }[] = []
  const [sy, sm] = months[0].split('-').map(Number)
  const now = new Date()
  let y = sy, m = sm
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    acc += deltas.get(key) || 0
    out.push({ month: key, value: Math.round(acc * 100) / 100 })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return out
}
