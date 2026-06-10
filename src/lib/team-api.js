import { supabase } from './supabase.js'

const staffRoles = new Set(['account_manager','designer','social_media','video_editor'])

function assertStaff(profile) {
  if (!supabase) throw new Error('Supabase no está configurado.')
  if (!staffRoles.has(profile.role)) throw new Error('Esta vista requiere un rol interno de colaborador.')
}

function fail(error, fallback) {
  if (!error) return
  if (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) {
    throw new Error('No tienes permisos para consultar o modificar este registro.')
  }
  throw new Error(error.message || fallback)
}

export async function loadTeamWorkspace(profile) {
  assertStaff(profile)
  const requestsQuery = profile.role === 'account_manager'
    ? supabase.from('requests').select('id,client_id,request_type,description,desired_due_date,priority,status,admin_response,created_at').order('created_at',{ascending:false})
    : Promise.resolve({data:[],error:null})
  const [clientsResult,tasksResult,deliverablesResult,requestsResult,resourcesResult,notesResult] = await Promise.all([
    supabase.rpc('team_client_overview'),
    supabase.from('internal_tasks').select('id,client_id,assigned_to,task_type,title,description,status,priority,due_date,related_deliverable_id,result_url,internal_comment,created_at,updated_at').order('due_date',{ascending:true,nullsFirst:false}),
    supabase.from('deliverables').select('id,client_id,assigned_to,name,content_type,description,status,priority,due_date,scheduled_at,file_url,publication_url,internal_comments,client_comments,updated_at,drive_assets:deliverable_drive_assets(id,name,drive_url,asset_type,visible_to_client,is_primary,status,sort_order,added_by)').order('due_date',{ascending:true,nullsFirst:false}),
    requestsQuery,
    supabase.from('client_resources').select('id,client_id,resource_type,title,content,file_url,status,created_at,updated_at').order('updated_at',{ascending:false}),
    supabase.from('internal_notes').select('id,client_id,created_by,note,visibility,specific_role,created_at').order('created_at',{ascending:false}),
  ])
  for (const [result,label] of [[clientsResult,'clientes'],[tasksResult,'tareas'],[deliverablesResult,'entregables'],[requestsResult,'solicitudes'],[resourcesResult,'materiales'],[notesResult,'notas']]) fail(result.error,`No se pudieron cargar ${label}.`)
  return {
    clients:clientsResult.data||[], tasks:tasksResult.data||[], deliverables:deliverablesResult.data||[],
    requests:requestsResult.data||[], resources:resourcesResult.data||[], notes:notesResult.data||[],
  }
}

export async function updateTeamTask(id, patch) {
  const allowed = Object.fromEntries(Object.entries(patch).filter(([key])=>['status','result_url','internal_comment'].includes(key)))
  const { error } = await supabase.from('internal_tasks').update(allowed).eq('id',id)
  fail(error,'No se pudo actualizar la tarea.')
}

export async function updateTeamDeliverable(id, patch) {
  const allowed = Object.fromEntries(Object.entries(patch).filter(([key])=>['status','file_url','publication_url','internal_comments'].includes(key)))
  const { error } = await supabase.from('deliverables').update(allowed).eq('id',id)
  fail(error,'No se pudo actualizar el entregable.')
}


export async function createTeamResource(payload) {
  const { error } = await supabase.from('client_resources').insert(payload)
  fail(error,'No se pudo crear el borrador estratégico.')
}

export async function createTeamTask(payload) {
  const { error } = await supabase.from('internal_tasks').insert(payload)
  fail(error,'No se pudo crear la tarea.')
}


export async function createTeamDeliverable(payload) {
  const { error } = await supabase.from('deliverables').insert(payload)
  fail(error,'No se pudo crear el entregable.')
}

export async function createTeamNote(payload) {
  const { error } = await supabase.from('internal_notes').insert(payload)
  fail(error,'No se pudo crear la nota.')
}

export async function respondToRequest(id, status, adminResponse) {
  const { error } = await supabase.from('requests').update({status,admin_response:adminResponse}).eq('id',id)
  fail(error,'No se pudo responder la solicitud.')
}


function validDriveUrl(value) {
  return /^https:\/\/(drive|docs)\.google\.com\//i.test(value || '')
}

export async function createTeamDriveAsset(profile, deliverable, payload) {
  assertStaff(profile)
  if (!validDriveUrl(payload.drive_url)) throw new Error('Usa un enlace válido de Google Drive o Google Docs.')
  const { error } = await supabase.from('deliverable_drive_assets').insert({
    deliverable_id:deliverable.id,
    client_id:deliverable.client_id,
    name:payload.name,
    drive_url:payload.drive_url,
    asset_type:payload.asset_type || 'file',
    visible_to_client:Boolean(payload.visible_to_client),
    is_primary:Boolean(payload.is_primary),
    status:'active',
  })
  fail(error,'No se pudo vincular el archivo de Google Drive.')
}

export async function deleteTeamDriveAsset(id) {
  const { error } = await supabase.from('deliverable_drive_assets').delete().eq('id',id)
  fail(error,'No se pudo quitar el vínculo de Google Drive.')
}
