import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { DEFAULT_CATEGORIES } from './lib/seed'

interface AuthCtx {
  session: Session | null
  loading: boolean
}

const Ctx = createContext<AuthCtx>({ session: null, loading: true })
export const useAuth = () => useContext(Ctx)

/**
 * One in-flight seeding promise per user. React.StrictMode mounts effects twice
 * in development, which previously ran two concurrent seeds: both saw an empty
 * profile and both inserted the default categories and starter account,
 * duplicating every row. The map guarantees a single run per user per page load,
 * and each step below is independently idempotent (count-check before insert).
 */
const seeding = new Map<string, Promise<void>>()

function ensureProfile(uid: string): Promise<void> {
  const existing = seeding.get(uid)
  if (existing) return existing
  const run = (async () => {
    const { data: userResp } = await supabase.auth.getUser()
    const meta = (userResp.user?.user_metadata || {}) as { display_name?: string; dob?: string; gender?: string }
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', uid).maybeSingle()
    if (!profile) {
      await supabase.from('profiles').insert({
        id: uid,
        currency: 'INR',
        locale: 'en-IN',
        display_name: meta.display_name || null,
        dob: meta.dob || null,
        gender: meta.gender || null
      })
    }
    const { count: catCount } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('user_id', uid)
    if (!catCount) {
      await supabase.from('categories').insert(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, user_id: uid, sort: i })))
    }
    const { count: accCount } = await supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', uid)
    if (!accCount) {
      await supabase.from('accounts').insert([{ user_id: uid, name: 'Cash', type: 'cash', icon: '💵', color: '#7c9a6d', opening_balance: 0 }])
    }
  })()
  seeding.set(uid, run)
  return run
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const uid = session?.user.id
    if (!uid) return
    // Refresh caches once seeding completes so freshly seeded rows appear
    // immediately instead of waiting for the next unrelated invalidation.
    ensureProfile(uid).then(() => {
      for (const key of ['profile', 'categories', 'accounts']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    })
  }, [session?.user.id, qc])

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>
}
