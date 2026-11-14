/** Cloudflare Pages: /api/supabase-config — set vars in project Settings → Variables and Secrets */
interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = context.env.VITE_SUPABASE_URL?.trim()
  const anonKey = context.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) {
    return Response.json(
      {
        error: 'Supabase not configured',
        hint: 'Pages project → Settings → Variables and Secrets → Add: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for Production and Preview.',
      },
      { status: 503 }
    )
  }
  return Response.json({ url, anonKey }, { headers: { 'Cache-Control': 'no-store' } })
}