import { supabase } from './supabase.js'

const selects = {
  clients: '*, packages(id,name)',
  packages: '*',
  invoices: '*, clients(id,brand_name), packages(id,name)',
  deliverables: '*, clients(id,brand_name)',
  requests: '*, clients(id,brand_name), extra_services(id,name)',
  extra_services: '*',
  profiles: 'id,full_name,email,role,client_id,created_at',
}

const ordering = {
  clients: ['brand_name', true],
  packages: ['name', true],
  invoices: ['due_date', false],
  deliverables: ['due_date', true],
  requests: ['created_at', false],
  extra_services: ['name', true],
  profiles: ['full_name', true],
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

export async function createRecord(resource, payload) {
  assertClient()
  await assertAdminMutation()
  const { data, error } = await supabase.from(resource).insert(payload).select().single()
  if (error) throw new Error(readableError(error))
  return data
}

export async function updateRecord(resource, id, payload) {
  assertClient()
  await assertAdminMutation()
  const { data, error } = await supabase.from(resource).update(payload).eq('id', id).select().single()
  if (error) throw new Error(readableError(error))
  return data
}

export async function deleteRecord(resource, id) {
  assertClient()
  await assertAdminMutation()
  const { error } = await supabase.from(resource).delete().eq('id', id)
  if (error) throw new Error(readableError(error))
}

export async function loadAdminWorkspace() {
  const resources = ['clients', 'packages', 'invoices', 'deliverables', 'requests', 'extra_services', 'profiles']
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
