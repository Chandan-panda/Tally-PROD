import type { Account, Category, Transaction } from '../types'
import { supabase } from './supabase'

export function downloadFile(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function transactionsToCSV(txs: Transaction[], accounts: Account[], categories: Category[]): string {
  const acc = (id: string | null) => accounts.find(a => a.id === id)?.name || ''
  const cat = (id: string | null) => categories.find(c => c.id === id)?.name || ''
  const rows = [['date', 'type', 'amount', 'category', 'account', 'to_account', 'note', 'tags']]
  for (const t of txs) {
    rows.push([t.date, t.type, String(t.amount), cat(t.category_id), acc(t.account_id), acc(t.to_account_id), t.note || '', (t.tags || []).join('|')])
  }
  return rows.map(r => r.map(esc).join(',')).join('\n')
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cur); rows.push(row); row = []; cur = ''
    } else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows.filter(r => r.some(x => x.trim() !== ''))
}

// Parse a date cell into YYYY-MM-DD. Supports YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY (heuristic), DD-MM-YYYY.
function normalizeDate(raw: string): string | null {
  const s = (raw || '').trim()
  if (!s) return null
  // ISO already
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    let [, a, b, y] = m
    if (y.length === 2) y = (parseInt(y, 10) > 50 ? '19' : '20') + y
    const ai = parseInt(a, 10), bi = parseInt(b, 10)
    // If first part >12, must be day-first (DD/MM/YYYY). Otherwise default to DD/MM/YYYY.
    const day = ai > 12 ? ai : (bi > 12 ? bi : ai)
    const mon = ai > 12 ? bi : (bi > 12 ? ai : bi)
    if (day < 1 || day > 31 || mon < 1 || mon > 12) return null
    return `${y}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

/**
 * Imports transactions from a CSV. Unknown categories are mapped to "Miscellaneous"
 * (expense) or "Other income" (income) — never auto-created. Unknown accounts fall
 * back to the first existing account, or an "Imported" account if none exists.
 */
export async function importTransactionsCSV(
  uid: string, text: string, accounts: Account[], categories: Category[]
): Promise<{ imported: number; errors: number; skippedCategories: string[] }> {
  const rows = parseCSV(text)
  if (rows.length < 2) return { imported: 0, errors: 0, skippedCategories: [] }

  // Find the header row (some exports prepend empty/section rows). Pick the first
  // row that contains both "date" and "amount" cells.
  let headerIdx = -1
  let header: string[] = []
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const hh = rows[i].map(h => h.trim().toLowerCase())
    if (hh.includes('date') && hh.includes('amount')) { headerIdx = i; header = hh; break }
  }
  if (headerIdx < 0) throw new Error('CSV must include header row with at least "date" and "amount" columns')

  const col = (name: string) => header.indexOf(name)
  const ci = {
    date: col('date'), type: col('type'), amount: col('amount'),
    category: col('category'), account: col('account'),
    to: col('to_account'), note: col('note'), tags: col('tags'),
  }

  const accByName = new Map(accounts.map(a => [a.name.trim().toLowerCase(), a]))
  const catByName = new Map(categories.map(c => [`${c.kind}:${c.name.trim().toLowerCase()}`, c]))

  // Fallback categories — must already exist (seeded with defaults).
  const fallbackExpense = categories.find(c => c.kind === 'expense' && c.name.toLowerCase() === 'miscellaneous')
  const fallbackIncome = categories.find(c => c.kind === 'income' && c.name.toLowerCase() === 'other income')

  async function ensureFallback(kind: 'income' | 'expense'): Promise<string | null> {
    const existing = kind === 'expense' ? fallbackExpense : fallbackIncome
    if (existing) return existing.id
    const name = kind === 'expense' ? 'Miscellaneous' : 'Other income'
    const icon = kind === 'expense' ? '✨' : '➕'
    const { data } = await supabase.from('categories').insert({ user_id: uid, name, kind, icon, color: '#847c6e' }).select().single()
    return data?.id ?? null
  }

  async function ensureImportedAccount(): Promise<string> {
    const first = accounts[0]
    if (first) return first.id
    const k = 'imported'
    const hit = accByName.get(k)
    if (hit) return hit.id
    const { data, error } = await supabase.from('accounts').insert({ user_id: uid, name: 'Imported', type: 'bank' }).select().single()
    if (error || !data) throw error
    accByName.set(k, data as Account)
    return data.id
  }

  let imported = 0, errors = 0
  const unmatched = new Set<string>()
  const batch: Record<string, unknown>[] = []

  for (const r of rows.slice(headerIdx + 1)) {
    try {
      const rawType = (ci.type >= 0 ? (r[ci.type] || '').trim().toLowerCase() : 'expense')
      const type = (['income', 'expense', 'transfer'].includes(rawType) ? rawType : 'expense') as 'income' | 'expense' | 'transfer'
      const amountRaw = ci.amount >= 0 ? (r[ci.amount] || '').replace(/[, ]/g, '') : ''
      const amount = Math.abs(parseFloat(amountRaw))
      const date = normalizeDate(ci.date >= 0 ? r[ci.date] : '')
      if (!amount || !date) { errors++; continue }

      // Account: match existing case-insensitively, else fall back to first account.
      const accRaw = ci.account >= 0 ? (r[ci.account] || '').trim() : ''
      const accHit = accRaw ? accByName.get(accRaw.toLowerCase()) : undefined
      const account_id = accHit ? accHit.id : await ensureImportedAccount()

      let to_account_id: string | null = null
      if (type === 'transfer' && ci.to >= 0 && r[ci.to]?.trim()) {
        const toHit = accByName.get(r[ci.to].trim().toLowerCase())
        to_account_id = toHit ? toHit.id : null
      }

      // Category: ONLY use existing. Unknown → Miscellaneous / Other income.
      let category_id: string | null = null
      if (type !== 'transfer') {
        const catRaw = ci.category >= 0 ? (r[ci.category] || '').trim() : ''
        const hit = catRaw ? catByName.get(`${type}:${catRaw.toLowerCase()}`) : undefined
        if (hit) {
          category_id = hit.id
        } else {
          if (catRaw) unmatched.add(catRaw)
          category_id = await ensureFallback(type)
        }
      }

      const tags = ci.tags >= 0 && r[ci.tags]?.trim() ? r[ci.tags].split('|').map(s => s.trim()).filter(Boolean) : null
      batch.push({ user_id: uid, type, amount, date, account_id, to_account_id, category_id, note: ci.note >= 0 ? (r[ci.note] || null) : null, tags })
      imported++
    } catch {
      errors++
    }
  }

  for (let i = 0; i < batch.length; i += 200) {
    const { error } = await supabase.from('transactions').insert(batch.slice(i, i + 200))
    if (error) throw error
  }
  return { imported, errors, skippedCategories: Array.from(unmatched) }
}
