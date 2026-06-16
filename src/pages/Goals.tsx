import { useMemo, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { useDeleteGoal, useGoalContributions, useGoals, useMoneyFmt, useSaveContribution, useSaveGoal } from '../api'
import { Button, Card, EmptyState, Field, Input, Modal, Progress, cls } from '../components/ui'
import { todayISO } from '../lib/format'
import { useUI } from '../store'
import { PALETTE, type Goal } from '../types'

export default function Goals() {
  const { data: goals = [] } = useGoals()
  const { data: contributions = [] } = useGoalContributions()
  const saveGoal = useSaveGoal()
  const delGoal = useDeleteGoal()
  const saveContribution = useSaveContribution()
  const fmt = useMoneyFmt()
  const toast = useUI(s => s.toast)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [icon, setIcon] = useState('\ud83c\udfaf')
  const [color, setColor] = useState(PALETTE[0])
  const [error, setError] = useState('')

  const [contribGoal, setContribGoal] = useState<Goal | null>(null)
  const [contribAmt, setContribAmt] = useState('')
  const [contribNote, setContribNote] = useState('')

  const savedByGoal = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of contributions) m.set(c.goal_id, (m.get(c.goal_id) || 0) + Number(c.amount))
    return m
  }, [contributions])

  function openForm(g?: Goal) {
    setEditing(g || null)
    setName(g?.name || '')
    setTarget(g ? String(g.target_amount) : '')
    setTargetDate(g?.target_date || '')
    setIcon(g?.icon || '\ud83c\udfaf')
    setColor(g?.color || PALETTE[0])
    setError('')
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(target)
    if (!name.trim()) return setError('Name your goal.')
    if (!amt || amt <= 0) return setError('Set a target amount.')
    await saveGoal.mutateAsync({ id: editing?.id, name: name.trim(), target_amount: amt, target_date: targetDate || null, icon: icon || '\ud83c\udfaf', color })
    toast(editing ? 'Goal updated' : 'Goal created', 'pos')
    setOpen(false)
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(contribAmt)
    if (!contribGoal || !amt) return
    await saveContribution.mutateAsync({ goal_id: contribGoal.id, amount: amt, date: todayISO(), note: contribNote.trim() || null })
    toast(`Added ${fmt(amt)} to ${contribGoal.name}`, 'pos')
    setContribGoal(null); setContribAmt(''); setContribNote('')
  }

  return (
    <div className="rise space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Savings goals</h1>
          <p className="text-sm text-soft">Put a name and a number on what you're saving for.</p>
        </div>
        <Button onClick={() => openForm()}>+ Goal</Button>
      </header>

      {goals.length === 0 ? (
        <EmptyState icon="🎯" title="No goals yet" body="An emergency fund, a trip, a new laptop — give your savings a destination." action={<Button onClick={() => openForm()}>Create a goal</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map(g => {
            const saved = savedByGoal.get(g.id) || 0
            const progress = saved / Number(g.target_amount)
            const daysLeft = g.target_date ? differenceInDays(parseISO(g.target_date), new Date()) : null
            const done = progress >= 1
            return (
              <Card key={g.id} className={cls(done && 'border-accent/50')}>
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl text-xl" style={{ background: `${g.color}22` }}>{g.icon}</span>
                    <div>
                      <p className="font-medium">{g.name} {done && '\ud83c\udf89'}</p>
                      <p className="text-xs text-soft">
                        {done ? 'Goal reached!' : daysLeft !== null ? (daysLeft >= 0 ? `${daysLeft} days left` : `${-daysLeft} days overdue`) : 'No deadline'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => openForm(g)} className="text-xs text-soft hover:text-ink">Edit</button>
                </div>
                <p className="mb-2 font-display text-2xl font-semibold tabular-nums">
                  {fmt(saved)} <span className="text-sm font-normal text-soft">of {fmt(Number(g.target_amount))}</span>
                </p>
                <Progress value={progress} color={g.color} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-soft">{Math.min(100, Math.round(progress * 100))}% there</span>
                  <Button variant="soft" className="!px-3 !py-1.5 text-xs" onClick={() => setContribGoal(g)}>+ Add money</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Goal form */}
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit goal' : 'New goal'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name"><Input autoFocus placeholder="e.g. Emergency fund" value={name} onChange={e => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target amount"><Input type="number" step="0.01" min="0" value={target} onChange={e => setTarget(e.target.value)} /></Field>
            <Field label="Target date (optional)"><Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon" hint="Any emoji"><Input value={icon} onChange={e => setIcon(e.target.value)} maxLength={4} /></Field>
            <Field label="Color">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} className={cls('h-7 w-7 rounded-full transition-transform', color === c && 'ring-2 ring-ink ring-offset-2 ring-offset-surface scale-110')} style={{ background: c }} />
                ))}
              </div>
            </Field>
          </div>
          {error && <p className="text-sm font-medium text-neg">{error}</p>}
          <div className="flex gap-2">
            {editing && <Button type="button" variant="danger" onClick={async () => { await delGoal.mutateAsync(editing.id); toast('Goal deleted', 'neutral'); setOpen(false) }}>Delete</Button>}
            <Button type="submit" className="flex-1">{editing ? 'Save' : 'Create goal'}</Button>
          </div>
        </form>
      </Modal>

      {/* Contribution form */}
      <Modal open={!!contribGoal} onClose={() => setContribGoal(null)} title={`Add to ${contribGoal?.name || ''}`}>
        <form onSubmit={contribute} className="space-y-4">
          <Field label="Amount"><Input autoFocus type="number" step="0.01" min="0" placeholder="0.00" value={contribAmt} onChange={e => setContribAmt(e.target.value)} /></Field>
          <Field label="Note (optional)"><Input placeholder="e.g. June top-up" value={contribNote} onChange={e => setContribNote(e.target.value)} /></Field>
          <Button type="submit" className="w-full" disabled={saveContribution.isPending}>Add contribution</Button>
        </form>
      </Modal>
    </div>
  )
}
