import { useMemo, useState } from 'react'
import { useDeleteSplit, useMoneyFmt, useSaveSplit, useSplits, useToggleShareSettled } from '../api'
import { Button, Card, EmptyState, Field, Input, Modal, cls } from '../components/ui'
import { shortDate, todayISO } from '../lib/format'
import { useUI } from '../store'
import type { Split } from '../types'

interface ShareRow { person: string; amount: string; settled: boolean }

export default function Splits() {
  const { data: splits = [] } = useSplits()
  const save = useSaveSplit()
  const del = useDeleteSplit()
  const toggle = useToggleShareSettled()
  const fmt = useMoneyFmt()
  const toast = useUI(s => s.toast)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Split | null>(null)
  const [description, setDescription] = useState('')
  const [total, setTotal] = useState('')
  const [date, setDate] = useState(todayISO())
  const [shares, setShares] = useState<ShareRow[]>([{ person: '', amount: '', settled: false }])
  const [error, setError] = useState('')

  const balances = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of splits) {
      for (const sh of s.shares || []) {
        if (!sh.settled) m.set(sh.person, (m.get(sh.person) || 0) + Number(sh.amount))
      }
    }
    return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  }, [splits])

  function openForm(s?: Split) {
    setEditing(s || null)
    setDescription(s?.description || '')
    setTotal(s ? String(s.total_amount) : '')
    setDate(s?.date || todayISO())
    setShares(s?.shares?.length
      ? s.shares.map(sh => ({ person: sh.person, amount: String(sh.amount), settled: sh.settled }))
      : [{ person: '', amount: '', settled: false }])
    setError('')
    setOpen(true)
  }

  function equalSplit() {
    const t = parseFloat(total)
    const filled = shares.filter(s => s.person.trim())
    if (!t || filled.length === 0) return
    const each = Math.floor((t / filled.length) * 100) / 100
    setShares(shares.map(s => (s.person.trim() ? { ...s, amount: String(each) } : s)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = parseFloat(total)
    if (!description.trim()) return setError('Describe the expense.')
    if (!t || t <= 0) return setError('Enter the total amount.')
    const rows = shares.filter(s => s.person.trim() && parseFloat(s.amount) > 0)
    if (rows.length === 0) return setError('Add at least one person with an amount.')
    await save.mutateAsync({
      id: editing?.id,
      description: description.trim(),
      total_amount: t,
      date,
      shares: rows.map(s => ({ person: s.person.trim(), amount: parseFloat(s.amount), settled: s.settled }))
    })
    toast(editing ? 'Split updated' : 'Split recorded', 'pos')
    setOpen(false)
  }

  return (
    <div className="rise space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Splits</h1>
          <p className="text-sm text-soft">Track who owes you what, and settle up cleanly.</p>
        </div>
        <Button onClick={() => openForm()}>+ Split</Button>
      </header>

      {balances.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold">Owed to you</h2>
          <div className="flex flex-wrap gap-2">
            {balances.map(([person, amt]) => (
              <span key={person} className="rounded-full bg-accentsoft px-3 py-1.5 text-sm font-medium text-accent">{person} · {fmt(amt)}</span>
            ))}
          </div>
        </Card>
      )}

      {splits.length === 0 ? (
        <EmptyState icon="🤝" title="No shared expenses" body="Dinner with friends, shared rent, group trips — record who owes what and never chase payments from memory." action={<Button onClick={() => openForm()}>Record a split</Button>} />
      ) : (
        <div className="space-y-3">
          {splits.map(s => {
            const unsettled = (s.shares || []).filter(sh => !sh.settled).reduce((sum, sh) => sum + Number(sh.amount), 0)
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{s.description}</p>
                    <p className="text-xs text-soft">{shortDate(s.date)} · total {fmt(Number(s.total_amount))}{unsettled > 0 ? ` · ${fmt(unsettled)} pending` : ' · all settled ✓'}</p>
                  </div>
                  <button onClick={() => openForm(s)} className="shrink-0 text-xs text-soft hover:text-ink">Edit</button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(s.shares || []).map(sh => (
                    <button
                      key={sh.id}
                      onClick={() => toggle.mutate({ id: sh.id, settled: !sh.settled })}
                      title={sh.settled ? 'Mark as pending' : 'Mark as settled'}
                      className={cls('rounded-full border px-3 py-1.5 text-sm transition-all', sh.settled ? 'border-line text-soft line-through opacity-60' : 'border-accent/40 bg-accentsoft text-accent font-medium')}
                    >
                      {sh.person} · {fmt(Number(sh.amount))}{sh.settled && ' ✓'}
                    </button>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit split' : 'New split'} wide>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Description"><Input autoFocus placeholder="e.g. Dinner at Olive" value={description} onChange={e => setDescription(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total amount"><Input type="number" step="0.01" min="0" value={total} onChange={e => setTotal(e.target.value)} /></Field>
            <Field label="Date"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-soft">People & amounts</span>
              <button type="button" onClick={equalSplit} className="text-xs text-accent hover:underline">Split equally</button>
            </div>
            <div className="space-y-2">
              {shares.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Name" value={s.person} onChange={e => setShares(rows => rows.map((r, j) => (j === i ? { ...r, person: e.target.value } : r)))} />
                  <Input type="number" step="0.01" min="0" placeholder="0.00" className="max-w-[120px]" value={s.amount} onChange={e => setShares(rows => rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))} />
                  <button type="button" onClick={() => setShares(rows => rows.filter((_, j) => j !== i))} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-soft hover:bg-surface2" aria-label="Remove">✕</button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setShares(rows => [...rows, { person: '', amount: '', settled: false }])} className="mt-2 text-sm text-accent hover:underline">+ Add person</button>
          </div>
          {error && <p className="text-sm font-medium text-neg">{error}</p>}
          <div className="flex gap-2">
            {editing && <Button type="button" variant="danger" onClick={async () => { await del.mutateAsync(editing.id); toast('Split deleted', 'neutral'); setOpen(false) }}>Delete</Button>}
            <Button type="submit" className="flex-1">{editing ? 'Save' : 'Record split'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
