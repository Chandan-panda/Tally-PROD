import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, subMonths } from 'date-fns'
import { useAccounts, useBudgets, useCategories, useMoneyFmt, useProfile, useRecurringRules, useTransactions } from '../api'
import TransactionForm from '../components/TransactionForm'
import TxRow from '../components/TxRow'
import { Button, Card, EmptyState, Money, Progress, Skeleton, cls } from '../components/ui'

import { buildInsights, periodTotals } from '../lib/insights'
import { upcomingOccurrences } from '../lib/recurring'
import { useUI } from '../store'
import type { Transaction } from '../types'

export default function Dashboard() {
  const { isLoading: la } = useAccounts()
  const { data: txs = [], isLoading: lt } = useTransactions()
  const { data: categories = [] } = useCategories()
  const { data: budgets = [] } = useBudgets()
  const { data: rules = [] } = useRecurringRules()
  const { data: profile } = useProfile()
  const fmt = useMoneyFmt()
  const setTxFormOpen = useUI(s => s.setTxFormOpen)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const monthKey = format(new Date(), 'yyyy-MM')
  const prevKey = format(subMonths(new Date(), 1), 'yyyy-MM')
  const monthTxs = useMemo(() => txs.filter(t => t.date.startsWith(monthKey)), [txs, monthKey])
  const prevTxs = useMemo(() => txs.filter(t => t.date.startsWith(prevKey)), [txs, prevKey])
  const totals = periodTotals(monthTxs)
  const insights = useMemo(() => buildInsights(monthTxs, prevTxs, categories, fmt).slice(0, 2), [monthTxs, prevTxs, categories, fmt])
  const upcoming = useMemo(() => upcomingOccurrences(rules, 14).slice(0, 4), [rules])

  const budgetRows = useMemo(() => {
    return budgets.map(b => {
      const cat = categories.find(c => c.id === b.category_id)
      const spent = monthTxs.filter(t => t.type === 'expense' && t.category_id === b.category_id).reduce((s, t) => s + Number(t.amount), 0)
      return { b, cat, spent, usage: spent / Number(b.amount) }
    }).sort((a, b) => b.usage - a.usage).slice(0, 3)
  }, [budgets, categories, monthTxs])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (la || lt) {
    return <div className="space-y-4"><Skeleton className="h-40" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
  }

  return (
    <div className="rise space-y-6">
      <header>
        <p className="text-sm text-soft">{greeting}{profile?.display_name ? `, ${profile.display_name}` : ''} · {format(new Date(), 'EEEE, d MMMM')}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Your money at a glance</h1>
      </header>

      {/* Saved hero */}
      <Card className="bg-accent text-black dark:text-white border-transparent">
        <p className="text-xs font-semibold uppercase tracking-widest text-black/60 dark:text-white/60">Saved this month</p>
        <p className="mt-1 font-display text-5xl font-semibold tabular-nums"><Money n={totals.net} /></p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-black/15 dark:border-white/15 pt-4 text-sm">
          <div><p className="text-black/60 dark:text-white/60 text-xs">Income (month)</p><p className="font-semibold tabular-nums"><Money n={totals.income} /></p></div>
          <div><p className="text-black/60 dark:text-white/60 text-xs">Spent (month)</p><p className="font-semibold tabular-nums"><Money n={totals.expense} /></p></div>
        </div>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((ins, i) => (
            <Card key={i} className={cls(ins.tone === 'neg' && 'border-neg/30', ins.tone === 'pos' && 'border-accent/30')}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{ins.icon}</span>
                <div><p className="text-sm font-semibold">{ins.title}</p><p className="mt-0.5 text-sm text-soft">{ins.body}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent activity</h2>
            <Link to="/transactions" className="text-sm text-accent hover:underline">See all</Link>
          </div>
          {txs.length === 0 ? (
            <EmptyState icon="✍️" title="No transactions yet" body="Log your first income or expense to bring Tally to life." action={<Button onClick={() => setTxFormOpen(true)}>Add transaction</Button>} />
          ) : (
            <div className="-mx-2">{txs.slice(0, 6).map(t => <TxRow key={t.id} tx={t} onClick={() => setEditTx(t)} />)}</div>
          )}
        </Card>

        <div className="space-y-6">
          {/* Budget snapshot */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Budgets this month</h2>
              <Link to="/budgets" className="text-sm text-accent hover:underline">Manage</Link>
            </div>
            {budgetRows.length === 0 ? (
              <p className="text-sm text-soft">No budgets yet. Set limits per category to keep spending honest.</p>
            ) : budgetRows.map(({ b, cat, spent, usage }) => (
              <div key={b.id} className="mb-3 last:mb-0">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{cat?.icon} {cat?.name}</span>
                  <span className={cls('tabular-nums', usage > 1 ? 'font-semibold text-neg' : 'text-soft')}>{fmt(spent)} / {fmt(Number(b.amount))}</span>
                </div>
                <Progress value={usage} color={usage > 1 ? 'var(--negative)' : cat?.color} />
              </div>
            ))}
          </Card>

          {/* Upcoming */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Coming up</h2>
              <Link to="/recurring" className="text-sm text-accent hover:underline">Recurring</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-soft">Nothing scheduled in the next two weeks.</p>
            ) : upcoming.map(({ rule, date }, i) => (
              <div key={`${rule.id}-${i}`} className="flex items-center justify-between py-1.5 text-sm">
                <span className="truncate">{rule.note || (rule.type === 'transfer' ? 'Transfer' : 'Scheduled')} <span className="text-soft">· {date}</span></span>
                <span className={cls('tabular-nums font-medium', rule.type === 'income' ? 'text-pos' : 'text-neg')}>{rule.type === 'income' ? '+' : '\u2212'}{fmt(Number(rule.amount))}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <TransactionForm open={!!editTx} onClose={() => setEditTx(null)} initial={editTx} />
    </div>
  )
}
