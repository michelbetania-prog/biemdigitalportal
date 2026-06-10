import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const clean = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const optional = (value: unknown) => clean(value) || null
const validPassword = (value: string) => value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character]!))

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers:cors })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error:'Método no permitido.' }), { status:405, headers:cors })

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const caller = createClient(url, anonKey, { global:{ headers:{ Authorization:request.headers.get('Authorization') || '' } } })
  const admin = createClient(url, serviceKey, { auth:{ persistSession:false, autoRefreshToken:false } })
  let clientId: string | null = null
  let userId: string | null = null

  try {
    const { data:{ user }, error:userError } = await caller.auth.getUser()
    if (userError || !user) throw new Error('La sesión administrativa no es válida.')
    const { data:actor, error:actorError } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (actorError || actor?.role !== 'admin') return new Response(JSON.stringify({ error:'Solo un admin puede registrar clientes.' }), { status:403, headers:cors })

    const body = await request.json()
    const contactName = clean(body.contactName)
    const email = clean(body.email).toLowerCase()
    const password = String(body.password || '')
    const brandName = clean(body.brandName)
    const packageId = clean(body.packageId)
    const onboardingType = clean(body.onboardingType)
    if (!contactName || !email || !brandName || !packageId || !['new','existing'].includes(onboardingType)) throw new Error('Completa nombre, email, marca, paquete y tipo de cliente.')
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El correo electrónico no tiene un formato válido.')
    if (!validPassword(password)) throw new Error('La contraseña debe tener al menos 10 caracteres, mayúscula, minúscula, número y símbolo.')

    const [{ data:existingProfile }, { data:existingClient }, { data:packageRow }] = await Promise.all([
      admin.from('profiles').select('id').ilike('email', email).maybeSingle(),
      admin.from('clients').select('id').ilike('email', email).maybeSingle(),
      admin.from('packages').select('id,is_active').eq('id', packageId).maybeSingle(),
    ])
    if (existingProfile || existingClient) return new Response(JSON.stringify({ error:'Ya existe un usuario o cliente con este correo.' }), { status:409, headers:cors })
    if (!packageRow) throw new Error('El paquete seleccionado no existe.')
    if (!packageRow.is_active) throw new Error('El paquete seleccionado está inactivo.')

    const { data:client, error:clientError } = await admin.from('clients').insert({
      name:contactName,
      brand_name:brandName,
      email,
      phone:optional(body.phone),
      package_id:packageId,
      onboarding_type:onboardingType,
      onboarding_completed:false,
      status:'active',
      internal_notes:optional(body.internalNotes),
    }).select('id').single()
    if (clientError || !client) throw clientError || new Error('No se pudo crear el registro del cliente.')
    clientId = client.id

    const { data:authData, error:authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm:true,
      user_metadata:{ full_name:contactName, brand_name:brandName },
      app_metadata:{ role:'client', client_id:clientId },
    })
    if (authError || !authData.user) throw authError || new Error('Supabase Auth no devolvió el usuario creado.')
    userId = authData.user.id

    const { error:profileError } = await admin.from('profiles').upsert({
      id:userId,
      full_name:contactName,
      email,
      role:'client',
      client_id:clientId,
      updated_at:new Date().toISOString(),
    }, { onConflict:'id' })
    if (profileError) throw profileError

    const { error:brandError } = await admin.from('client_brand_profiles').upsert({
      client_id:clientId,
      brand_name:brandName,
      industry:optional(body.industry),
      brand_summary:optional(body.brandSummary),
      website_url:optional(body.websiteUrl),
      instagram_url:optional(body.instagramUrl),
      facebook_url:optional(body.facebookUrl),
      tiktok_url:optional(body.tiktokUrl),
      whatsapp_number:optional(body.whatsapp),
    }, { onConflict:'client_id' })
    if (brandError) throw brandError

    let accessEmailStatus = 'not_requested'
    if (body.sendAccessEmail === true) {
      const resendKey = Deno.env.get('RESEND_API_KEY')
      const siteUrl = (Deno.env.get('SITE_URL') || request.headers.get('origin') || '').replace(/\/$/, '')
      const from = Deno.env.get('EMAIL_FROM') || 'Biem Digital <portal@biemdigital.com>'
      const subject = 'Bienvenido/a a tu portal privado de Biem Digital'
      const { data:notification } = await admin.from('email_notifications').insert({
        client_id:clientId, user_id:userId, notification_type:'client_registered', recipient_email:email,
        subject, status:'pending', related_entity_type:'client', related_entity_id:clientId,
      }).select('id').single()
      try {
        if (!resendKey) throw new Error('RESEND_API_KEY no está configurada.')
        const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#243128"><p>Hola ${escapeHtml(contactName)},</p><h1>Bienvenido/a a tu portal privado de Biem Digital</h1><p>Desde este espacio podrás revisar entregables, solicitudes, facturación, reuniones y próximos pasos de ${escapeHtml(brandName)}.</p><p>Al ingresar deberás aceptar el compromiso de confidencialidad y completar ${onboardingType === 'new' ? 'tu onboarding inicial' : 'la confirmación de tus datos'}.</p><a href="${siteUrl}/login" style="display:inline-block;background:#31563e;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">Acceder al portal</a><p style="margin-top:24px;color:#718078">Por seguridad, la contraseña inicial no se incluye en este correo. Solicítala directamente a tu contacto de Biem Digital.</p></div>`
        const response = await fetch('https://api.resend.com/emails', { method:'POST', headers:{ Authorization:`Bearer ${resendKey}`, 'Content-Type':'application/json' }, body:JSON.stringify({ from, to:[email], subject, html }) })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Resend rechazó el correo.')
        if (notification) await admin.from('email_notifications').update({ status:'sent', sent_at:new Date().toISOString(), provider_message_id:result.id }).eq('id', notification.id)
        accessEmailStatus = 'sent'
      } catch (emailError) {
        if (notification) await admin.from('email_notifications').update({ status:'failed', error_message:emailError.message }).eq('id', notification.id)
        accessEmailStatus = 'failed'
      }
    }

    return new Response(JSON.stringify({ success:true, clientId, userId, accessEmailStatus, message:'Cliente y acceso creados correctamente.' }), { status:200, headers:cors })
  } catch (error) {
    console.error('[create-client-with-auth-user]', error)
    if (userId) {
      const { error:rollbackUserError } = await admin.auth.admin.deleteUser(userId)
      if (rollbackUserError) console.error('[create-client-with-auth-user] auth rollback failed', rollbackUserError)
    }
    if (clientId) {
      const { error:rollbackClientError } = await admin.from('clients').delete().eq('id', clientId)
      if (rollbackClientError) console.error('[create-client-with-auth-user] client rollback failed', rollbackClientError)
    }
    const duplicate = /already|registered|duplicate|unique/i.test(error.message || '')
    return new Response(JSON.stringify({ error:duplicate ? 'El correo ya está registrado en Supabase Auth o en el portal.' : error.message || 'No se pudo registrar el cliente.' }), { status:duplicate ? 409 : 400, headers:cors })
  }
})
