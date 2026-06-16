import { useEffect, useState } from 'react'
import { useAccounts, useCategories, useDeleteTransaction, useSaveTransaction } from '../api'
import { todayISO } from '../lib/format'
import { useUI } from '../store'
import type { Transaction, TxType } from '../types'
import { Button, Field, Input, Modal, Segmented, cls } from './ui'

export default function TransactionForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Transaction | null }) {
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const save = useSaveTransaction()
  const del = useDeleteTransaction()
  const toast = useUI(s => s.toast)

  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')

  const activeAccounts = accounts.filter(a => !a.archived)
  const cats = categories.filter(c => !c.archived && c.kind === (type === 'income' ? 'income' : 'expense'))

  useEffect(() => {
    if (!open) return
    if (initial) {
      setType(initial.type)
      setAmount(String(initial.amount))
      setAccountId(initial.account_id)
      setToAccountId(initial.to_account_id || '')
      setCategoryId(initial.category_id || '')
      setDate(initial.date)
      setNote(initial.note || '')
      setTags((initial.tags || []).join(', '))
    } else {
      setType('expense'); setAmount(''); setToAccountId(''); setCategoryId(''); setDate(todayISO()); setNote(''); setTags('')
      setAccountId(activeAccounts[0]?.id || '')
    }
    setError('')
  }, [open, initial])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return setError('Enter an amount greater than zero.')
    if (!accountId) return setError('Choose an account.')
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) return setError('Choose a different destination account.')
    if (type !== 'transfer' && !categoryId) return setError('Pick a category.')
    try {
      await save.mutateAsync({
        id: initial?.id,
        type,
        amount: amt,
        account_id: accountId,
        to_account_id: type === 'transfer' ? toAccountId : null,
        category_id: type === 'transfer' ? null : categoryId,
        date,
        note: note.trim() || null,
        tags: tags.trim() ? tags.split(',').map(s => s.trim()).filter(Boolean) : null
      })
      toast(initial ? 'Transaction updated' : 'Transaction added', 'pos')
      onClose()
    } catch {
      setError('Could not save. Check your connection and try again.')
    }
  }

  async function remove() {
    if (!initial) return
    await del.mutateAsync(initial.id)
    toast('Transaction deleted', 'neutral')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Edit transaction' : 'New transaction'}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full [&>button]:flex-1"
          value={type}
          onChange={t => { setType(t); setCategoryId('') }}
          options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]}
        />
        <div>
          <input
            autoFocus
            inputMode="decimal"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className={cls('w-full bg-transparent text-center font-display text-5xl font-semibold outline-none placeholder:text-soft/40', type === 'income' ? 'text-pos' : type === 'expense' ? 'text-neg' : 'text-ink')}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={type === 'transfer' ? 'From account' : 'Account'}>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent">
              <option value="">Select…</option>
              {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </Field>
          {type === 'transfer' ? (
            <Field label="To account">
              <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-accent">
                <option value="">Select…</option>
                {activeAccounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Date">
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </Field>
          )}
        </div>
        {type === 'transfer' && (
          <Field label="Date">
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
        )}
        {type !== 'transfer' && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-soft">Category</span>
            <div className="flex flex-wrap gap-2">
              {cats.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cls('rounded-full border px-3 py-1.5 text-sm transition-all', categoryId === c.id ? 'border-accent bg-accentsoft text-accent font-medium' : 'border-line bg-surface text-soft hover:border-soft')}
                >
                  {c.icon} {c.name}
                </button>
              ))}
              {cats.length === 0 && <p className="text-sm text-soft">No categories yet — add some in Settings.</p>}
            </div>
          </div>
        )}
        <Field label="Note">
          <Input placeholder="What was this for?" value={note} onChange={e => setNote(e.target.value)} />
        </Field>
        <Field label="Tags" hint="Comma-separated, e.g. work, trip-goa">
          <Input placeholder="tags…" value={tags} onChange={e => setTags(e.target.value)} />
        </Field>
        {error && <p className="text-sm font-medium text-neg">{error}</p>}
        <div className="flex gap-2 pt-1">
          {initial && <Button type="button" variant="danger" onClick={remove}>Delete</Button>}
          <Button type="submit" className="flex-1" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
