import { useMemo, useState } from 'react'
import { addDays, addMonths, differenceInDays, format, parseISO, startOfMonth, startOfQuarter, startOfWeek, startOfYear, subDays, subMonths } from 'date-fns'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCategories, useMoneyFmt, useTransactions } from '../api'
import { Card, EmptyState, Segmented, cls } from '../components/ui'
import { buildInsights, expenseByCategory, periodTotals } from '../lib/insights'
import type { Category, Transaction } from '../types'

type Range = 'week' | 'month' | 'quarter' | 'year' | 'all'

export default function Analytics() {
  const { data: txs = [] } = useTransactions()
  const { data: categories = [] } = useCategories()

  const fmt = useMoneyFmt()
  const [range, setRange] = useState<Range>('month')
  const [drillCatId, setDrillCatId] = useState<string | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  const { start, prevStart, prevEnd } = useMemo(() => {
    const now = new Date()
    let s: Date
    if (range === 'week') s = startOfWeek(now, { weekStartsOn: 1 })
    else if (range === 'month') s = startOfMonth(now)
    else if (range === 'quarter') s = startOfQuarter(now)
    else if (range === 'year') s = startOfYear(now)
    else s = txs.length ? parseISO(txs[txs.length - 1].date) : now
    const len = differenceInDays(now, s) + 1
    return {
      start: format(s, 'yyyy-MM-dd'),
      prevEnd: format(subDays(s, 1), 'yyyy-MM-dd'),
      prevStart: format(subDays(s, len), 'yyyy-MM-dd')
    }
  }, [range, txs])

  const curTxs = useMemo(() => txs.filter(t => t.date >= start && t.date <= today), [txs, start, today])
  const prevTxs = useMemo(() => (range === 'all' ? [] : txs.filter(t => t.date >= prevStart && t.date <= prevEnd)), [txs, prevStart, prevEnd, range])

  const totals = periodTotals(curTxs)
  const prevTotals = periodTotals(prevTxs)
  const savingsRate = totals.income > 0 ? Math.round((totals.net / totals.income) * 100) : null
  const insights = useMemo(() => buildInsights(curTxs, prevTxs, categories, fmt), [curTxs, prevTxs, categories, fmt])

  // Daily/period trend
  const trend = useMemo(() => {
    const byDay = range === 'week' || range === 'month'
    const map = new Map<string, { income: number; expense: number }>()
    const end = new Date()
    if (byDay) {
      let d = parseISO(start)
      while (d <= end) { map.set(format(d, 'yyyy-MM-dd'), { income: 0, expense: 0 }); d = addDays(d, 1) }
    } else {
      let d = startOfMonth(parseISO(start))
      while (d <= end) { map.set(format(d, 'yyyy-MM'), { income: 0, expense: 0 }); d = addMonths(d, 1) }
    }
    for (const t of curTxs) {
      const key = byDay ? t.date : t.date.slice(0, 7)
      const slot = map.get(key)
      if (!slot) continue
      if (t.type === 'income') slot.income += Number(t.amount)
      if (t.type === 'expense') slot.expense += Number(t.amount)
    }
    return [...map.entries()].map(([k, v]) => ({
      label: byDay ? format(parseISO(k), 'd MMM') : format(parseISO(k + '-01'), 'MMM yy'),
      ...v
    }))
  }, [curTxs, range, start])

  // Category donut for current period
  const donut = useMemo(() => {
    const m = expenseByCategory(curTxs)
    return [...m.entries()].map(([id, value]) => {
      const c = categories.find(x => x.id === id)
      return { id, name: c?.name || 'Uncategorized', value: Math.round(value * 100) / 100, color: c?.color || '#9b937f', icon: c?.icon || '✨' }
    }).sort((a, b) => b.value - a.value)
  }, [curTxs, categories])

  const donutDisplay = useMemo(() => {
    if (donut.length <= 8) return donut
    const rest = donut.slice(7).reduce((s, r) => s + r.value, 0)
    return [...donut.slice(0, 7), { id: '__other__', name: 'Other', value: rest, color: '#9b937f', icon: '✨' }]
  }, [donut])

  // Day-of-week spending pattern (uses full visible period)
  const weekday = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const sums = [0, 0, 0, 0, 0, 0, 0]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const t of curTxs) {
      if (t.type !== 'expense') continue
      const day = (parseISO(t.date).getDay() + 6) % 7 // Mon=0
      sums[day] += Number(t.amount)
      counts[day] += 1
    }
    return labels.map((label, i) => ({ label, total: Math.round(sums[i] * 100) / 100, count: counts[i] }))
  }, [curTxs])

  // Top merchants (group by trimmed note)
  const topMerchants = useMemo(() => {
    const m = new Map<string, { total: number; count: number }>()
    for (const t of curTxs) {
      if (t.type !== 'expense') continue
      const key = (t.note || '').trim()
      if (!key) continue
      const cur = m.get(key) || { total: 0, count: 0 }
      cur.total += Number(t.amount); cur.count += 1
      m.set(key, cur)
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, 6)
  }, [curTxs])

  // Average daily spend & pace
  const periodDays = Math.max(1, differenceInDays(new Date(), parseISO(start)) + 1)
  const avgDaily = totals.expense / periodDays
  const monthPace = useMemo(() => {
    if (range !== 'month') return null
    const monthStart = startOfMonth(new Date())
    const daysIntoMonth = differenceInDays(new Date(), monthStart) + 1
    const daysInMonth = differenceInDays(addMonths(monthStart, 1), monthStart)
    const projected = (totals.expense / Math.max(1, daysIntoMonth)) * daysInMonth
    return { projected, vsPrev: prevTotals.expense > 0 ? ((projected - prevTotals.expense) / prevTotals.expense) * 100 : null }
  }, [range, totals.expense, prevTotals.expense])

  const compare = [
    { name: 'Income', current: totals.income, previous: prevTotals.income },
    { name: 'Spending', current: totals.expense, previous: prevTotals.expense }
  ]

  const money = (v: unknown) => fmt(Number(v))

  if (txs.length === 0) {
    return (
      <div className="rise space-y-5">
        <h1 className="font-display text-2xl font-semibold">Insights</h1>
        <EmptyState icon="📊" title="Nothing to analyze yet" body="Once you log a few transactions, this page turns your data into real financial self-awareness." />
      </div>
    )
  }

  const drillCat = drillCatId ? categories.find(c => c.id === drillCatId) || null : null

  return (
    <div className="rise space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Insights</h1>
        <Segmented
          value={range}
          onChange={setRange}
          options={[{ value: 'week', label: 'W' }, { value: 'month', label: 'M' }, { value: 'quarter', label: 'Q' }, { value: 'year', label: 'Y' }, { value: 'all', label: 'All' }]}
        />
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><p className="text-xs text-soft">Income</p><p className="mt-1 font-display text-xl font-semibold tabular-nums text-pos">{fmt(totals.income)}</p></Card>
        <Card><p className="text-xs text-soft">Spending</p><p className="mt-1 font-display text-xl font-semibold tabular-nums text-neg">{fmt(totals.expense)}</p></Card>
        <Card><p className="text-xs text-soft">Net</p><p className={cls('mt-1 font-display text-xl font-semibold tabular-nums', totals.net >= 0 ? 'text-pos' : 'text-neg')}>{fmt(totals.net)}</p></Card>
        <Card><p className="text-xs text-soft">Savings rate</p><p className="mt-1 font-display text-xl font-semibold tabular-nums">{savingsRate === null ? '—' : `${savingsRate}%`}</p></Card>
      </div>

      {/* Pace + daily average row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-xs text-soft">Avg daily spend</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{fmt(avgDaily)}</p>
          <p className="mt-1 text-xs text-soft">over {periodDays} {periodDays === 1 ? 'day' : 'days'}</p>
        </Card>
        {monthPace && (
          <Card>
            <p className="text-xs text-soft">Projected month-end</p>
            <p className="mt-1 font-display text-xl font-semibold tabular-nums">{fmt(monthPace.projected)}</p>
            {monthPace.vsPrev !== null && (
              <p className={cls('mt-1 text-xs tabular-nums', monthPace.vsPrev > 0 ? 'text-neg' : 'text-pos')}>
                {monthPace.vsPrev > 0 ? '▲' : '▼'} {Math.abs(Math.round(monthPace.vsPrev))}% vs last period
              </p>
            )}
          </Card>
        )}
        <Card>
          <p className="text-xs text-soft">Transactions</p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums">{curTxs.length}</p>
          <p className="mt-1 text-xs text-soft">{curTxs.filter(t => t.type === 'expense').length} expenses · {curTxs.filter(t => t.type === 'income').length} income</p>
        </Card>
      </div>

      {/* Insight cards */}
      {insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Income vs spending trend */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Income vs spending</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ left: 0, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--positive)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--positive)" stopOpacity={0} /></linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--negative)" stopOpacity={0.25} /><stop offset="100%" stopColor="var(--negative)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} width={56} />
              <Tooltip formatter={money} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
              <Area type="monotone" dataKey="income" stroke="var(--positive)" fill="url(#gInc)" strokeWidth={2} name="Income" />
              <Area type="monotone" dataKey="expense" stroke="var(--negative)" fill="url(#gExp)" strokeWidth={2} name="Spending" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category breakdown — clickable */}
        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold">Where it went</h2>
            <span className="text-xs text-soft">click to drill in</span>
          </div>
          {donutDisplay.length === 0 ? (
            <p className="text-sm text-soft">No expenses in this period.</p>
          ) : (
            <>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutDisplay} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} strokeWidth={0}
                      onClick={(d: { id?: string }) => d?.id && d.id !== '__other__' && setDrillCatId(d.id)}>
                      {donutDisplay.map((d, i) => <Cell key={i} fill={d.color} style={{ cursor: d.id !== '__other__' ? 'pointer' : 'default' }} />)}
                    </Pie>
                    <Tooltip formatter={money} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-1">
                {donutDisplay.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => d.id !== '__other__' && setDrillCatId(d.id)}
                    disabled={d.id === '__other__'}
                    className={cls(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                      d.id !== '__other__' && 'hover:bg-surface2 cursor-pointer',
                      drillCatId === d.id && 'bg-surface2'
                    )}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="flex-1 truncate">{d.icon} {d.name}</span>
                    <span className="tabular-nums text-soft">{fmt(d.value)}</span>
                    <span className="w-10 text-right text-xs tabular-nums text-soft">{totals.expense ? Math.round((d.value / totals.expense) * 100) : 0}%</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Day of week pattern */}
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">Spending by day of week</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekday} margin={{ left: 0, right: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={money} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                <Bar dataKey="total" name="Spending" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Drill-in for a selected category */}
      {drillCat && (
        <CategoryDrill
          category={drillCat}
          allTxs={txs}
          onClose={() => setDrillCatId(null)}
          fmt={fmt}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top merchants */}
        <Card>
          <h2 className="mb-4 font-display text-lg font-semibold">Top merchants</h2>
          {topMerchants.length === 0 ? (
            <p className="text-sm text-soft">Add notes to your expenses to see your most-visited merchants.</p>
          ) : (
            <ul className="space-y-2.5">
              {topMerchants.map((m, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface2 text-sm font-semibold text-soft">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-soft">{m.count} {m.count === 1 ? 'visit' : 'visits'}</p>
                  </div>
                  <span className="tabular-nums text-sm font-semibold">{fmt(m.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Period comparison */}
        {range !== 'all' && (
          <Card>
            <h2 className="mb-4 font-display text-lg font-semibold">vs previous period</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={compare} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={money} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
                  <Bar dataKey="previous" name="Previous" fill="var(--line)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="current" name="Current" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

function CategoryDrill({ category, allTxs, onClose, fmt }: {
  category: Category
  allTxs: Transaction[]
  onClose: () => void
  fmt: (n: number) => string
}) {
  const months = 12
  const monthly = useMemo(() => {
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(startOfMonth(now), i)
      map.set(format(d, 'yyyy-MM'), 0)
    }
    for (const t of allTxs) {
      if (t.category_id !== category.id) continue
      const key = t.date.slice(0, 7)
      if (map.has(key)) map.set(key, (map.get(key) || 0) + Number(t.amount))
    }
    return [...map.entries()].map(([k, v]) => ({ label: format(parseISO(k + '-01'), 'MMM'), value: Math.round(v * 100) / 100 }))
  }, [allTxs, category.id])

  const total = monthly.reduce((s, m) => s + m.value, 0)
  const avg = total / months
  const last = monthly[monthly.length - 1].value
  const prev = monthly[monthly.length - 2]?.value ?? 0
  const momChange = prev > 0 ? ((last - prev) / prev) * 100 : null

  const recent = useMemo(() => allTxs.filter(t => t.category_id === category.id).slice(0, 6), [allTxs, category.id])

  return (
    <Card className="border-accent/30">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: category.color + '22' }}>{category.icon}</span>
          <div>
            <h2 className="font-display text-lg font-semibold">{category.name}</h2>
            <p className="text-xs text-soft">Last 12 months</p>
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-soft hover:bg-surface2" aria-label="Close">✕</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><p className="text-xs text-soft">12-mo total</p><p className="mt-0.5 font-display text-lg font-semibold tabular-nums">{fmt(total)}</p></div>
        <div><p className="text-xs text-soft">Monthly avg</p><p className="mt-0.5 font-display text-lg font-semibold tabular-nums">{fmt(avg)}</p></div>
        <div><p className="text-xs text-soft">This month</p><p className="mt-0.5 font-display text-lg font-semibold tabular-nums">{fmt(last)}</p></div>
        <div>
          <p className="text-xs text-soft">vs last month</p>
          <p className={cls('mt-0.5 font-display text-lg font-semibold tabular-nums', momChange === null ? '' : momChange > 0 ? 'text-neg' : 'text-pos')}>
            {momChange === null ? '—' : `${momChange > 0 ? '+' : ''}${Math.round(momChange)}%`}
          </p>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthly} margin={{ left: 0, right: 8 }}>
            <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--ink-soft)' }} tickLine={false} axisLine={false} width={56} />
            <Tooltip formatter={(v: unknown) => fmt(Number(v))} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12 }} />
            <Bar dataKey="value" fill={category.color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {recent.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-soft">Recent transactions</p>
          <ul className="divide-y divide-line">
            {recent.map(t => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{t.note || category.name}</p>
                  <p className="text-xs text-soft">{format(parseISO(t.date), 'd MMM yyyy')}</p>
                </div>
                <span className={cls('tabular-nums text-sm font-semibold', t.type === 'income' ? 'text-pos' : 'text-neg')}>{fmt(Number(t.amount))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
