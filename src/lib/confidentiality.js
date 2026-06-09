import { supabase } from './supabase.js'

function assertSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado.')
}

function message(error, fallback) {
  if (!error) return fallback
  if (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) {
    return 'No tienes permisos para completar esta acción.'
  }
  return error.message || fallback
}

export async function getConfidentialityStatus(profile) {
  assertSupabase()
  if (profile.role !== 'client') return { required:false, agreement:null, accepted:true, client:null }
  if (!profile.client_id) throw new Error('Tu perfil no está vinculado a un cliente. Contacta a Biem Digital.')

  const [{ data: agreement, error: agreementError }, { data: client, error: clientError }] = await Promise.all([
    supabase.from('confidentiality_agreements').select('id,version,title,content,is_active,updated_at').eq('is_active', true).maybeSingle(),
    supabase.from('clients').select('id,name,brand_name,onboarding_type,onboarding_completed').eq('id', profile.client_id).single(),
  ])
  if (agreementError) throw new Error(message(agreementError, 'No se pudo cargar el compromiso de confidencialidad.'))
  if (clientError) throw new Error(message(clientError, 'No se pudo cargar la configuración del cliente.'))
  if (!agreement) return { required:false, agreement:null, accepted:true, client }

  const { data: acceptance, error: acceptanceError } = await supabase
    .from('client_confidentiality_acceptances')
    .select('id,agreement_id,agreement_version,accepted_at')
    .eq('user_id', profile.id)
    .eq('client_id', profile.client_id)
    .eq('agreement_id', agreement.id)
    .eq('agreement_version', agreement.version)
    .maybeSingle()
  if (acceptanceError) throw new Error(message(acceptanceError, 'No se pudo verificar tu aceptación.'))

  return { required:!acceptance, agreement, acceptance, accepted:Boolean(acceptance), client }
}

export async function acceptActiveConfidentiality(acceptedName) {
  assertSupabase()
  const { data, error } = await supabase.rpc('accept_active_confidentiality', {
    p_accepted_name: acceptedName || null,
    p_user_agent: navigator.userAgent,
  })
  if (error) throw new Error(message(error, 'No se pudo guardar la aceptación.'))
  return data
}

export function clientDestination(client) {
  if (client?.onboarding_completed) return '/client/dashboard'
  if (client?.onboarding_type === 'new') return '/client/onboarding'
  if (client?.onboarding_type === 'existing') return '/client/update-info'
  return '/client/dashboard'
}
