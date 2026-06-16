import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccounts, useCategories, useMoneyFmt, useTransactions } from '../api'
import TransactionForm from '../components/TransactionForm'
import TxRow from '../components/TxRow'
import { Button, EmptyState, Input, Select, Skeleton } from '../components/ui'
import { friendlyDay } from '../lib/format'
import { useUI } from '../store'
import type { Transaction } from '../types'

export default function Transactions() {
  const { data: txs = [], isLoading } = useTransactions()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const fmt = useMoneyFmt()
  const setTxFormOpen = useUI(s => s.setTxFormOpen)
  const [params] = useSearchParams()

  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState(params.get('account') || '')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [minAmt, setMinAmt] = useState('')
  const [maxAmt, setMaxAmt] = useState('')
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return txs.filter(t => {
      if (type && t.type !== type) return false
      if (categoryId && t.category_id !== categoryId) return false
      if (accountId && t.account_id !== accountId && t.to_account_id !== accountId) return false
      if (from && t.date < from) return false
      if (to && t.date > to) return false
      if (minAmt && Number(t.amount) < parseFloat(minAmt)) return false
      if (maxAmt && Number(t.amount) > parseFloat(maxAmt)) return false
      if (needle) {
        const cat = categories.find(c => c.id === t.category_id)
        const hay = `${t.note || ''} ${cat?.name || ''} ${(t.tags || []).join(' ')}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [txs, q, type, categoryId, accountId, from, to, minAmt, maxAmt, categories])

  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of filtered) {
      if (!m.has(t.date)) m.set(t.date, [])
      m.get(t.date)!.push(t)
    }
    return [...m.entries()]
  }, [filtered])

  const totals = useMemo(() => {
    let income = 0, expense = 0
    for (const t of filtered) {
      if (t.type === 'income') income += Number(t.amount)
      if (t.type === 'expense') expense += Number(t.amount)
    }
    return { income, expense }
  }, [filtered])

  const hasFilters = q || type || categoryId || accountId || from || to || minAmt || maxAmt

  return (
    <div className="rise space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Activity</h1>
          <p className="text-sm text-soft">{filtered.length} transaction{filtered.length === 1 ? '' : 's'} · +{fmt(totals.income)} / −{fmt(totals.expense)}</p>
        </div>
        <Button className="hidden sm:inline-flex" onClick={() => setTxFormOpen(true)}>+ New</Button>
      </header>

      {/* Filters */}
      <div className="space-y-2">
        <Input placeholder="Search notes, categories, #tags…" value={q} onChange={e => setQ(e.target.value)} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={type} onChange={e => setType(e.target.value)}>
            <option value="">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
            <option value="transfer">Transfers</option>
          </Select>
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" placeholder="Min" value={minAmt} onChange={e => setMinAmt(e.target.value)} />
            <Input type="number" placeholder="Max" value={maxAmt} onChange={e => setMaxAmt(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:max-w-xs">
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : groups.length === 0 ? (
        hasFilters
          ? <EmptyState icon="🔍" title="Nothing matches" body="Try loosening your filters or searching for something else." />
          : <EmptyState icon="✍️" title="No transactions yet" body="Everything you log will appear here, grouped by day." action={<Button onClick={() => setTxFormOpen(true)}>Add your first</Button>} />
      ) : (
        <div className="space-y-5">
          {groups.map(([date, list]) => {
            const dayNet = list.reduce((s, t) => s + (t.type === 'income' ? Number(t.amount) : t.type === 'expense' ? -Number(t.amount) : 0), 0)
            return (
              <section key={date}>
                <div className="mb-1 flex items-baseline justify-between px-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-soft">{friendlyDay(date)}</h3>
                  <span className="text-xs tabular-nums text-soft">{dayNet >= 0 ? '+' : '\u2212'}{fmt(Math.abs(dayNet))}</span>
                </div>
                <div className="rounded-2xl border border-line bg-surface p-1.5">
                  {list.map(t => <TxRow key={t.id} tx={t} onClick={() => setEditTx(t)} />)}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <TransactionForm open={!!editTx} onClose={() => setEditTx(null)} initial={editTx} />
    </div>
  )
}
