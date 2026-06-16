import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useMoneyFmt } from '../api'
import { useUI } from '../store'

export const cls = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ')

export function Button({ variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft' }) {
  const styles = {
    primary: 'bg-accent text-accentink hover:opacity-90 elev-2 lift',
    soft: 'bg-accentsoft text-accent hover:opacity-80',
    ghost: 'bg-transparent text-ink hover:bg-surface2 border border-line',
    danger: 'bg-transparent text-neg hover:bg-neg/10 border border-neg/30'
  }[variant]
  return (
    <button
      className={cls('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none', styles, className)}
      {...props}
    />
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cls('w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition-shadow placeholder:text-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/20', className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cls('w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20', className)} {...props} />
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-soft">{hint}</span>}
    </label>
  )
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cls('rounded-2xl border border-line bg-surface p-5 elev-1 lift', className)}>{children}</div>
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fadein absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className={cls('rise relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 elev-4 sm:rounded-3xl scroll-thin', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-soft hover:bg-surface2" aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

export function Segmented<T extends string>({ options, value, onChange, className }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cls('inline-flex rounded-xl bg-surface2 p-1', className)}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cls('rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all', value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-soft hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rise flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-14 text-center">
      <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-surface2 text-2xl">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-soft">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Progress({ value, color }: { value: number; color?: string }) {
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v * 100}%`, background: color || (value > 1 ? 'var(--negative)' : 'var(--accent)') }} />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cls('animate-pulse rounded-xl bg-surface2', className)} />
}

export function Spinner() {
  return <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
}

export function Money({ n, className }: { n: number; className?: string }) {
  const fmt = useMoneyFmt()
  return <span className={className}>{fmt(n)}</span>
}

export function Toaster() {
  const { toasts, dismiss } = useUI()
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2 sm:bottom-6">
      {toasts.map(t => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cls(
            'rise pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg',
            t.tone === 'pos' && 'bg-accent text-accentink',
            t.tone === 'neg' && 'bg-neg text-white',
            t.tone === 'neutral' && 'bg-ink text-bg'
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
