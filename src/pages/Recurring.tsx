import { useMemo, useState } from 'react'
import { useAccounts, useCategories, useDeleteRule, useMoneyFmt, useRecurringRules, useSaveRule } from '../api'
import { Button, Card, EmptyState, Field, Input, Modal, Segmented, Select, cls } from '../components/ui'
import { shortDate, todayISO } from '../lib/format'
import { upcomingOccurrences } from '../lib/recurring'
import { useUI } from '../store'
import type { Frequency, RecurringRule, TxType } from '../types'

function freqLabel(rule: RecurringRule): string {
  const unit = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }[rule.frequency]
  return rule.interval === 1
    ? { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }[rule.frequency]
    : `Every ${rule.interval} ${unit}s`
}

export default function Recurring() {
  const { data: rules = [] } = useRecurringRules()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const save = useSaveRule()
  const del = useDeleteRule()
  const fmt = useMoneyFmt()
  const toast = useUI(s => s.toast)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringRule | null>(null)
  const [type, setType] = useState<TxType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [interval, setIntervalN] = useState('1')
  const [nextDate, setNextDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')
  const [autoPost, setAutoPost] = useState(true)
  const [error, setError] = useState('')

  const activeAccounts = accounts.filter(a => !a.archived)
  const cats = categories.filter(c => !c.archived && c.kind === (type === 'income' ? 'income' : 'expense'))
  const upcoming = useMemo(() => upcomingOccurrences(rules, 30), [rules])

  function openForm(r?: RecurringRule) {
    setEditing(r || null)
    setType(r?.type || 'expense')
    setAmount(r ? String(r.amount) : '')
    setAccountId(r?.account_id || activeAccounts[0]?.id || '')
    setToAccountId(r?.to_account_id || '')
    setCategoryId(r?.category_id || '')
    setFrequency(r?.frequency || 'monthly')
    setIntervalN(r ? String(r.interval) : '1')
    setNextDate(r?.next_date || todayISO())
    setEndDate(r?.end_date || '')
    setNote(r?.note || '')
    setAutoPost(r?.auto_post ?? true)
    setError('')
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return setError('Enter an amount greater than zero.')
    if (!accountId) return setError('Choose an account.')
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) return setError('Choose a different destination account.')
    if (type !== 'transfer' && !categoryId) return setError('Pick a category.')
    await save.mutateAsync({
      id: editing?.id, type, amount: amt, account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      category_id: type === 'transfer' ? null : categoryId,
      frequency, interval: parseInt(interval) || 1, next_date: nextDate,
      end_date: endDate || null, note: note.trim() || null, auto_post: autoPost, active: editing?.active ?? true
    })
    toast(editing ? 'Rule updated' : 'Recurring rule created', 'pos')
    setOpen(false)
  }

  return (
    <div className="rise space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Recurring</h1>
          <p className="text-sm text-soft">Salary, rent, subscriptions — set them once, never forget them.</p>
        </div>
        <Button onClick={() => openForm()}>+ Rule</Button>
      </header>

      {rules.length === 0 ? (
        <EmptyState icon="🔁" title="No recurring rules" body="Automate transactions that repeat. Tally posts them on schedule, even while you sleep." action={<Button onClick={() => openForm()}>Create a rule</Button>} />
      ) : (
        <div className="space-y-3">
          {rules.map(r => {
            const cat = categories.find(c => c.id === r.category_id)
            const acc = accounts.find(a => a.id === r.account_id)
            return (
              <Card key={r.id} className={cls('flex items-center gap-4', !r.active && 'opacity-60')}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface2 text-lg">{r.type === 'transfer' ? '⇄' : cat?.icon || '🔁'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.note || cat?.name || 'Transfer'}</p>
                  <p className="text-xs text-soft">
                    {freqLabel(r)} · next {shortDate(r.next_date)} · {acc?.name}
                    {!r.auto_post && ' · reminder only'}
                    {!r.active && ' · paused'}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cls('font-semibold tabular-nums', r.type === 'income' ? 'text-pos' : r.type === 'expense' ? 'text-neg' : 'text-soft')}>
                    {r.type === 'income' ? '+' : r.type === 'expense' ? '−' : ''}{fmt(Number(r.amount))}
                  </p>
                  <div className="mt-0.5 flex justify-end gap-2 text-xs">
                    <button onClick={() => openForm(r)} className="text-soft hover:text-ink">Edit</button>
                    <button onClick={async () => { await save.mutateAsync({ id: r.id, active: !r.active }); toast(r.active ? 'Rule paused' : 'Rule resumed', 'neutral') }} className="text-soft hover:text-ink">{r.active ? 'Pause' : 'Resume'}</button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Next 30 days</h2>
          {upcoming.map(({ rule, date }, i) => (
            <div key={`${rule.id}-${i}`} className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0">
              <span className="truncate">{rule.note || 'Scheduled'} <span className="text-soft">· {shortDate(date)}</span></span>
              <span className={cls('tabular-nums font-medium', rule.type === 'income' ? 'text-pos' : 'text-neg')}>{rule.type === 'income' ? '+' : '−'}{fmt(Number(rule.amount))}</span>
            </div>
          ))}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit rule' : 'New recurring rule'}>
        <form onSubmit={submit} className="space-y-4">
          <Segmented className="w-full [&>button]:flex-1" value={type} onChange={t => { setType(t); setCategoryId('') }}
            options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }, { value: 'transfer', label: 'Transfer' }]} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount"><Input autoFocus type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
            <Field label={type === 'transfer' ? 'From account' : 'Account'}>
              <Select value={accountId} onChange={e => setAccountId(e.target.value)}>
                <option value="">Select…</option>
                {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </Select>
            </Field>
          </div>
          {type === 'transfer' ? (
            <Field label="To account">
              <Select value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
                <option value="">Select…</option>
                {activeAccounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Category">
              <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                <option value="">Select…</option>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Repeats">
              <Select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
            <Field label="Every"><Input type="number" min="1" value={interval} onChange={e => setIntervalN(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Next occurrence"><Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} /></Field>
            <Field label="Ends (optional)"><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
          </div>
          <Field label="Note"><Input placeholder="e.g. Netflix, Rent, Salary" value={note} onChange={e => setNote(e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={autoPost} onChange={e => setAutoPost(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Post automatically when due
          </label>
          {error && <p className="text-sm font-medium text-neg">{error}</p>}
          <div className="flex gap-2">
            {editing && <Button type="button" variant="danger" onClick={async () => { await del.mutateAsync(editing.id); toast('Rule deleted', 'neutral'); setOpen(false) }}>Delete</Button>}
            <Button type="submit" className="flex-1">{editing ? 'Save' : 'Create rule'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
