import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json' }
const subjects={client_registered:'Bienvenido/a a tu portal privado de Biem Digital',request_created:'Hemos recibido tu solicitud en Biem Digital',request_updated:'Tu solicitud ha sido actualizada',deliverable_ready:'Tienes un entregable listo para revisar',invoice_created:'Tu factura está disponible',invoice_reminder:'Recordatorio: tu factura está próxima a vencer',recommendation_created:'Nueva recomendación estratégica disponible',calendar_invitation:'Nueva reunión programada con Biem Digital',calendar_updated:'Tu reunión con Biem Digital fue actualizada'}
const prefColumn={request_created:'request_updates',request_updated:'request_updates',deliverable_ready:'deliverable_updates',invoice_created:'invoice_updates',invoice_reminder:'invoice_updates',recommendation_created:'recommendation_updates',calendar_invitation:'calendar_updates',calendar_updated:'calendar_updates'}
const esc=(value='')=>String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!))

Deno.serve(async request=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return new Response(JSON.stringify({error:'Método no permitido.'}),{status:405,headers:cors})
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, resendKey=Deno.env.get('RESEND_API_KEY')
  const site=(Deno.env.get('SITE_URL')||request.headers.get('origin')||'').replace(/\/$/,'')
  const configuredFrom=Deno.env.get('EMAIL_FROM')
  const caller=createClient(url,anon,{global:{headers:{Authorization:request.headers.get('Authorization')||''}}})
  const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}})
  try{
    const {data:{user}}=await caller.auth.getUser(); if(!user)throw new Error('Sesión inválida.')
    const {data:actor}=await db.from('profiles').select('id,role,client_id,full_name,email').eq('id',user.id).single()
    const {data:portalConfig}=await db.from('portal_settings').select('*').eq('id',true).maybeSingle()
    const agencyName=portalConfig?.agency_name||'Biem Digital', commercialName=portalConfig?.commercial_name||agencyName
    const from=configuredFrom||`${commercialName} <portal@biemdigital.com>`
    const {notification_type,related_entity_id,client_id:requestedClientId}=await request.json()
    if(!subjects[notification_type])throw new Error('Tipo de notificación no permitido.')
    let clientId=requestedClientId, title='', detail='', action='/client/dashboard'
    if(notification_type.startsWith('request_')){const {data}=await db.from('requests').select('client_id,request_type,description,status,admin_response').eq('id',related_entity_id).single(); if(!data)throw new Error('Solicitud no encontrada.'); clientId=data.client_id;title=data.request_type;detail=notification_type==='request_created'?data.description:`Estado: ${data.status}. ${data.admin_response||''}`;action='/client/dashboard'}
    if(notification_type==='deliverable_ready'){const {data}=await db.from('deliverables').select('client_id,name,content_type,due_date').eq('id',related_entity_id).single();if(!data)throw new Error('Entregable no encontrado.');clientId=data.client_id;title=data.name;detail=`${data.content_type||'Entregable'} · ${data.due_date||'Sin fecha'}`;action='/client/dashboard'}
    if(notification_type.startsWith('invoice_')){const {data}=await db.from('invoices').select('client_id,invoice_number,amount,currency,due_date,status').eq('id',related_entity_id).single();if(!data)throw new Error('Factura no encontrada.');clientId=data.client_id;title=`Factura ${data.invoice_number}`;detail=`${data.currency} ${data.amount} · vence ${data.due_date} · ${data.status}`;action='/client/dashboard'}
    if(notification_type==='recommendation_created'){const {data}=await db.from('client_resources').select('client_id,title,content').eq('id',related_entity_id).single();if(!data)throw new Error('Recomendación no encontrada.');clientId=data.client_id;title=data.title;detail=data.content||'';action='/client/dashboard'}
    if(notification_type.startsWith('calendar_')){const {data}=await db.from('calendar_events').select('client_id,title,description,start_time,google_meet_link').eq('id',related_entity_id).single();if(!data)throw new Error('Evento no encontrado.');clientId=data.client_id;title=data.title;detail=`${new Date(data.start_time).toLocaleString('es')} · ${data.description||''}`;action='/client/dashboard'}
    if(!clientId)throw new Error('No se pudo determinar el cliente.')
    if(actor.role==='client'&&actor.client_id!==clientId)throw new Error('No tienes acceso a este cliente.')
    if(!['admin','account_manager','client'].includes(actor.role))throw new Error('Tu rol no puede enviar esta notificación.')
    if(actor.role==='account_manager'){const {data:assigned}=await db.from('client_team_assignments').select('id').eq('client_id',clientId).eq('user_id',user.id).eq('is_active',true).maybeSingle();if(!assigned)throw new Error('No estás asignado a este cliente.')}
    const {data:client}=await db.from('clients').select('id,brand_name,name,email').eq('id',clientId).single()
    const {data:recipients}=await db.from('profiles').select('id,email,full_name').eq('client_id',clientId).eq('role','client')
    const clientRecipients=(recipients||[]).filter(item=>item.email)
    if(!clientRecipients.length&&client?.email)clientRecipients.push({id:null,email:client.email,full_name:client.name})
    const results=[]
    for(const recipient of clientRecipients){
      const {data:preference}=recipient.id?await db.from('client_notification_preferences').select('*').eq('client_id',clientId).eq('user_id',recipient.id).maybeSingle():{data:null}
      if(preference&&(preference.email_enabled===false||(prefColumn[notification_type]&&preference[prefColumn[notification_type]]===false)))continue
      const subject=subjects[notification_type].replaceAll('Biem Digital',agencyName), notification={client_id:clientId,user_id:recipient.id,notification_type,recipient_email:recipient.email,subject,related_entity_type:notification_type.split('_')[0],related_entity_id,status:'pending'}
      const {data:log}=await db.from('email_notifications').insert(notification).select('id').single()
      try{
        if(!resendKey)throw new Error('RESEND_API_KEY no está configurada.')
        const brandHeader=portalConfig?.main_logo_url?`<img src="${esc(portalConfig.main_logo_url)}" alt="${esc(agencyName)}" style="max-width:180px;max-height:60px;object-fit:contain">`:`<strong style="font-size:22px">${esc(agencyName)}</strong>`
        const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:${esc(portalConfig?.text_color||'#1F1A24')}"><div style="padding:18px;background:${esc(portalConfig?.primary_color||'#4B0082')};color:white;border-radius:12px 12px 0 0">${brandHeader}</div><div style="padding:24px;border:1px solid ${esc(portalConfig?.border_color||'#D8D2E6')}"><p>Hola ${esc(recipient.full_name||client?.brand_name||'')}</p><h1>${esc(subject)}</h1><h2>${esc(title)}</h2><p style="line-height:1.6">${esc(detail)}</p><a href="${site}${action}" style="display:inline-block;background:${esc(portalConfig?.accent_color||'#C46A2D')};color:white;padding:12px 18px;border-radius:${Number(portalConfig?.border_radius||12)}px;text-decoration:none">Ver en el portal</a><p style="margin-top:28px;color:${esc(portalConfig?.muted_text_color||'#6B6472')}">${esc(commercialName)} · ${esc(portalConfig?.portal_name||'Portal privado')}</p></div></div>`
        const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[recipient.email],subject,html})});const payload=await response.json();if(!response.ok)throw new Error(payload.message||'Resend rechazó el correo.')
        await db.from('email_notifications').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:payload.id,error_message:null}).eq('id',log.id);results.push({email:recipient.email,status:'sent'})
      }catch(error){await db.from('email_notifications').update({status:'failed',error_message:error.message}).eq('id',log.id);results.push({email:recipient.email,status:'failed',error:error.message})}
    }
    // Internal alert for a request created by a client.
    if(notification_type==='request_created'&&actor.role==='client'){
      const {data:staff}=await db.from('profiles').select('id,email,full_name,role').in('role',['admin','account_manager'])
      const {data:assignments}=await db.from('client_team_assignments').select('user_id').eq('client_id',clientId).eq('role_on_client','account_manager').eq('is_active',true)
      const assigned=new Set((assignments||[]).map(item=>item.user_id))
      for(const member of (staff||[]).filter(item=>item.email&&(item.role==='admin'||assigned.has(item.id)))){
        const subject=`Nueva solicitud de cliente: ${client?.brand_name||'Cliente'}`;const {data:log}=await db.from('email_notifications').insert({client_id:clientId,user_id:member.id,notification_type:'request_created',recipient_email:member.email,subject,related_entity_type:'request',related_entity_id,status:'pending'}).select('id').single()
        try{if(!resendKey)throw new Error('RESEND_API_KEY no está configurada.');const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${resendKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[member.email],subject,html:`<h1>${esc(subject)}</h1><h2>${esc(title)}</h2><p>${esc(detail)}</p><a href="${site}/admin/dashboard">Ver solicitud en ${esc(agencyName)}</a>`})});const payload=await response.json();if(!response.ok)throw new Error(payload.message||'Error de Resend');await db.from('email_notifications').update({status:'sent',sent_at:new Date().toISOString(),provider_message_id:payload.id}).eq('id',log.id)}catch(error){await db.from('email_notifications').update({status:'failed',error_message:error.message}).eq('id',log.id)}}
    }
    return new Response(JSON.stringify({ok:true,results}),{headers:cors})
  }catch(error){console.error('[send-email-notification]',error);return new Response(JSON.stringify({error:error.message||'No se pudo enviar la notificación.'}),{status:400,headers:cors})}
})
