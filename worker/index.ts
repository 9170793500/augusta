export interface Env {
  ASSETS: { fetch: typeof fetch }
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

const CONFIG_PATHS = new Set(['/api/supabase-config', '/supabase-config.json'])

function supabaseConfigResponse(env: Env): Response {
  const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!supabaseUrl || !anonKey) {
    return Response.json(
      {
        error: 'Supabase not configured',
        hint: 'Cloudflare → Workers & Pages → augusta → Settings → Variables → add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Production), then redeploy with wrangler deploy.',
      },
      { status: 503 }
    )
  }
  return Response.json(
    { url: supabaseUrl, anonKey },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (CONFIG_PATHS.has(url.pathname)) {
      return supabaseConfigResponse(env)
    }
    if (url.pathname === '/api/health') {
      const ok = Boolean(env.VITE_SUPABASE_URL?.trim() && env.VITE_SUPABASE_ANON_KEY?.trim())
      return Response.json({ worker: true, supabaseConfigured: ok }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return env.ASSETS.fetch(request)
  },
}
