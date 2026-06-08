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

function readableError(error) {
  if (!error) return null
  if (error.code === '23503') return 'No se puede eliminar porque existen registros relacionados.'
  if (error.code === '23505') return 'Ya existe un registro con ese valor único.'
  if (error.code === '42501') return 'No tienes permisos para realizar esta acción.'
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

export async function createRecord(resource, payload) {
  assertClient()
  const { data, error } = await supabase.from(resource).insert(payload).select().single()
  if (error) throw new Error(readableError(error))
  return data
}

export async function updateRecord(resource, id, payload) {
  assertClient()
  const { data, error } = await supabase.from(resource).update(payload).eq('id', id).select().single()
  if (error) throw new Error(readableError(error))
  return data
}

export async function deleteRecord(resource, id) {
  assertClient()
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
