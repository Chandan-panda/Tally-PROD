import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { DEFAULT_CATEGORIES } from './lib/seed'

const GUEST_STORAGE_KEY = 'tally_guest_mode'

interface AuthCtx {
  session: Session | null
  loading: boolean
  isGuest: boolean
  enterGuest: () => void
  leaveGuest: () => void
  authPromptOpen: boolean
  setAuthPromptOpen: (open: boolean) => void
  requireAuth: () => void
}

const Ctx = createContext<AuthCtx>({
  session: null,
  loading: true,
  isGuest: false,
  enterGuest: () => {},
  leaveGuest: () => {},
  authPromptOpen: false,
  setAuthPromptOpen: () => {},
  requireAuth: () => {}
})

export const useAuth = () => useContext(Ctx)

const seeding = new Map<string, Promise<void>>()

function ensureProfile(uid: string): Promise<void> {
  const existing = seeding.get(uid)
  if (existing) return existing

  const run = (async () => {
    const { data: userResp } = await supabase.auth.getUser()
    const meta = (userResp.user?.user_metadata || {}) as {
      display_name?: string
      dob?: string
      gender?: string
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', uid)
      .maybeSingle()

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

    const { count: catCount } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)

    if (!catCount) {
      await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map((c, i) => ({
          ...c,
          user_id: uid,
          sort: i
        })))
    }

    const { count: accCount } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)

    if (!accCount) {
      await supabase.from('accounts').insert([
        {
          user_id: uid,
          name: 'Cash',
          type: 'cash',
          icon: '💵',
          color: '#7c9a6d',
          opening_balance: 0
        }
      ])
    }
  })()

  seeding.set(uid, run)
  return run
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const qc = useQueryClient()

  const enterGuest = () => {
    if (session) return

    window.localStorage.setItem(GUEST_STORAGE_KEY, 'true')
    setIsGuest(true)
  }

  const leaveGuest = () => {
    window.localStorage.removeItem(GUEST_STORAGE_KEY)
    setIsGuest(false)
  }

  const requireAuth = () => {
    setAuthPromptOpen(true)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsGuest(!data.session && window.localStorage.getItem(GUEST_STORAGE_KEY) === 'true')
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (nextSession) {
        window.localStorage.removeItem(GUEST_STORAGE_KEY)
        setIsGuest(false)
        setAuthPromptOpen(false)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const uid = session?.user.id
    if (!uid) return

    ensureProfile(uid).then(() => {
      for (const key of ['profile', 'categories', 'accounts']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    })
  }, [session?.user.id, qc])

  return (
    <Ctx.Provider
      value={{
        session,
        loading,
        isGuest,
        enterGuest,
        leaveGuest,
        authPromptOpen,
        setAuthPromptOpen,
        requireAuth
      }}
    >
      {children}
    </Ctx.Provider>
  )
}