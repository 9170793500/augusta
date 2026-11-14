import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

function readDotEnv() {
  const path = join(process.cwd(), '.env')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const dot = readDotEnv()
const url = (process.env.VITE_SUPABASE_URL ?? dot.VITE_SUPABASE_URL)?.trim()
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY ?? dot.VITE_SUPABASE_ANON_KEY)?.trim()
const dist = join(process.cwd(), 'dist')
const out = join(dist, 'supabase-config.json')

if (!existsSync(dist)) {
  console.warn('inject-supabase-config: dist/ missing — run vite build first')
  process.exit(0)
}

if (url && anonKey && !url.includes('YOUR_PROJECT') && anonKey !== 'YOUR_SUPABASE_ANON_KEY') {
  mkdirSync(dist, { recursive: true })
  writeFileSync(out, JSON.stringify({ url, anonKey }), 'utf8')
  console.log('Wrote dist/supabase-config.json for production runtime')
} else {
  console.warn(
    'inject-supabase-config: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not set — login will fail on production until Cloudflare Build variables are set.'
  )
}