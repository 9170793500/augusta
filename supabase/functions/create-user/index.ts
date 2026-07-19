import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401)
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceKey)

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return json({ error: 'Only administrator can create users' }, 403)
    }

    const { email, password, full_name, apartment_no, role } = await req.json()
    const apt = String(apartment_no || '').trim().toUpperCase()
    const userRole = role === 'tenant' ? 'tenant' : 'owner'

    if (!email || !password || !full_name || !apt) {
      return json({ error: 'email, password, full_name and apartment_no are required' }, 400)
    }

    if (String(password).length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: {
        full_name: String(full_name).trim(),
        role: userRole,
        apartment_no: apt,
      },
    })

    if (createError) {
      return json({ error: createError.message }, 400)
    }

    if (created.user) {
      await adminClient
        .from('profiles')
        .update({
          full_name: String(full_name).trim(),
          role: userRole,
          apartment_no: apt,
          email: String(email).trim(),
        })
        .eq('id', created.user.id)

      const flatPatch =
        userRole === 'owner'
          ? { apartment_no: apt, owner_name: String(full_name).trim() }
          : { apartment_no: apt, tenant_name: String(full_name).trim(), occupancy_status: 'rented' }
      await adminClient.from('flats').upsert(flatPatch, { onConflict: 'apartment_no' })
    }

    return json({ ok: true, user_id: created.user?.id })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
