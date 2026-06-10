import { supabase } from './supabase.js'

const selects = {
  clients: '*, packages(id,name)',
  packages: '*',
  invoices: '*, clients(id,brand_name), packages(id,name)',
  deliverables: '*, clients(id,brand_name), drive_assets:deliverable_drive_assets(id,name,drive_url,asset_type,visible_to_client,is_primary,status,sort_order)',
  deliverable_drive_assets: '*, deliverable:deliverables!deliverable_drive_assets_deliverable_id_fkey(id,name,content_type), client:clients!deliverable_drive_assets_client_id_fkey(id,brand_name), added_by_profile:profiles!deliverable_drive_assets_added_by_fkey(id,full_name,email)',
  requests: '*, clients(id,brand_name), extra_services(id,name)',
  extra_services: '*',
  profiles: 'id,full_name,email,role,client_id,created_at',
  client_team_assignments: '*, client:clients!client_team_assignments_client_id_fkey(id,brand_name), team_member:profiles!client_team_assignments_user_id_fkey(id,full_name,email,role), assigned_by_profile:profiles!client_team_assignments_assigned_by_fkey(id,full_name,email,role)',
  internal_tasks: '*, client:clients!internal_tasks_client_id_fkey(id,brand_name), assignee_profile:profiles!internal_tasks_assigned_to_fkey(id,full_name,email,role), created_by_profile:profiles!internal_tasks_created_by_fkey(id,full_name,email,role)',
  internal_notes: '*, client:clients!internal_notes_client_id_fkey(id,brand_name), created_by_profile:profiles!internal_notes_created_by_fkey(id,full_name,email,role)',
  client_resources: '*, client:clients!client_resources_client_id_fkey(id,brand_name), created_by_profile:profiles!client_resources_created_by_fkey(id,full_name,email,role)',
  client_brand_profiles: '*, client:clients!client_brand_profiles_client_id_fkey(id,brand_name)',
  calendar_events: '*, client:clients!calendar_events_client_id_fkey(id,brand_name), creator:profiles!calendar_events_created_by_fkey(id,full_name,email)',
  email_notifications: '*, client:clients!email_notifications_client_id_fkey(id,brand_name)',
}

const ordering = {
  clients: ['brand_name', true],
  packages: ['name', true],
  invoices: ['due_date', false],
  deliverables: ['due_date', true],
  deliverable_drive_assets: ['created_at', false],
  requests: ['created_at', false],
  extra_services: ['name', true],
  profiles: ['full_name', true],
  client_team_assignments: ['created_at', false],
  internal_tasks: ['due_date', true],
  internal_notes: ['created_at', false],
  client_resources: ['updated_at', false],
  client_brand_profiles: ['updated_at', false],
  calendar_events: ['start_time', true],
  email_notifications: ['created_at', false],
  confidentiality_agreements: ['created_at', false],
  client_confidentiality_acceptances: ['accepted_at', false],
}

function assertClient() {
  if (!supabase) throw new Error('Supabase no está configurado.')
}

export function readableError(error) {
  if (!error) return null
  if (error.code === '23503') return 'No se puede eliminar porque existen registros relacionados.'
  if (error.code === '23505') return 'Ya existe un registro con ese valor único.'
  if (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) return 'Supabase bloqueó la operación. Confirma que tu perfil tenga role = admin y que la migración RLS más reciente esté aplicada.'
  if (error.code === '23502') return `Falta un valor obligatorio${error.details ? `: ${error.details}` : '.'}`
  if (error.code === '22P02') return 'Uno de los valores tiene un formato inválido. Revisa números, fechas y relaciones.'
  if (error.code === '23514') return 'Uno de los valores no cumple las reglas de validación de la tabla.'
  return error.message || 'Ocurrió un error al guardar los cambios.'
}

export async function listRecords(resource) {
  assertClient()
  const [column, ascending] = ordering[resource] || ['created_at', false]
  const { data, error } = await supabase
    .from(resource)
    .select(selects[resource] || '*')
    .order(column, { ascending, nullsFirst: false })

  if (error) throw new Error(readableError(error))
  return data || []
}


export async function getCurrentDatabaseRole() {
  assertClient()
  const { data, error } = await supabase.rpc('current_user_role')
  if (error) throw new Error(readableError(error))
  return data
}

async function assertAdminMutation() {
  const role = await getCurrentDatabaseRole()
  if (role !== 'admin') {
    throw new Error('Esta operación requiere role = admin en public.profiles.')
  }
}


async function notifyForMutation(resource, record, operation) {
  const type = resource==='invoices'&&operation==='create'?'invoice_created':resource==='deliverables'&&record.status==='client_review'?'deliverable_ready':resource==='requests'&&operation==='update'?'request_updated':resource==='client_resources'&&record.resource_type==='recommendation'&&record.visible_to_client?'recommendation_created':resource==='calendar_events'?(operation==='create'?'calendar_invitation':'calendar_updated'):null
  if(!type)return
  const {error}=await supabase.functions.invoke('send-email-notification',{body:{notification_type:type,related_entity_id:record.id,client_id:record.client_id}})
  if(error)console.error(`[BIEM email ${type}]`,error)
}

export async function createRecord(resource, payload) {
  assertClient()
  await assertAdminMutation()
  const { data, error } = await supabase.from(resource).insert(payload).select().single()
  if (error) throw new Error(readableError(error))
  await notifyForMutation(resource,data,'create')
  return data
}

export async function updateRecord(resource, id, payload) {
  assertClient()
  await assertAdminMutation()
  const { data, error } = await supabase.from(resource).update(payload).eq('id', id).select().single()
  if (error) throw new Error(readableError(error))
  await notifyForMutation(resource,data,'update')
  return data
}

export async function deleteRecord(resource, id) {
  assertClient()
  await assertAdminMutation()
  const { error } = await supabase.from(resource).delete().eq('id', id)
  if (error) throw new Error(readableError(error))
}

export async function loadAdminWorkspace() {
  const resources = ['clients', 'packages', 'invoices', 'deliverables', 'deliverable_drive_assets', 'requests', 'extra_services', 'profiles', 'client_team_assignments', 'internal_tasks', 'internal_notes', 'client_resources', 'client_brand_profiles', 'calendar_events', 'email_notifications', 'confidentiality_agreements', 'client_confidentiality_acceptances']
  const entries = await Promise.all(resources.map(async resource => [resource, await listRecords(resource)]))
  const workspace = Object.fromEntries(entries)
  const profileById = new Map(workspace.profiles.map(profile => [profile.id, profile]))
  for (const resource of ['clients', 'invoices', 'deliverables', 'requests']) {
    workspace[resource] = workspace[resource].map(record => ({
      ...record,
      assignee: record.assigned_to ? profileById.get(record.assigned_to) || null : null,
    }))
  }
  return workspace
}


export async function loadConfidentialityAdmin() {
  assertClient()
  const [{ data: agreements, error: agreementsError }, { data: acceptances, error: acceptancesError }] = await Promise.all([
    supabase.from('confidentiality_agreements').select('*').order('created_at', { ascending:false }),
    supabase.from('client_confidentiality_acceptances').select('*, clients(id,brand_name)').order('accepted_at', { ascending:false }),
  ])
  if (agreementsError) throw new Error(readableError(agreementsError))
  if (acceptancesError) throw new Error(readableError(acceptancesError))
  return { agreements:agreements || [], acceptances:acceptances || [] }
}

export async function activateConfidentialityAgreement(id) {
  assertClient()
  await assertAdminMutation()
  const { error } = await supabase.rpc('activate_confidentiality_agreement', { p_agreement_id:id })
  if (error) throw new Error(readableError(error))
}


export async function inviteTeamMember(payload) {
  assertClient()
  await assertAdminMutation()
  const { data, error } = await supabase.functions.invoke('invite-team-member', { body:payload })
  if (error) throw new Error(error.message || 'No se pudo invitar al colaborador.')
  if (data?.error) throw new Error(data.error)
  return data
}


export async function uploadAdminBrandLogo(clientId,file) {
  assertClient()
  await assertAdminMutation()
  const extension=(file.name.split('.').pop()||'png').toLowerCase()
  const path=`clients/${clientId}/brand/logo/admin-logo-${Date.now()}.${extension}`
  const {error}=await supabase.storage.from('client-brand-assets').upload(path,file,{upsert:true,contentType:file.type})
  if(error)throw new Error(readableError(error))
  return supabase.storage.from('client-brand-assets').getPublicUrl(path).data.publicUrl
}

export async function createClientWithAuthUser(payload) {
  assertClient()
  await assertAdminMutation()
  const { data, error } = await supabase.functions.invoke('create-client-with-auth-user', { body:payload })
  if (error) {
    let message=error.message || 'No se pudo registrar el cliente.'
    try {
      const context=error.context
      if(context?.json) message=(await context.json())?.error || message
    } catch {}
    throw new Error(message)
  }
  if (data?.error) throw new Error(data.error)
  if (!data?.success || !data.clientId || !data.userId) throw new Error('La función no devolvió un registro de cliente válido.')
  return data
}
