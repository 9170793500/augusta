/** Cloudflare Pages: /supabase-config.json (same as API route) */
interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = context.env.VITE_SUPABASE_URL?.trim()
  const anonKey = context.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    return Response.json({ error: 'Supabase not configured' }, { status: 503 })
  }
  return Response.json({ url, anonKey }, { headers: { 'Cache-Control': 'no-store' } })
}