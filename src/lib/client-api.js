import { supabase } from './supabase.js'
import { loadActivePackages } from './package-api.js'

function assertClient(profile) {
  if (!supabase) throw new Error('Supabase no está configurado.')
  if (profile.role !== 'client' || !profile.client_id) throw new Error('Se requiere un perfil cliente válido.')
}
function fail(error,fallback){if(error)throw new Error(error.message||fallback)}

export async function loadClientWorkspace(profile) {
  assertClient(profile)
  const [account,deliverables,invoices,requests,tasks,resources,services,packages]=await Promise.all([
    supabase.rpc('client_account_overview').single(),
    supabase.rpc('client_deliverables'),
    supabase.rpc('client_invoices'),
    supabase.rpc('client_requests'),
    supabase.rpc('client_visible_tasks'),
    supabase.rpc('client_visible_resources'),
    supabase.from('extra_services').select('id,name,category,description,price_from,estimated_delivery').eq('is_active',true),
    loadActivePackages(),
  ])
  for(const [result,label] of [[account,'cuenta'],[deliverables,'entregables'],[invoices,'facturas'],[requests,'solicitudes'],[tasks,'próximos pasos'],[resources,'recomendaciones'],[services,'servicios'],])fail(result.error,`No se pudo cargar ${label}.`)
  return {account:account.data,deliverables:deliverables.data||[],invoices:invoices.data||[],requests:requests.data||[],tasks:tasks.data||[],resources:resources.data||[],services:services.data||[],packages:packages||[]}
}

export async function reviewClientDeliverable(id,action,comment=''){
  const {error}=await supabase.rpc('client_review_deliverable',{p_deliverable_id:id,p_action:action,p_comment:comment||null})
  fail(error,'No se pudo registrar la revisión.')
}

export async function createClientRequest(profile,payload){
  assertClient(profile)
  const {data,error}=await supabase.from('requests').insert({...payload,client_id:profile.client_id,requested_by:profile.id,status:'new'}).select('id').single()
  fail(error,'No se pudo crear la solicitud.')
  const {error:notificationError}=await supabase.functions.invoke('send-email-notification',{body:{notification_type:'request_created',related_entity_id:data.id}})
  if(notificationError)console.error('[BIEM email request_created]',notificationError)
}

export async function uploadClientMaterial(profile,payload){
  assertClient(profile)
  const {error}=await supabase.from('client_resources').insert({...payload,client_id:profile.client_id,created_by:profile.id,resource_type:payload.resource_type==='brief'?'brief':'brand_material',status:'draft',visible_to_client:true,internal_only:false})
  fail(error,'No se pudo registrar el material.')
}
