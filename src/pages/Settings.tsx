import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccounts, useCategories, useDeleteCategory, useProfile, useSaveCategory, useSaveProfile, useTransactions, useUid } from '../api'
import { Button, Card, Field, Input, Modal, Segmented, Select, cls } from '../components/ui'
import { downloadFile, importTransactionsCSV, transactionsToCSV } from '../lib/csv'
import { supabase } from '../lib/supabase'
import { useUI } from '../store'
import { CURRENCIES, PALETTE, type Category, type CategoryKind } from '../types'

export default function Settings() {
  const uid = useUid()
  const qc = useQueryClient()
  const { data: profile } = useProfile()
  const { data: categories = [] } = useCategories()
  const { data: accounts = [] } = useAccounts()
  const { data: txs = [] } = useTransactions()
  const saveProfile = useSaveProfile()
  const saveCategory = useSaveCategory()
  const delCategory = useDeleteCategory()
  const toast = useUI(s => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('')
  useEffect(() => {
    setName(profile?.display_name || '')
    setDob(profile?.dob || '')
    setGender(((profile?.gender as typeof gender) || ''))
  }, [profile?.display_name, profile?.dob, profile?.gender])

  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwBusy, setPwBusy] = useState(false)

  const [kind, setKind] = useState<CategoryKind>('expense')
  const [catOpen, setCatOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('✨')
  const [catColor, setCatColor] = useState(PALETTE[0])
  const [catError, setCatError] = useState('')
  const [importing, setImporting] = useState(false)

  const visibleCats = categories.filter(c => c.kind === kind)

  function openCatForm(c?: Category) {
    setEditingCat(c || null)
    setCatName(c?.name || '')
    setCatIcon(c?.icon || '✨')
    setCatColor(c?.color || PALETTE[0])
    setCatError('')
    setCatOpen(true)
  }

  async function submitCat(e: React.FormEvent) {
    e.preventDefault()
    if (!catName.trim()) return setCatError('Name the category.')
    await saveCategory.mutateAsync({ id: editingCat?.id, name: catName.trim(), kind: editingCat?.kind || kind, icon: catIcon || '✨', color: catColor })
    toast(editingCat ? 'Category updated' : 'Category created', 'pos')
    setCatOpen(false)
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res = await importTransactionsCSV(uid, text, accounts, categories)
      ;['transactions', 'accounts', 'categories'].forEach(k => qc.invalidateQueries({ queryKey: [k] }))
      const extras: string[] = []
      if (res.errors) extras.push(`skipped ${res.errors} rows`)
      if (res.skippedCategories.length) extras.push(`${res.skippedCategories.length} unknown categories → Miscellaneous/Other income`)
      toast(`Imported ${res.imported} transactions${extras.length ? ` (${extras.join(', ')})` : ''}`, 'pos')
    } catch {
      toast('Import failed — expected columns: date, type, amount, category, account, note', 'neg')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="rise space-y-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      {/* Personal details */}
      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Personal details</h2>
        <p className="mb-4 text-sm text-soft">Update what you told us at sign-up.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label="Date of birth">
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={gender} onChange={e => setGender(e.target.value as typeof gender)}>
              <option value="">Not set</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Button onClick={async () => {
            await saveProfile.mutateAsync({
              display_name: name.trim() || null,
              dob: dob || null,
              gender: gender || null
            })
            toast('Personal details saved', 'pos')
          }}>Save details</Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold">Preferences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency">
            <Select value={profile?.currency || 'INR'} onChange={e => { saveProfile.mutate({ currency: e.target.value }); toast('Currency updated', 'pos') }}>
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-soft">Theme</span>
          <Segmented
            value={(profile?.theme || 'light') as 'light' | 'dark' | 'system'}
            onChange={t => saveProfile.mutate({ theme: t })}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
          />
        </div>
      </Card>

      {/* Change password */}
      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Change password</h2>
        <p className="mb-4 text-sm text-soft">Use at least 8 characters with a mix of letters, numbers and symbols.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password">
            <Input type="password" autoComplete="new-password" minLength={8} value={pw1} onChange={e => setPw1(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={e => setPw2(e.target.value)} />
            {pw2.length > 0 && (
              <p className={cls('mt-1 text-xs font-medium', pw1 === pw2 ? 'text-pos' : 'text-neg')}>
                {pw1 === pw2 ? '✓ Passwords match' : 'Passwords do not match'}
              </p>
            )}
          </Field>
        </div>
        <div className="mt-4">
          <Button disabled={pwBusy} onClick={async () => {
            if (pw1.length < 8) return toast('Password must be at least 8 characters', 'neg')
            if (pw1 !== pw2) return toast('Passwords do not match', 'neg')
            setPwBusy(true)
            const { error } = await supabase.auth.updateUser({ password: pw1 })
            setPwBusy(false)
            if (error) toast(error.message, 'neg')
            else { setPw1(''); setPw2(''); toast('Password updated', 'pos') }
          }}>{pwBusy ? 'Updating…' : 'Update password'}</Button>
        </div>
      </Card>


      {/* Categories */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Categories</h2>
          <div className="flex items-center gap-2">
            <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
            <Button onClick={() => openCatForm()}>+ Add</Button>
          </div>
        </div>
        <div className="divide-y divide-line">
          {visibleCats.map(c => (
            <div key={c.id} className={cls('flex items-center gap-3 py-2.5', c.archived && 'opacity-50')}>
              <span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ background: `${c.color}22` }}>{c.icon}</span>
              <span className="flex-1 text-sm font-medium">{c.name}{c.archived && <span className="ml-2 text-xs font-normal text-soft">archived</span>}</span>
              <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              <button onClick={() => openCatForm(c)} className="text-xs text-soft hover:text-ink">Edit</button>
              <button onClick={async () => { await saveCategory.mutateAsync({ id: c.id, archived: !c.archived }); toast(c.archived ? 'Category restored' : 'Category archived', 'neutral') }} className="text-xs text-soft hover:text-ink">{c.archived ? 'Restore' : 'Archive'}</button>
            </div>
          ))}
          {visibleCats.length === 0 && <p className="py-3 text-sm text-soft">No {kind} categories yet.</p>}
        </div>
      </Card>

      {/* Data */}
      <Card>
        <h2 className="mb-1 font-display text-lg font-semibold">Your data</h2>
        <p className="mb-4 text-sm text-soft">Export everything any time, or import transactions from a CSV with columns: date, type, amount, category, account, note.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => { downloadFile('tally-transactions.csv', transactionsToCSV(txs, accounts, categories), 'text/csv'); toast('CSV exported', 'pos') }}>Export CSV</Button>
          <Button variant="ghost" onClick={() => { downloadFile('tally-data.json', JSON.stringify({ accounts, categories, transactions: txs }, null, 2), 'application/json'); toast('JSON exported', 'pos') }}>Export JSON</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={importing}>{importing ? 'Importing…' : 'Import CSV'}</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
        </div>
      </Card>

      {/* Account */}
      <Card>
        <h2 className="mb-3 font-display text-lg font-semibold">Account</h2>
        <Button variant="danger" onClick={() => supabase.auth.signOut()}>Sign out</Button>
      </Card>

      {/* Category modal */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title={editingCat ? 'Edit category' : `New ${kind} category`}>
        <form onSubmit={submitCat} className="space-y-4">
          <Field label="Name"><Input autoFocus placeholder="e.g. Coffee" value={catName} onChange={e => setCatName(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon" hint="Any emoji"><Input value={catIcon} onChange={e => setCatIcon(e.target.value)} maxLength={4} /></Field>
            <Field label="Color">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {PALETTE.map(c => (
                  <button key={c} type="button" onClick={() => setCatColor(c)} className={cls('h-7 w-7 rounded-full transition-transform', catColor === c && 'ring-2 ring-ink ring-offset-2 ring-offset-surface scale-110')} style={{ background: c }} />
                ))}
              </div>
            </Field>
          </div>
          {catError && <p className="text-sm font-medium text-neg">{catError}</p>}
          <div className="flex gap-2">
            {editingCat && <Button type="button" variant="danger" onClick={async () => { await delCategory.mutateAsync(editingCat.id); toast('Category deleted', 'neutral'); setCatOpen(false) }}>Delete</Button>}
            <Button type="submit" className="flex-1">{editingCat ? 'Save' : 'Create'}</Button>
          </div>
          {editingCat && <p className="text-xs text-soft">Deleting a category keeps its transactions but marks them uncategorized. Prefer archiving.</p>}
        </form>
      </Modal>
    </div>
  )
}
