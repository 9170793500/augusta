interface Env {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const ok = Boolean(context.env.VITE_SUPABASE_URL?.trim() && context.env.VITE_SUPABASE_ANON_KEY?.trim())
  return Response.json({ pagesFunctions: true, supabaseConfigured: ok }, { headers: { 'Cache-Control': 'no-store' } })
}