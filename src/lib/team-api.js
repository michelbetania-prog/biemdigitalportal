import { supabase } from './supabase.js'

const staffRoles=new Set(['account_manager','designer','social_media','video_editor'])
function assertStaff(profile){if(!supabase)throw new Error('Supabase no está configurado.');if(!staffRoles.has(profile.role))throw new Error('Esta vista requiere un rol interno de colaborador.')}
function fail(error,fallback){if(!error)return;if(error.code==='42501'||/row-level security|permission denied/i.test(error.message||''))throw new Error('No tienes permisos para consultar o modificar este registro.');throw new Error(error.message||fallback)}
const taskSelect='id,client_id,assigned_to,created_by,task_type,title,description,status,priority,due_date,completed_at,deliverable_id,related_deliverable_id,labels,primary_text,secondary_text,call_to_action,visual_instructions,result_url,internal_comment,created_at,updated_at,assignee:profiles!internal_tasks_assigned_to_fkey(id,full_name,email,role),creator:profiles!internal_tasks_created_by_fkey(id,full_name,email,role),deliverable:deliverables!internal_tasks_deliverable_id_fkey(id,name,content_type),comments:task_comments(id,user_id,comment,is_internal,created_at,author:profiles!task_comments_user_id_fkey(id,full_name,email,role)),attachments:task_attachments(id,client_id,uploaded_by,provider,file_name,file_url,file_type,visible_to_client,created_at,uploader:profiles!task_attachments_uploaded_by_fkey(id,full_name,email,role))'

export async function loadTeamWorkspace(profile){
  assertStaff(profile)
  const requestsQuery=profile.role==='account_manager'?supabase.from('requests').select('id,client_id,request_type,description,desired_due_date,priority,status,admin_response,created_at').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null})
  const [clients,tasks,deliverables,requests,resources,notes,brands,members]=await Promise.all([
    supabase.rpc('team_client_overview'),
    supabase.from('internal_tasks').select(taskSelect).order('due_date',{ascending:true,nullsFirst:false}),
    supabase.from('deliverables').select('id,client_id,assigned_to,name,content_type,description,status,priority,due_date,scheduled_at,file_url,publication_url,internal_comments,client_comments,updated_at,drive_assets:deliverable_drive_assets(id,name,drive_url,asset_type,visible_to_client,is_primary,status,sort_order,added_by)').order('due_date',{ascending:true,nullsFirst:false}),
    requestsQuery,
    supabase.from('client_resources').select('id,client_id,resource_type,title,content,file_url,status,created_at,updated_at').order('updated_at',{ascending:false}),
    supabase.from('internal_notes').select('id,client_id,created_by,note,visibility,specific_role,created_at').order('created_at',{ascending:false}),
    supabase.rpc('team_brand_context'),
    supabase.rpc('team_client_members'),
  ])
  for(const [result,label] of [[clients,'clientes'],[tasks,'tareas'],[deliverables,'entregables'],[requests,'solicitudes'],[resources,'materiales'],[notes,'notas'],[brands,'marcas'],[members,'equipo asignado']])fail(result.error,`No se pudieron cargar ${label}.`)
  return {clients:clients.data||[],tasks:tasks.data||[],deliverables:deliverables.data||[],requests:requests.data||[],resources:resources.data||[],notes:notes.data||[],brands:brands.data||[],members:members.data||[]}
}

export async function updateTeamTask(profile,id,patch){
  assertStaff(profile)
  const fields=profile.role==='account_manager'?['status','priority','assigned_to','due_date','result_url','internal_comment']:['status','result_url','internal_comment']
  const allowed=Object.fromEntries(Object.entries(patch).filter(([key])=>fields.includes(key)))
  const {error}=await supabase.from('internal_tasks').update(allowed).eq('id',id);fail(error,'No se pudo actualizar la tarea.')
}
export async function createTeamTask(profile,payload){
  assertStaff(profile)
  if(profile.role!=='account_manager')throw new Error('Solo el agente de cuenta puede crear tareas.')
  const {error}=await supabase.from('internal_tasks').insert({...payload,created_by:profile.id,status:payload.status||'todo',priority:payload.priority||'medium',internal_only:true,visible_to_client:false,visible_to_account_manager:true,visible_to_designer:payload.task_type==='design',visible_to_video_editor:payload.task_type==='video',visible_to_social_media:['social_media','copy','publication','client_delivery'].includes(payload.task_type)})
  fail(error,'No se pudo crear la tarea.')
}
export async function addTaskComment(taskId,comment){const {error}=await supabase.from('task_comments').insert({task_id:taskId,comment,is_internal:true});fail(error,'No se pudo agregar el comentario.')}
export async function addTaskAttachment(task,payload){if(!/^https:\/\/(drive|docs)\.google\.com\//i.test(payload.file_url||''))throw new Error('Usa un enlace válido de Google Drive o Google Docs.');const {error}=await supabase.from('task_attachments').insert({task_id:task.id,client_id:task.client_id,provider:'google_drive',file_name:payload.file_name,file_url:payload.file_url,file_type:payload.file_type||null,visible_to_client:false});fail(error,'No se pudo adjuntar el enlace.')}
export async function deleteTaskAttachment(id){const {error}=await supabase.from('task_attachments').delete().eq('id',id);fail(error,'No se pudo quitar el adjunto.')}
export async function updateTeamDeliverable(id,patch){const allowed=Object.fromEntries(Object.entries(patch).filter(([key])=>['status','file_url','publication_url','internal_comments'].includes(key)));const {error}=await supabase.from('deliverables').update(allowed).eq('id',id);fail(error,'No se pudo actualizar el entregable.')}
export async function createTeamResource(payload){const {error}=await supabase.from('client_resources').insert(payload);fail(error,'No se pudo crear el borrador estratégico.')}
export async function createTeamDeliverable(payload){const {error}=await supabase.from('deliverables').insert(payload);fail(error,'No se pudo crear el entregable.')}
export async function createTeamNote(payload){const {error}=await supabase.from('internal_notes').insert(payload);fail(error,'No se pudo crear la nota.')}
export async function respondToRequest(id,status,adminResponse){const {error}=await supabase.from('requests').update({status,admin_response:adminResponse}).eq('id',id);fail(error,'No se pudo responder la solicitud.')}
function validDriveUrl(value){return /^https:\/\/(drive|docs)\.google\.com\//i.test(value||'')}
export async function createTeamDriveAsset(profile,deliverable,payload){assertStaff(profile);if(!validDriveUrl(payload.drive_url))throw new Error('Usa un enlace válido de Google Drive o Google Docs.');const {error}=await supabase.from('deliverable_drive_assets').insert({deliverable_id:deliverable.id,client_id:deliverable.client_id,name:payload.name,drive_url:payload.drive_url,asset_type:payload.asset_type||'file',visible_to_client:Boolean(payload.visible_to_client),is_primary:Boolean(payload.is_primary),status:'active'});fail(error,'No se pudo vincular el archivo de Google Drive.')}
export async function deleteTeamDriveAsset(id){const {error}=await supabase.from('deliverable_drive_assets').delete().eq('id',id);fail(error,'No se pudo quitar el vínculo de Google Drive.')}
