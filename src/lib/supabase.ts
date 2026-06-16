import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

// Vite env vars are injected at build time. The placeholder client prevents
// the app from crashing when production build env vars are missing, while the
// auth UI remains disabled until the real values are provided by the deployer.
const supabaseUrl = url || 'https://placeholder.supabase.co'
const supabaseAnonKey = key || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
