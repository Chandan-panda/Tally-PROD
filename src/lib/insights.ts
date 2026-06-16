import type { Category, Transaction } from '../types'

export interface Insight {
  icon: string
  title: string
  body: string
  tone: 'pos' | 'neg' | 'neutral'
}

export function periodTotals(txs: Transaction[]) {
  let income = 0, expense = 0
  for (const t of txs) {
    if (t.type === 'income') income += Number(t.amount)
    else if (t.type === 'expense') expense += Number(t.amount)
  }
  return { income, expense, net: income - expense }
}

export function expenseByCategory(txs: Transaction[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of txs) {
    if (t.type !== 'expense') continue
    const key = t.category_id || 'uncategorized'
    m.set(key, (m.get(key) || 0) + Number(t.amount))
  }
  return m
}

const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n)}%`

export function buildInsights(
  txs: Transaction[],
  prevTxs: Transaction[],
  categories: Category[],
  fmt: (n: number) => string
): Insight[] {
  const out: Insight[] = []
  const cat = (id: string | null) => categories.find(c => c.id === id)
  const cur = periodTotals(txs)
  const prev = periodTotals(prevTxs)

  // Savings rate
  if (cur.income > 0) {
    const rate = Math.round((cur.net / cur.income) * 100)
    out.push({
      icon: rate >= 20 ? '\ud83c\udf31' : '\u2696\ufe0f',
      title: `Savings rate: ${rate}%`,
      body: rate >= 20
        ? `You kept ${fmt(cur.net)} of what you earned. Excellent discipline.`
        : rate >= 0
          ? `You saved ${fmt(cur.net)} this period. Aim for 20%+ of income.`
          : `You spent ${fmt(-cur.net)} more than you earned this period.`,
      tone: rate >= 20 ? 'pos' : rate >= 0 ? 'neutral' : 'neg'
    })
  }

  // Spend vs previous period
  if (prev.expense > 0 && cur.expense > 0) {
    const change = ((cur.expense - prev.expense) / prev.expense) * 100
    if (Math.abs(change) >= 5) {
      out.push({
        icon: change > 0 ? '\ud83d\udcc8' : '\ud83d\udcc9',
        title: `Spending ${change > 0 ? 'up' : 'down'} ${pct(Math.abs(change)).slice(1)}`,
        body: `${fmt(cur.expense)} vs ${fmt(prev.expense)} in the previous period.`,
        tone: change > 0 ? 'neg' : 'pos'
      })
    }
  }

  // Biggest category movement
  const curCat = expenseByCategory(txs)
  const prevCat = expenseByCategory(prevTxs)
  let bestKey = ''
  let bestDelta = 0
  for (const [k, v] of curCat) {
    const p = prevCat.get(k) || 0
    if (p > 0 && Math.abs(v - p) > Math.abs(bestDelta) && Math.abs((v - p) / p) >= 0.2) {
      bestKey = k; bestDelta = v - p
    }
  }
  if (bestKey) {
    const c = cat(bestKey)
    const p = prevCat.get(bestKey) || 0
    const change = ((bestDelta) / p) * 100
    out.push({
      icon: c?.icon || '\ud83c\udff7\ufe0f',
      title: `${c?.name || 'Uncategorized'} ${bestDelta > 0 ? 'up' : 'down'} ${pct(Math.abs(change)).slice(1)}`,
      body: `${fmt(curCat.get(bestKey)!)} this period vs ${fmt(p)} last period.`,
      tone: bestDelta > 0 ? 'neg' : 'pos'
    })
  }

  // Top category share
  if (cur.expense > 0 && curCat.size > 0) {
    const [topId, topAmt] = [...curCat.entries()].sort((a, b) => b[1] - a[1])[0]
    const c = cat(topId)
    out.push({
      icon: c?.icon || '\ud83c\udff7\ufe0f',
      title: `${c?.name || 'Uncategorized'} leads your spending`,
      body: `${fmt(topAmt)} — ${Math.round((topAmt / cur.expense) * 100)}% of everything you spent.`,
      tone: 'neutral'
    })
  }

  // Biggest single expense
  const expenses = txs.filter(t => t.type === 'expense')
  if (expenses.length) {
    const big = expenses.reduce((a, b) => (Number(a.amount) > Number(b.amount) ? a : b))
    out.push({
      icon: '\ud83e\udde8',
      title: 'Largest single expense',
      body: `${fmt(Number(big.amount))}${big.note ? ` — ${big.note}` : ''} on ${big.date}.`,
      tone: 'neutral'
    })
  }

  // Anomalous spending days (mean + 2σ)
  const byDay = new Map<string, number>()
  for (const t of expenses) byDay.set(t.date, (byDay.get(t.date) || 0) + Number(t.amount))
  if (byDay.size >= 7) {
    const vals = [...byDay.values()]
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length)
    const anomalies = [...byDay.entries()].filter(([, v]) => v > mean + 2 * sd).sort((a, b) => b[1] - a[1])
    if (anomalies.length) {
      out.push({
        icon: '\u26a1',
        title: `${anomalies.length} unusual spending ${anomalies.length === 1 ? 'day' : 'days'}`,
        body: `Highest: ${fmt(anomalies[0][1])} on ${anomalies[0][0]} — well above your daily average of ${fmt(mean)}.`,
        tone: 'neg'
      })
    }
  }

  // No-spend days
  if (byDay.size > 0 && txs.length > 0) {
    const dates = txs.map(t => t.date).sort()
    const span = Math.max(1, (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / 86400000 + 1)
    const noSpend = Math.round(span) - byDay.size
    if (noSpend > 0) {
      out.push({
        icon: '\ud83e\udd0d',
        title: `${noSpend} no-spend ${noSpend === 1 ? 'day' : 'days'}`,
        body: `Out of ${Math.round(span)} days in this period. Average daily spend: ${fmt(cur.expense / span)}.`,
        tone: 'pos'
      })
    }
  }

  return out
}
