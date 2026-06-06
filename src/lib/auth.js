import { supabase, supabaseConfigured } from './supabase.js'

export async function getAuthContext() {
  if (!supabaseConfigured) return { configured: false, session: null, profile: null, error: null }

  const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ])
  if (sessionError || userError || !sessionData.session || !userData.user) {
    return { configured: true, session: null, profile: null, error: sessionError || userError }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, client_id, created_at')
    .eq('id', userData.user.id)
    .single()

  return {
    configured: true,
    session: sessionData.session,
    profile,
    error: profileError,
  }
}

export async function signInWithPassword(email, password) {
  if (!supabaseConfigured) return { error: new Error('Supabase no está configurado.') }
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
  window.location.assign('/login')
}

export function destinationForRole(role) {
  if (role === 'admin') return '/admin'
  return '/dashboard'
}

export function subscribeToAuthChanges(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session))
  return () => data.subscription.unsubscribe()
}
