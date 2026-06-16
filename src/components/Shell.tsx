import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile, useRecurringRules, useUid } from '../api'
import { materializeDueRules } from '../lib/recurring'
import { useUI } from '../store'
import Logo from './Logo'
import TransactionForm from './TransactionForm'
import { Toaster, cls } from './ui'

const MAIN_NAV = [
  { to: '/', label: 'Home', icon: '\u2302' },
  { to: '/transactions', label: 'Activity', icon: '\u2261' },
  { to: '/analytics', label: 'Insights', icon: '\u25d4' },
  { to: '/calendar', label: 'Calendar', icon: '\u25a6' }
]

const MANAGE_NAV = [
  { to: '/budgets', label: 'Budgets', icon: '\u25cb' },
  { to: '/goals', label: 'Goals', icon: '\u2691' },
  { to: '/accounts', label: 'Accounts', icon: '\u25a4' },
  { to: '/recurring', label: 'Recurring', icon: '\u21bb' },
  { to: '/splits', label: 'Splits', icon: '\u26cb' }
]

const SETTINGS_NAV = { to: '/settings', label: 'Settings', icon: '\u2699' }

const MOBILE_NAV = [
  { to: '/', label: 'Home', icon: '\u2302' },
  { to: '/transactions', label: 'Activity', icon: '\u2261' },
  { to: '/analytics', label: 'Insights', icon: '\u25d4' },
  { to: '/more', label: 'More', icon: '\u22ef' }
]

function ThemeSync() {
  const { data: profile } = useProfile()
  useEffect(() => {
    const theme = profile?.theme || 'light'
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
  }, [profile?.theme])
  return null
}

function RecurringEngine() {
  const uid = useUid()
  const { data: rules } = useRecurringRules()
  const qc = useQueryClient()
  const toast = useUI(s => s.toast)
  const ran = useRef(false)
  useEffect(() => {
    if (!rules || ran.current) return
    ran.current = true
    materializeDueRules(uid, rules).then(posted => {
      if (posted > 0) {
        qc.invalidateQueries({ queryKey: ['transactions'] })
        qc.invalidateQueries({ queryKey: ['recurring_rules'] })
        toast(`Posted ${posted} scheduled transaction${posted === 1 ? '' : 's'}`, 'pos')
      }
    })
  }, [rules])
  return null
}

export default function Shell() {
  const { txFormOpen, setTxFormOpen } = useUI()
  return (
    <div className="ambient-bg flex h-full">
      <ThemeSync />
      <RecurringEngine />

      {/* Desktop sidebar */}
      <aside className="relative z-10 hidden w-60 shrink-0 flex-col border-r border-line bg-surface/80 px-4 py-6 backdrop-blur-sm md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <Logo className="h-9 w-9" />
         <span className="font-display text-xl font-semibold tracking-tight">Tally</span>
        </div>
        <button
          onClick={() => setTxFormOpen(true)}
          className="elev-2 lift mb-6 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accentink transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <span className="text-base leading-none">+</span> New transaction
        </button>
        <nav className="flex flex-1 flex-col gap-0.5">
          {MAIN_NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => cls(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-accentsoft font-medium text-accent' : 'text-soft hover:bg-surface2 hover:text-ink'
              )}
            >
              <span className="w-4 text-center">{n.icon}</span> {n.label}
            </NavLink>
          ))}

          <ManageGroup />

          <NavLink
            to={SETTINGS_NAV.to}
            end={SETTINGS_NAV.to === '/'}
            className={({ isActive }) => cls(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
              isActive ? 'bg-accentsoft font-medium text-accent' : 'text-soft hover:bg-surface2 hover:text-ink'
            )}
          >
            <span className="w-4 text-center">{SETTINGS_NAV.icon}</span> {SETTINGS_NAV.label}
          </NavLink>
        </nav>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="elev-3 fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="relative mx-auto flex max-w-md items-center justify-between px-6 py-2">
          {MOBILE_NAV.slice(0, 2).map(n => <MobileLink key={n.to} {...n} />)}
          <button
            onClick={() => setTxFormOpen(true)}
            aria-label="New transaction"
            className="elev-3 lift -mt-6 grid h-14 w-14 place-items-center rounded-full bg-accent text-2xl text-accentink transition-transform active:scale-95"
          >
            +
          </button>
          {MOBILE_NAV.slice(2).map(n => <MobileLink key={n.to} {...n} />)}
        </div>
      </nav>

      <TransactionForm open={txFormOpen} onClose={() => setTxFormOpen(false)} />
      <Toaster />
    </div>
  )
}

function ManageGroup() {
  const { pathname } = useLocation()
  const hasActiveChild = MANAGE_NAV.some(n => pathname === n.to || pathname.startsWith(n.to + '/'))
  const [open, setOpen] = useState(hasActiveChild)

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={cls(
          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors',
          hasActiveChild ? 'bg-accentsoft font-medium text-accent' : 'text-soft hover:bg-surface2 hover:text-ink'
        )}
      >
        <span className="flex items-center gap-3">
          <span className="w-4 text-center">{'\u25a3'}</span> Manage
        </span>
        <span
          className={cls(
            'inline-block text-xs transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        >
          {'\u2304'}
        </span>
      </button>

      {open && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-6">
          {MANAGE_NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => cls(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-accentsoft font-medium text-accent' : 'text-soft hover:bg-surface2 hover:text-ink'
              )}
            >
              <span className="w-4 text-center">{n.icon}</span> {n.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function MobileLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => cls('flex w-14 flex-col items-center gap-0.5 py-1 text-[11px]', isActive ? 'font-medium text-accent' : 'text-soft')}
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </NavLink>
  )
}
