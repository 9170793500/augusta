export interface Env {
  ASSETS: { fetch: typeof fetch }
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

const CONFIG_PATH = '/api/supabase-config'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === CONFIG_PATH) {
      const supabaseUrl = env.VITE_SUPABASE_URL?.trim()
      const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim()
      if (!supabaseUrl || !anonKey) {
        return Response.json({ error: 'Supabase not configured on worker' }, { status: 503 })
      }
      return Response.json(
        { url: supabaseUrl, anonKey },
        { headers: { 'Cache-Control': 'no-store' } }
      )
    }
    return env.ASSETS.fetch(request)
  },
}
