import { createElement } from './mini-react.js'
import PortalBrand from './PortalBrand.jsx'
import { ArrowRight, CheckCircle2, Shield } from './icons.jsx'

export default function ClientSetupScreen({ type, profile }) {
  const onboarding = type === 'new'
  return <main className="first-access-shell"><header><Shield size={14}/><span>Portal privado de cliente</span><PortalBrand variant="icon" showName={false}/></header><section className="first-access-card setup-card"><div className="first-access-lock"><CheckCircle2 size={27}/></div><span className="admin-eyebrow">ACCESO CONFIRMADO</span><h1>{onboarding?'Comencemos con tu onboarding':'Confirma la información de tu cuenta'}</h1><p className="first-access-lead">{onboarding?'Tu compromiso fue registrado. El siguiente paso será completar la información inicial de tu marca.':'Tu compromiso fue registrado. Revisa con el equipo de Biem Digital los datos actuales de tu servicio.'}</p><button className="admin-primary first-access-submit" onClick={()=>window.location.assign('/client/dashboard')}>Continuar al portal <ArrowRight size={17}/></button><small>Sesión activa para {profile.full_name||profile.email}</small></section></main>
}
