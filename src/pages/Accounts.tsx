import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccounts, useDeleteAccount, useSaveAccount, useTransactions } from '../api'
import { Button, Card, EmptyState, Field, Input, Modal, Money, Select, cls } from '../components/ui'
import { accountBalance, netWorth } from '../lib/finance'
import { useUI } from '../store'
import { ACCOUNT_TYPES, PALETTE, type Account } from '../types'

export default function Accounts() {
  const { data: accounts = [] } = useAccounts()
  const { data: txs = [] } = useTransactions()
  const save = useSaveAccount()
  const del = useDeleteAccount()
  const toast = useUI(s => s.toast)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('bank')
  const [opening, setOpening] = useState('0')
  const [icon, setIcon] = useState('\ud83c\udfe6')
  const [color, setColor] = useState(PALETTE[0])
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const active = accounts.filter(a => !a.archived)
  const archived = accounts.filter(a => a.archived)
  const worth = netWorth(accounts, txs)

  const { assets, liabilities } = useMemo(() => {
    const liabilityTypes = new Set(ACCOUNT_TYPES.filter(t => t.liability).map(t => t.value))
    return {
      assets: active.filter(a => !liabilityTypes.has(a.type)),
      liabilities: active.filter(a => liabilityTypes.has(a.type))
    }
  }, [active])

  function openForm(acc?: Account) {
    setEditing(acc || null)
    setName(acc?.name || '')
    setType(acc?.type || 'bank')
    setOpening(String(acc?.opening_balance ?? 0))
    setIcon(acc?.icon || '\ud83c\udfe6')
    setColor(acc?.color || PALETTE[0])
    setError('')
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Give the account a name.')
    await save.mutateAsync({ id: editing?.id, name: name.trim(), type, opening_balance: parseFloat(opening) || 0, icon: icon || '\ud83c\udfe6', color })
    toast(editing ? 'Account updated' : 'Account created', 'pos')
    setOpen(false)
  }

  async function toggleArchive(acc: Account) {
    await save.mutateAsync({ id: acc.id, archived: !acc.archived })
    toast(acc.archived ? 'Account restored' : 'Account archived', 'neutral')
  }

  function AccountCard({ a }: { a: Account }) {
    const bal = accountBalance(a, txs)
    const typeInfo = ACCOUNT_TYPES.find(t => t.value === a.type)
    return (
      <Card className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: `${a.color}22` }}>{a.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{a.name}</p>
          <p className="text-xs text-soft">{typeInfo?.label}</p>
        </div>
        <div className="text-right">
          <p className={cls('font-display text-lg font-semibold tabular-nums', bal < 0 && 'text-neg')}><Money n={bal} /></p>
          <div className="mt-0.5 flex justify-end gap-2 text-xs">
            <Link to={`/transactions?account=${a.id}`} className="text-accent hover:underline">Activity</Link>
            <button onClick={() => openForm(a)} className="text-soft hover:text-ink">Edit</button>
            <button onClick={() => toggleArchive(a)} className="text-soft hover:text-ink">{a.archived ? 'Restore' : 'Archive'}</button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="rise space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Accounts</h1>
          <p className="text-sm text-soft">Net worth: <Money n={worth} className="font-semibold text-ink" /></p>
        </div>
        <Button onClick={() => openForm()}>+ Account</Button>
      </header>

      {active.length === 0 ? (
        <EmptyState icon="🏦" title="No accounts" body="Add your bank, cards, wallets, and cash to start tracking balances." action={<Button onClick={() => openForm()}>Add account</Button>} />
      ) : (
        <>
          {assets.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-soft">Assets</h2>
              {assets.map(a => <AccountCard key={a.id} a={a} />)}
            </section>
          )}
          {liabilities.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-soft">Liabilities</h2>
              {liabilities.map(a => <AccountCard key={a.id} a={a} />)}
            </section>
          )}
        </>
      )}

      {archived.length > 0 && (
        <section>
          <button onClick={() => setShowArchived(s => !s)} className="text-sm text-soft hover:text-ink">
            {showArchived ? '\u25be' : '\u25b8'} Archived ({archived.length})
          </button>
          {showArchived && <div className="mt-3 space-y-3 opacity-70">{archived.map(a => <AccountCard key={a.id} a={a} />)}</div>}
        </section>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit account' : 'New account'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name"><Input autoFocus placeholder="e.g. HDFC Savings" value={name} onChange={e => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <Select value={type} onChange={e => setType(e.target.value)}>
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </Select>
            </Field>
            <Field label="Opening balance"><Input type="number" step="0.01" value={opening} onChange={e => setOpening(e.target.value)} /></Field>
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
            {editing && (
              <Button type="button" variant="danger" onClick={async () => { await del.mutateAsync(editing.id); toast('Account deleted', 'neutral'); setOpen(false) }}>Delete</Button>
            )}
            <Button type="submit" className="flex-1" disabled={save.isPending}>{editing ? 'Save changes' : 'Create account'}</Button>
          </div>
          {editing && <p className="text-xs text-soft">Deleting an account removes its transactions permanently. Prefer archiving to keep history.</p>}
        </form>
      </Modal>
    </div>
  )
}
