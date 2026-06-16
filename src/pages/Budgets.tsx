import { useMemo, useState } from 'react'
import { addMonths, format, subMonths } from 'date-fns'
import { useBudgets, useCategories, useDeleteBudget, useMoneyFmt, useSaveBudget, useTransactions } from '../api'
import { Button, Card, EmptyState, Field, Input, Modal, Progress, Select, cls } from '../components/ui'
import { useUI } from '../store'
import type { Budget } from '../types'

export default function Budgets() {
  const { data: budgets = [] } = useBudgets()
  const { data: categories = [] } = useCategories()
  const { data: txs = [] } = useTransactions()
  const save = useSaveBudget()
  const del = useDeleteBudget()
  const fmt = useMoneyFmt()
  const toast = useUI(s => s.toast)

  const [month, setMonth] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const monthKey = format(month, 'yyyy-MM')
  const monthTxs = useMemo(() => txs.filter(t => t.type === 'expense' && t.date.startsWith(monthKey)), [txs, monthKey])

  const rows = useMemo(() => budgets.map(b => {
    const cat = categories.find(c => c.id === b.category_id)
    const spent = monthTxs.filter(t => t.category_id === b.category_id).reduce((s, t) => s + Number(t.amount), 0)
    return { b, cat, spent, usage: spent / Number(b.amount) }
  }).sort((a, b) => b.usage - a.usage), [budgets, categories, monthTxs])

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0)
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0)
  const expenseCats = categories.filter(c => c.kind === 'expense' && !c.archived)
  const availableCats = expenseCats.filter(c => !budgets.some(b => b.category_id === c.id) || c.id === editing?.category_id)

  function openForm(b?: Budget) {
    setEditing(b || null)
    setCategoryId(b?.category_id || '')
    setAmount(b ? String(b.amount) : '')
    setError('')
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!categoryId) return setError('Pick a category.')
    if (!amt || amt <= 0) return setError('Enter a budget amount.')
    await save.mutateAsync({ id: editing?.id, category_id: categoryId, amount: amt })
    toast('Budget saved', 'pos')
    setOpen(false)
  }

  return (
    <div className="rise space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Budgets</h1>
          {budgets.length > 0 && <p className="text-sm text-soft">{fmt(totalSpent)} spent of {fmt(totalBudget)} budgeted</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-line hover:bg-surface2">‹</button>
          <span className="w-32 text-center text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-line hover:bg-surface2">›</button>
          <Button onClick={() => openForm()}>+ Budget</Button>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState icon="⚖️" title="No budgets yet" body="Set a monthly limit for any expense category and Tally will track you against it." action={<Button onClick={() => openForm()}>Create a budget</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(({ b, cat, spent, usage }) => (
            <Card key={b.id} className={cls(usage > 1 && 'border-neg/40')}>
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl text-lg" style={{ background: `${cat?.color || '#888'}22` }}>{cat?.icon}</span>
                  <div>
                    <p className="font-medium">{cat?.name || 'Unknown'}</p>
                    <p className="text-xs text-soft">{Math.round(usage * 100)}% used</p>
                  </div>
                </div>
                <button onClick={() => openForm(b)} className="text-xs text-soft hover:text-ink">Edit</button>
              </div>
              <Progress value={usage} color={usage > 1 ? 'var(--negative)' : cat?.color} />
              <div className="mt-2 flex justify-between text-sm">
                <span className={cls('tabular-nums', usage > 1 ? 'font-semibold text-neg' : 'text-soft')}>{fmt(spent)} spent</span>
                <span className="tabular-nums text-soft">{usage <= 1 ? `${fmt(Number(b.amount) - spent)} left` : `${fmt(spent - Number(b.amount))} over`}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit budget' : 'New budget'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Category">
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={!!editing}>
              <option value="">Select…</option>
              {availableCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Monthly limit"><Input autoFocus type="number" step="0.01" min="0" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
          {error && <p className="text-sm font-medium text-neg">{error}</p>}
          <div className="flex gap-2">
            {editing && <Button type="button" variant="danger" onClick={async () => { await del.mutateAsync(editing.id); toast('Budget removed', 'neutral'); setOpen(false) }}>Delete</Button>}
            <Button type="submit" className="flex-1">{editing ? 'Save' : 'Create budget'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
