import { useMemo, useState } from 'react'
import { addMonths, format, getDay, getDaysInMonth, startOfMonth, subMonths } from 'date-fns'
import { useProfile, useTransactions } from '../api'
import TransactionForm from '../components/TransactionForm'
import TxRow from '../components/TxRow'
import { Card, cls } from '../components/ui'
import { compactMoney, friendlyDay } from '../lib/format'
import type { Transaction } from '../types'

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export default function CalendarPage() {
  const { data: txs = [] } = useTransactions()
  const { data: profile } = useProfile()
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState<string | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)

  const monthKey = format(month, 'yyyy-MM')
  const monthTxs = useMemo(() => txs.filter(t => t.date.startsWith(monthKey)), [txs, monthKey])

  const byDay = useMemo(() => {
    const m = new Map<string, { expense: number; income: number }>()
    for (const t of monthTxs) {
      if (!m.has(t.date)) m.set(t.date, { expense: 0, income: 0 })
      const slot = m.get(t.date)!
      if (t.type === 'expense') slot.expense += Number(t.amount)
      if (t.type === 'income') slot.income += Number(t.amount)
    }
    return m
  }, [monthTxs])

  const maxExpense = Math.max(1, ...[...byDay.values()].map(v => v.expense))
  const lead = (getDay(startOfMonth(month)) + 6) % 7
  const daysInMonth = getDaysInMonth(month)
  const cur = profile?.currency || 'INR'
  const loc = profile?.locale || 'en-IN'
  const selectedTxs = selected ? txs.filter(t => t.date === selected) : []
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="rise space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Calendar</h1>
          <p className="text-sm text-soft">Spent {compactMoney(monthExpense, cur, loc)} in {format(month, 'MMMM')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setMonth(m => subMonths(m, 1)); setSelected(null) }} className="grid h-9 w-9 place-items-center rounded-xl border border-line hover:bg-surface2">‹</button>
          <span className="w-32 text-center text-sm font-medium">{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => { setMonth(m => addMonths(m, 1)); setSelected(null) }} className="grid h-9 w-9 place-items-center rounded-xl border border-line hover:bg-surface2">›</button>
        </div>
      </header>

      <Card className="!p-3 sm:!p-5">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {WEEKDAYS.map(d => <div key={d} className="pb-1 text-center text-xs font-semibold uppercase tracking-wider text-soft">{d}</div>)}
          {Array.from({ length: lead }).map((_, i) => <div key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const iso = `${monthKey}-${String(day).padStart(2, '0')}`
            const data = byDay.get(iso)
            const heat = data ? Math.min(0.55, (data.expense / maxExpense) * 0.55) : 0
            const isToday = iso === format(new Date(), 'yyyy-MM-dd')
            return (
              <button
                key={iso}
                onClick={() => setSelected(s => (s === iso ? null : iso))}
                className={cls(
                  'flex min-h-[60px] flex-col items-center justify-start rounded-xl border p-1 text-xs transition-all sm:min-h-[72px]',
                  selected === iso ? 'border-accent ring-2 ring-accent/25' : 'border-transparent hover:border-line',
                  isToday && 'font-bold'
                )}
                style={{ background: heat > 0 ? `color-mix(in srgb, var(--negative) ${Math.round(heat * 100)}%, var(--surface-2))` : 'var(--surface-2)' }}
              >
                <span className={cls('mb-0.5', isToday && 'grid h-5 w-5 place-items-center rounded-full bg-accent text-accentink')}>{day}</span>
                {data && data.expense > 0 && <span className="tabular-nums font-medium text-neg">{compactMoney(data.expense, cur, loc)}</span>}
                {data && data.income > 0 && <span className="tabular-nums text-pos">+{compactMoney(data.income, cur, loc)}</span>}
              </button>
            )
          })}
        </div>
      </Card>

      {selected && (
        <Card className="rise">
          <h2 className="mb-2 font-display text-lg font-semibold">{friendlyDay(selected)}</h2>
          {selectedTxs.length === 0
            ? <p className="text-sm text-soft">No transactions on this day.</p>
            : <div className="-mx-2">{selectedTxs.map(t => <TxRow key={t.id} tx={t} onClick={() => setEditTx(t)} />)}</div>}
        </Card>
      )}

      <TransactionForm open={!!editTx} onClose={() => setEditTx(null)} initial={editTx} />
    </div>
  )
}
