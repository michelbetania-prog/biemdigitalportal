import { createElement, Fragment, useEffect, useState } from './mini-react.js'
import PortalBrand from './PortalBrand.jsx'
import { ArrowRight, Check, Lock, Shield } from './icons.jsx'
import { acceptActiveConfidentiality, clientDestination, getConfidentialityStatus } from './lib/confidentiality.js'

function navigate(path) { window.location.replace(path) }

export default function FirstLoginConfidentialityScreen({ profile, children }) {
  const [status, setStatus] = useState(null)
  const [accepted, setAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getConfidentialityStatus(profile)
      .then(result => { if (active) setStatus(result) })
      .catch(loadError => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [profile.id, profile.client_id])

  if (error && !status) return <div className="auth-state-screen"><div className="auth-state-card denied"><Shield size={28}/><h1>No pudimos verificar el acceso</h1><p>{error}</p><button className="admin-primary" onClick={()=>window.location.reload()}>Intentar nuevamente</button></div></div>
  if (!status) return <div className="auth-state-screen"><div className="auth-spinner"/><p>Verificando compromiso de confidencialidad...</p></div>
  if (!status.required) {
    if (window.location.pathname === '/client/first-access') queueMicrotask(()=>navigate(clientDestination(status.client)))
    return children
  }

  const submit = async event => {
    event.preventDefault()
    if (!accepted || saving) return
    setSaving(true); setError('')
    try {
      await acceptActiveConfidentiality(profile.full_name || profile.email)
      navigate(clientDestination(status.client))
    } catch (saveError) {
      console.error('[BIEM confidentiality acceptance]', saveError)
      setError(saveError.message)
      setSaving(false)
    }
  }

  return <main className="first-access-shell">
    <header><Lock size={14}/><span>Portal privado de cliente</span><PortalBrand variant="icon" showName={false}/></header>
    <form className="first-access-card" onSubmit={submit}>
      <div className="first-access-lock"><Shield size={27}/></div>
      <span className="admin-eyebrow">ACCESO PRIVADO · VERSIÓN {status.agreement.version}</span>
      <h1>Bienvenido/a a tu portal privado de Biem Digital</h1>
      <p className="first-access-lead">Este espacio fue creado para que puedas dar seguimiento a tu servicio, entregables, solicitudes, facturación, recomendaciones estratégicas y próximos pasos de tu marca.</p>
      <section className="confidentiality-copy">
        <div><Lock size={18}/><h2>{status.agreement.title || 'Compromiso de Confidencialidad'}</h2></div>
        <div className="agreement-content">{status.agreement.content.split(/\n\n+/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
      </section>
      <label className={`acceptance-check ${accepted?'checked':''}`}>
        <input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/>
        <span className="check-box">{accepted&&<Check size={15}/>}</span>
        <strong>He leído y acepto el compromiso de confidencialidad del portal privado de Biem Digital.</strong>
      </label>
      {error&&<div className="auth-error">{error}</div>}
      <button className="admin-primary first-access-submit" type="submit" disabled={!accepted||saving}>{saving?'Guardando aceptación...':<>Acepto y continuar <ArrowRight size={17}/></>}</button>
      <small>Si tienes dudas sobre este compromiso, comunícate con Biem Digital antes de continuar.</small>
    </form>
  </main>
}
