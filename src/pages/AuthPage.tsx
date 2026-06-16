import { useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { Button, Field, Input, Select, cls } from '../components/ui'

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

/**
 * Heuristic password strength based on common NIST-style guidance:
 * length is the dominant factor, character variety helps, common
 * patterns subtract. Returns 0..4 (Weak, Fair, Good, Strong, Excellent).
 */
export function scorePassword(pw: string): { score: number; label: string; tone: string } {
  if (!pw) return { score: 0, label: '—', tone: 'bg-line' }
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length
  if (variety >= 2) s++
  if (variety >= 3 && pw.length >= 10) s++
  if (variety === 4 && pw.length >= 14) s++
  if (/(.)\1{2,}/.test(pw)) s--                      // aaa, 111
  if (/^(?:password|qwerty|abc|123|letmein|admin)/i.test(pw)) s = 0
  s = Math.max(0, Math.min(4, s))
  const map = [
    { label: 'Too weak',  tone: 'bg-line' },
    { label: 'Weak',      tone: 'bg-neg' },
    { label: 'Fair',      tone: 'bg-warn' },
    { label: 'Strong',    tone: 'bg-accent' },
    { label: 'Excellent', tone: 'bg-pos' }
  ]
  return { score: s, ...map[s] }
}

function PasswordInput({
  value, onChange, autoComplete, placeholder, minLength
}: { value: string; onChange: (v: string) => void; autoComplete: string; placeholder?: string; minLength?: number }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder || '••••••••'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pr-16"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-soft hover:bg-surface2 hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const strength = useMemo(() => scorePassword(password), [password])
  const matches = confirm.length > 0 && confirm === password

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setInfo(''); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
      } else {
        if (!name.trim()) { setError('Please enter your name.'); return }
                const ageNum = Number(age)
                if (!ageNum || ageNum < 13 || ageNum > 99) { setError('Please enter a valid age (13–99).'); return }
        if (!gender) { setError('Please select a gender.'); return }
        if (strength.score < 2) { setError('Please choose a stronger password.'); return }
        if (password !== confirm) { setError('Passwords do not match.'); return }
        // Derive an approximate DOB from age (Jan 1) — users can refine it later in Settings.
        const dob = `${new Date().getFullYear() - ageNum}-01-01`
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name.trim(), dob, gender }
          }
        })
        if (error) setError(error.message)
        else if (!data.session) setInfo('Check your inbox — confirm your email to finish signing up.')
      }
    } finally {
      setBusy(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-hidden bg-bg p-6">
      {/* Ambient depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-accentsoft/60 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pos/10 blur-3xl" />
      </div>

      <div className="absolute left-6 top-6 z-10 flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent font-display text-lg font-semibold text-accentink shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25)]">T</div>
        <span className="font-display text-xl font-semibold tracking-tight">Tally</span>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div aria-hidden className="absolute inset-x-6 -bottom-3 h-8 rounded-3xl bg-ink/5 blur-xl" />
        <div aria-hidden className="absolute inset-x-3 -bottom-1.5 h-6 rounded-3xl border border-line/60 bg-surface/70" />

        <div className="rise relative rounded-3xl border border-line bg-surface p-8 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.25),0_8px_24px_-12px_rgba(15,23,42,0.15)] sm:p-10">
          <div className="text-center">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[2rem]">
              {isSignup ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm text-soft">
              {isSignup ? 'A few details and you\u2019re in.' : 'Sign in to continue to Tally.'}
            </p>
          </div>

          {!supabaseConfigured && (
            <div className="mt-6 rounded-xl border border-neg/30 bg-neg/5 p-4 text-sm text-neg">
              Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
            </div>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4">
            {isSignup && (
              <>
                <Field label="Name">
                  <Input required placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Age">
                    <Input type="number" min={13} max={99} required placeholder="e.g. 27" value={age} onChange={e => setAge(e.target.value)} />
                  </Field>
                  <Field label="Gender">
                    <Select required value={gender} onChange={e => setGender(e.target.value as Gender)}>
                      <option value="" disabled>Select</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </Select>
                  </Field>
                </div>
              </>
            )}

            <Field label="Email">
              <Input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>

            <Field label="Password">
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={isSignup ? 8 : 6}
              />
              {isSignup && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} className={cls('h-1.5 flex-1 rounded-full transition-colors', i < strength.score ? strength.tone : 'bg-line')} />
                    ))}
                  </div>
                  <p className="mt-1 flex justify-between text-xs text-soft">
                    <span>Strength: <span className="font-medium text-ink">{strength.label}</span></span>
                    <span className="text-[11px]">Use 12+ chars with mix of cases, numbers & symbols.</span>
                  </p>
                </div>
              )}
            </Field>

            {isSignup && (
              <Field label="Confirm password">
                <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={8} placeholder="Re-enter password" />
                {confirm.length > 0 && (
                  <p className={cls('mt-1 text-xs font-medium', matches ? 'text-pos' : 'text-neg')}>
                    {matches ? '\u2713 Passwords match' : 'Passwords do not match yet'}
                  </p>
                )}
              </Field>
            )}

            {error && <p className="text-sm font-medium text-neg">{error}</p>}
            {info && <p className="text-sm font-medium text-pos">{info}</p>}

            <Button
              type="submit"
              className="w-full rounded-full py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-12px_rgba(0,0,0,0.4)] transition-transform"
              disabled={busy || !supabaseConfigured}
            >
              {busy ? 'One moment\u2026' : isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(m => (m === 'signin' ? 'signup' : 'signin')); setError(''); setInfo('') }}
              className="text-sm text-soft underline-offset-4 hover:text-ink hover:underline"
            >
              {isSignup ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-soft">
          🔒 Private by design. Your data is yours alone.
        </p>
      </div>
    </div>
  )
}
