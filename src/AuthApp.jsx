import { createElement, Fragment, useState } from './mini-react.js'
import { ArrowRight, Eye, Lock, Shield } from './icons.jsx'
import AdminClientPreview from './AdminClientPreview.jsx'
import ClientPortalApp from './ClientPortalApp.jsx'
import AdminApp from './AdminApp.jsx'
import ClientSetupScreen from './ClientSetupScreen.jsx'
import FirstLoginConfidentialityScreen from './FirstLoginConfidentialityScreen.jsx'
import TeamApp from './TeamApp.jsx'
import { destinationForRole, getAuthContext, signInWithPassword, signOut, subscribeToAuthChanges, teamRoleRoutes } from './lib/auth.js'
import { supabase } from './lib/supabase.js'

let authRequest
let authListenerStarted = false

function navigate(path, replace = false) {
  if (replace) window.location.replace(path)
  else window.location.assign(path)
}

function LoadingScreen() {
  return <div className="auth-state-screen"><div className="auth-spinner"/><p>Verificando acceso seguro...</p></div>
}

function ConfigurationScreen() {
  return <div className="auth-state-screen"><div className="auth-state-card"><Shield size={26}/><h1>Configura Supabase</h1><p>Define <code>SUPABASE_URL</code> y <code>SUPABASE_PUBLISHABLE_KEY</code> en el entorno de despliegue y vuelve a ejecutar el build.</p><span>Consulta <code>SUPABASE.md</code> en el repositorio.</span></div></div>
}

function AccessDenied({ profile }) {
  return <div className="auth-state-screen"><div className="auth-state-card denied"><Lock size={26}/><span>ACCESO RESTRINGIDO</span><h1>Esta sección no está disponible para tu rol.</h1><p>Tu sesión está activa como <strong>{profile.role}</strong>. Las políticas RLS también impiden acceder a información fuera de tus permisos.</p><button className="admin-primary" onClick={() => navigate(destinationForRole(profile.role))}>Volver a mi espacio</button><button className="auth-link" onClick={signOut}>Cerrar sesión</button></div></div>
}

function LoginPage({ context }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (context.session && context.profile) {
    queueMicrotask(() => navigate(destinationForRole(context.profile.role), true))
    return <LoadingScreen />
  }

  const submit = async event => {
    event?.preventDefault?.()
    setLoading(true)
    setError('')
    const { data, error: signInError } = await signInWithPassword(email.trim(), password)
    if (signInError) {
      setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.')
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('No se pudo crear una sesión segura.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      setError('Tu usuario no tiene un perfil válido. Contacta al administrador.')
      setLoading(false)
      return
    }
    navigate(destinationForRole(profile.role), true)
  }

  return <div className="admin-login-shell">
    <div className="admin-login-brand"><div className="admin-logo"><span className="logo-mark"><i/><i/><i/></span><span>biem<span>.</span></span></div><div><span>PORTAL SEGURO</span><h1>Tu trabajo.<br/>Tu equipo.<br/><i>En un solo lugar.</i></h1><p>Accede al espacio correspondiente a tu cuenta y rol dentro de Biem Digital.</p></div><small>© 2026 Biem Digital · Acceso confidencial</small></div>
    <div className="admin-login-panel"><form className="login-card" onSubmit={submit}><div className="login-lock"><Lock size={20}/></div><span className="admin-eyebrow">ACCESO AL PORTAL</span><h2>Bienvenido de nuevo</h2><p>Ingresa con el correo asociado a tu cuenta.</p><label>Correo electrónico<input data-focus-id="login-email" type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="tu@empresa.com" required/></label><label>Contraseña<div className="password-input"><input data-focus-id="login-password" type={visible?'text':'password'} value={password} onChange={event=>setPassword(event.target.value)} required/><button type="button" onClick={()=>setVisible(!visible)}><Eye size={17}/></button></div></label>{error&&<div className="auth-error">{error}</div>}<div className="login-meta"><label><input type="checkbox"/> Recordarme</label><button type="button">¿Olvidaste tu contraseña?</button></div><button className="admin-primary login-submit" type="submit" disabled={loading||!email||!password}>{loading?'Ingresando...':<>Ingresar al portal <ArrowRight size={17}/></>}</button><div className="demo-access"><Shield size={15}/><span><strong>Protegido por Supabase Auth</strong>Tu acceso y permisos se validan en cada solicitud.</span></div></form></div>
  </div>
}

export default function AuthApp() {
  const [context, setContext] = useState(null)
  if (!authRequest) authRequest = getAuthContext()
  if (!authListenerStarted) {
    authListenerStarted = true
    subscribeToAuthChanges(event => {
      if (event === 'SIGNED_OUT') window.location.replace('/login')
    })
  }
  if (!context) {
    authRequest.then(result => {
      setContext(result)
    })
    return <LoadingScreen />
  }

  if (!context.configured) return <ConfigurationScreen />

  const path = window.location.pathname
  if (path === '/login') return <LoginPage context={context} />

  if (!context.session || !context.profile) {
    window.history.replaceState({}, '', '/login')
    return <LoginPage context={context} />
  }

  const previewMatch=path.match(/^\/admin\/preview-client\/([0-9a-f-]+)$/i)
  if(previewMatch){
    if(context.profile.role!=='admin')return <AccessDenied profile={context.profile}/>
    return <AdminClientPreview clientId={previewMatch[1]} profile={context.profile} onExit={()=>navigate('/admin/dashboard')}/>
  }

  if (path.startsWith('/admin')) {
    if (context.profile.role !== 'admin') return <AccessDenied profile={context.profile} />
    return <AdminApp profile={context.profile} onSignOut={signOut} />
  }

  const teamRoute = teamRoleRoutes[context.profile.role]
  if (path.startsWith('/team')) {
    if (!teamRoute) return <AccessDenied profile={context.profile} />
    return <TeamApp profile={context.profile} onSignOut={signOut}/>
  }

  const clientPortal = child => context.profile.role === 'client'
    ? <FirstLoginConfidentialityScreen profile={context.profile}>{child}</FirstLoginConfidentialityScreen>
    : child

  if (path === '/client/first-access') {
    if (context.profile.role !== 'client') return <AccessDenied profile={context.profile} />
    return <FirstLoginConfidentialityScreen profile={context.profile}><ClientPortalApp profile={context.profile} onSignOut={signOut}/></FirstLoginConfidentialityScreen>
  }

  if (path === '/client/onboarding' || path === '/client/update-info') {
    if (context.profile.role !== 'client') return <AccessDenied profile={context.profile} />
    return clientPortal(<ClientSetupScreen type={path.endsWith('onboarding')?'new':'existing'} profile={context.profile}/>)
  }

  if (path.startsWith('/client') || path.startsWith('/cliente')) {
    if (!['client', 'admin'].includes(context.profile.role)) return <AccessDenied profile={context.profile} />
    return clientPortal(<ClientPortalApp profile={context.profile} onSignOut={signOut}/>)
  }

  if (path === '/dashboard' || path === '/') {
    if (context.profile.role === 'client') return clientPortal(<ClientPortalApp profile={context.profile} onSignOut={signOut}/>)
    if (context.profile.role === 'admin') return <AdminApp profile={context.profile} onSignOut={signOut}/>
    if (teamRoute) { queueMicrotask(()=>navigate(teamRoute,true)); return <LoadingScreen/> }
    return <AccessDenied profile={context.profile}/>
  }

  window.history.replaceState({}, '', '/dashboard')
  if (context.profile.role === 'client') return clientPortal(<ClientPortalApp profile={context.profile} onSignOut={signOut}/>)
  if (context.profile.role === 'admin') return <AdminApp profile={context.profile} onSignOut={signOut}/>
  if (teamRoute) { queueMicrotask(()=>navigate(teamRoute,true)); return <LoadingScreen/> }
  return <AccessDenied profile={context.profile}/>
}
