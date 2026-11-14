import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const authOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
} as const

function fromViteEnv(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey || url.includes('YOUR_PROJECT') || anonKey === 'YOUR_SUPABASE_ANON_KEY') {
    return null
  }
  return { url, anonKey }
}

async function fetchJsonConfig(path: string): Promise<{ url: string; anonKey: string } | null> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) return null
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) return null
  const json = (await res.json()) as { url?: string; anonKey?: string }
  const url = json.url?.trim()
  const anonKey = json.anonKey?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

async function loadConfig(): Promise<{ url: string; anonKey: string }> {
  const baked = fromViteEnv()
  if (baked) return baked

  const staticFile = await fetchJsonConfig('/supabase-config.json')
  if (staticFile) return staticFile

  const worker = await fetchJsonConfig('/api/supabase-config')
  if (worker) return worker

  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as Cloudflare Build variables, redeploy, or set them on Worker augusta → Settings → Variables.'
  )
}

let resolvedUrl: string | null = fromViteEnv()?.url ?? null

/** Set after {@link initSupabase} completes. */
export let isSupabaseConfigured = false

/** Live binding — assigned during init. */
export let supabase: SupabaseClient = createClient(
  'https://placeholder.supabase.co',
  'placeholder',
  authOptions
)

let initPromise: Promise<void> | null = null

export function initSupabase(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const { url, anonKey } = await loadConfig()
    resolvedUrl = url
    supabase = createClient(url, anonKey, authOptions)
    isSupabaseConfigured = true
  })()
  return initPromise
}

/** e.g. tzbzsgyhwsnzrgusridb */
export function supabaseProjectRef() {
  if (!resolvedUrl) return null
  const match = resolvedUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match?.[1] ?? null
}