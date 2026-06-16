import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LINKS = [
  { to: '/calendar', icon: '🗓️', label: 'Calendar', desc: 'Daily spending at a glance' },
  { to: '/budgets', icon: '⚖️', label: 'Budgets', desc: 'Limits per category' },
  { to: '/goals', icon: '🎯', label: 'Goals', desc: 'Save toward what matters' },
  { to: '/accounts', icon: '🏦', label: 'Accounts', desc: 'Banks, cards, wallets, cash' },
  { to: '/recurring', icon: '🔁', label: 'Recurring', desc: 'Scheduled transactions' },
  { to: '/splits', icon: '🤝', label: 'Splits', desc: 'Shared expenses with people' },
  { to: '/settings', icon: '⚙️', label: 'Settings', desc: 'Categories, currency, data' }
]

export default function More() {
  return (
    <div className="rise space-y-6">
      <h1 className="font-display text-2xl font-semibold">More</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-surface2 text-xl">{l.icon}</span>
            <span>
              <span className="block font-medium">{l.label}</span>
              <span className="block text-sm text-soft">{l.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      <button onClick={() => supabase.auth.signOut()} className="text-sm text-neg hover:underline">Sign out</button>
    </div>
  )
}
