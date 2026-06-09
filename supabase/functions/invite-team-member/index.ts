import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const allowedRoles = new Set(['account_manager','designer','social_media','video_editor'])

Deno.serve(async request => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error:'Método no permitido.' }), { status:405, headers })

  try {
    const authorization = request.headers.get('Authorization') || ''
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const callerClient = createClient(url, anonKey, { global:{ headers:{ Authorization:authorization } } })
    const adminClient = createClient(url, serviceKey, { auth:{ persistSession:false, autoRefreshToken:false } })
    const { data:{ user }, error:userError } = await callerClient.auth.getUser()
    if (userError || !user) throw new Error('Sesión administrativa inválida.')
    const { data:profile } = await adminClient.from('profiles').select('role').eq('id',user.id).single()
    if (profile?.role !== 'admin') return new Response(JSON.stringify({ error:'Solo un admin puede invitar colaboradores.' }), { status:403, headers })

    const { email, full_name, role } = await request.json()
    if (!email || !full_name || !allowedRoles.has(role)) return new Response(JSON.stringify({ error:'Nombre, email y rol operativo son obligatorios.' }), { status:400, headers })
    const siteUrl = Deno.env.get('SITE_URL') || request.headers.get('origin')
    const redirectTo = siteUrl ? `${siteUrl.replace(/\/$/, '')}/login` : undefined
    const { data:invitation, error:inviteError } = await adminClient.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), { data:{ full_name }, redirectTo })
    if (inviteError) throw inviteError
    const invitedUser = invitation.user
    if (!invitedUser) throw new Error('Supabase no devolvió el usuario invitado.')
    const { error:metadataError } = await adminClient.auth.admin.updateUserById(invitedUser.id, { app_metadata:{ role } })
    if (metadataError) throw metadataError
    const { error:profileError } = await adminClient.from('profiles').update({ full_name, email:email.trim().toLowerCase(), role }).eq('id',invitedUser.id)
    if (profileError) throw profileError
    return new Response(JSON.stringify({ id:invitedUser.id, email:invitedUser.email, role }), { status:200, headers })
  } catch (error) {
    console.error('[invite-team-member]', error)
    return new Response(JSON.stringify({ error:error.message || 'No se pudo invitar al colaborador.' }), { status:400, headers })
  }
})
