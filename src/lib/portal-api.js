import { supabase } from './supabase.js'
import { loadActivePackages } from './package-api.js'
import { createClientRequest, loadClientWorkspace, reviewClientDeliverable, uploadClientMaterial } from './client-api.js'

export async function loadPortalWorkspace(profile) {
  const [workspace,brand,events,preferences] = await Promise.all([
    loadClientWorkspace(profile),
    supabase.rpc('client_brand_profile'),
    supabase.rpc('client_calendar_events'),
    supabase.from('client_notification_preferences').select('*').eq('user_id',profile.id).eq('client_id',profile.client_id).maybeSingle(),
  ])
  if (brand.error) throw new Error(brand.error.message)
  if (events.error) throw new Error(events.error.message)
  if (preferences.error) throw new Error(preferences.error.message)
  return {...workspace,brand:brand.data?.[0]||null,events:events.data||[],preferences:preferences.data||null}
}

export async function loadAdminClientPreview(clientId) {
  const [preview,packages]=await Promise.all([
    supabase.rpc('admin_client_preview',{p_client_id:clientId}),
    loadActivePackages(),
  ])
  if(preview.error)throw new Error(preview.error.message)
  return {...preview.data,packages:packages||[]}
}

export async function saveBrandBasics(payload) {
  const {error}=await supabase.rpc('update_client_brand_basics',{p_payload:payload})
  if(error)throw new Error(error.message)
}

export async function uploadBrandLogo(profile,file) {
  const extension=(file.name.split('.').pop()||'png').toLowerCase()
  const path=`clients/${profile.client_id}/brand/logo/logo-${Date.now()}.${extension}`
  const {error}=await supabase.storage.from('client-brand-assets').upload(path,file,{upsert:true,contentType:file.type})
  if(error)throw new Error(error.message)
  return supabase.storage.from('client-brand-assets').getPublicUrl(path).data.publicUrl
}

export async function saveNotificationPreferences(profile,values) {
  const {error}=await supabase.from('client_notification_preferences').upsert({client_id:profile.client_id,user_id:profile.id,...values},{onConflict:'client_id,user_id'})
  if(error)throw new Error(error.message)
}

export async function requestEventReschedule(id,note) {
  const {error}=await supabase.rpc('request_calendar_reschedule',{p_event_id:id,p_note:note})
  if(error)throw new Error(error.message)
}

export {createClientRequest,reviewClientDeliverable,uploadClientMaterial}
