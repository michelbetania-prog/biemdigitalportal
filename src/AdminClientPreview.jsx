import { createElement, Fragment, useEffect, useState } from './mini-react.js'
import { ArrowLeft, ArrowRight, Lock, Shield } from './icons.jsx'
import ClientPortalApp from './ClientPortalApp.jsx'
import { loadAdminClientPreview } from './lib/portal-api.js'

export default function AdminClientPreview({clientId,profile,onExit}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[stage,setStage]=useState('auto')
  useEffect(()=>{let alive=true;loadAdminClientPreview(clientId).then(result=>{if(alive)setData(result)}).catch(reason=>{if(alive)setError(reason.message)});return()=>{alive=false}},[clientId])
  if(error)return <div className="auth-state-screen"><div className="auth-state-card denied"><Shield/><h1>No se pudo abrir la vista previa</h1><p>{error}</p><button onClick={onExit}>Volver al admin</button></div></div>
  if(!data)return <div className="auth-state-screen"><div className="auth-spinner"/><p>Preparando vista segura del cliente...</p></div>
  const needsAgreement=data.confidentiality?.active_agreement&&!data.confidentiality.accepted
  const needsSetup=!data.account?.onboarding_completed
  if(stage==='auto'&&needsAgreement)return <PreviewFrame data={data} onExit={onExit}><div className="first-access-card preview-first-access"><div className="first-access-lock"><Shield size={27}/></div><span className="admin-eyebrow">ACCESO PRIVADO · VERSIÓN {data.confidentiality.active_agreement.version}</span><h1>Bienvenido/a a tu portal privado de Biem Digital</h1><p className="first-access-lead">Este cliente verá el compromiso de confidencialidad antes de acceder al resto del portal.</p><section className="confidentiality-copy"><div><Lock/><h2>{data.confidentiality.active_agreement.title}</h2></div><div className="agreement-content">{data.confidentiality.active_agreement.content?.split(/\n\n+/).map((p,i)=><p key={i}>{p}</p>)}</div></section><label className="acceptance-check"><span className="check-box"/><strong>He leído y acepto el compromiso de confidencialidad del portal privado de Biem Digital.</strong></label><button className="admin-primary first-access-submit" onClick={()=>setStage('setup')}>Simular aceptación y continuar <ArrowRight/></button></div></PreviewFrame>
  if((stage==='setup'||stage==='auto')&&needsSetup)return <PreviewFrame data={data} onExit={onExit}><div className="first-access-card setup-card"><div className="first-access-lock"><Shield/></div><span className="admin-eyebrow">SIGUIENTE PASO DEL CLIENTE</span><h1>{data.account.onboarding_type==='new'?'Onboarding inicial':'Confirmación de información'}</h1><p className="first-access-lead">Esta es la capa previa al dashboard. La simulación no modifica el estado real del cliente.</p><button className="admin-primary first-access-submit" onClick={()=>setStage('portal')}>Continuar al dashboard <ArrowRight/></button></div></PreviewFrame>
  return <ClientPortalApp profile={profile} previewData={data} previewClientId={clientId} onExitPreview={onExit}/>
}
function PreviewFrame({data,onExit,children}){return <div className="preview-stage"><div className="preview-bar"><span>Estás viendo este portal como admin. Cliente: <strong>{data.account?.brand_name}</strong></span><button onClick={onExit}><ArrowLeft/>Volver al panel admin</button></div>{children}</div>}
