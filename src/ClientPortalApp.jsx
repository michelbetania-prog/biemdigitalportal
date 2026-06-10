import { createElement, Fragment, useEffect, useState } from './mini-react.js'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3,
  CreditCard, FileText, Grid2X2, LayoutDashboard, LogOut, Menu, MessageCircle,
  Palette, Plus, Receipt, Send, Sparkles, X,
} from './icons.jsx'
import {
  createClientRequest, loadPortalWorkspace, requestEventReschedule,
  reviewClientDeliverable, saveBrandBasics, saveNotificationPreferences, uploadBrandLogo,
} from './lib/portal-api.js'

const empty={account:null,brand:null,events:[],deliverables:[],invoices:[],requests:[],tasks:[],resources:[],services:[],preferences:null}
const labels={pending:'Pendiente',paid:'Pagada',overdue:'Vencida',approved:'Aprobado',published:'Publicado',client_review:'Por revisar',changes_requested:'Cambios solicitados',scheduled:'Programada',reschedule_requested:'Reagenda solicitada',cancelled:'Cancelada',completed:'Completada',new:'Nueva',in_review:'En revisión'}
const navItems=[['summary','Resumen',LayoutDashboard],['brand','Perfil de marca',Palette],['deliverables','Entregables',Grid2X2],['requests','Solicitudes',MessageCircle],['calendar','Reuniones',CalendarDays],['billing','Facturación',Receipt],['strategy','Estrategia',Sparkles],['notifications','Notificaciones',Bell]]

function initials(value='BI'){return value.split(/\s+/).filter(Boolean).map(word=>word[0]).join('').slice(0,2).toUpperCase()||'BI'}
function date(value){if(!value)return 'Sin fecha';const parsed=new Date(`${value}`.length===10?`${value}T12:00:00`:value);return Number.isNaN(parsed.getTime())?'Sin fecha':new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:`${value}`.includes('T')?'short':undefined}).format(parsed)}
function money(value,currency='USD'){return new Intl.NumberFormat('es',{style:'currency',currency}).format(Number(value||0))}
function LogoAvatar({brand,size='normal'}){return brand?.brand_logo_url?<img className={`brand-logo ${size}`} src={brand.brand_logo_url} alt={`Logo ${brand.brand_name||'marca'}`}/>:<div className={`brand-logo fallback ${size}`} aria-label={`Iniciales de ${brand?.brand_name||'marca'}`}>{initials(brand?.brand_name)}</div>}

export function AdminPreviewBar({clientName,onExit}){
  return <div className="client-admin-preview-bar"><div><span>Vista previa administrativa</span><strong>Estás viendo este portal como admin. Cliente: {clientName||'Sin nombre'}</strong></div><button onClick={onExit}><ArrowLeft size={16}/>Volver al panel admin</button></div>
}

export function ClientPortalLayout({brand,active,setActive,menu,setMenu,preview,onExitPreview,onSignOut,children}){
  return <div className={`client-portal-shell ${preview?'is-preview':''}`}>
    {preview&&<AdminPreviewBar clientName={brand?.brand_name} onExit={onExitPreview}/>}
    <aside className={menu?'open':''}>
      <header><strong>biem.</strong><button aria-label="Cerrar menú" onClick={()=>setMenu(false)}><X/></button></header>
      <div className="portal-brand-switch"><LogoAvatar brand={brand}/><div><small>PORTAL PRIVADO</small><strong>{brand?.brand_name||'Tu marca'}</strong></div></div>
      <nav>{navItems.map(([id,label,Icon])=><button className={active===id?'active':''} onClick={()=>{setActive(id);setMenu(false)}} key={id}><Icon size={18}/><span>{label}</span></button>)}</nav>
      {!preview&&<button className="portal-signout" onClick={onSignOut}><LogOut size={17}/>Cerrar sesión</button>}
    </aside>
    <main>
      <header className="portal-topbar"><button aria-label="Abrir menú" onClick={()=>setMenu(true)}><Menu/></button><div><small>BIEM DIGITAL</small><strong>{navItems.find(item=>item[0]===active)?.[1]}</strong></div><LogoAvatar brand={brand} size="small"/></header>
      <div className="client-portal-content">{children}</div>
    </main>
    {menu&&<div className="portal-overlay" onClick={()=>setMenu(false)}/>}
  </div>
}

export function ClientAlertCard({icon:Icon=AlertTriangle,title,children,tone='warning'}){
  return <article className={`client-alert-card ${tone}`}><div className="client-alert-icon"><Icon size={20}/></div><div><h3>{title}</h3><p>{children}</p></div></article>
}

export function ClientPortalHeader({account,brand}){
  const active=account?.status==='active'
  return <section className="client-welcome-card"><LogoAvatar brand={brand} size="hero"/><div className="client-welcome-copy"><span className="client-eyebrow">RESUMEN DE TU CUENTA</span><h1>Hola, {account?.name||'bienvenido/a'}</h1><p>Todo el avance de <strong>{brand?.brand_name||account?.brand_name||'tu marca'}</strong> en un solo lugar.</p><div className="client-status-row"><span className={`client-status-badge ${active?'active':'neutral'}`}>{active?'Cliente activo':labels[account?.status]||'Portal privado'}</span><span>Portal privado</span></div></div><div className="client-welcome-brand"><small>MARCA</small><strong>{brand?.brand_name||account?.brand_name||'Tu marca'}</strong></div></section>
}

export function ClientSummaryCard({icon:Icon,title,value,description,onClick,actionLabel}){
  const content=<><div className="client-summary-icon"><Icon size={21}/></div><div className="client-summary-title">{title}</div><strong className="client-summary-value">{value}</strong><span className="client-summary-description">{description}</span>{actionLabel&&<span className="client-summary-action">{actionLabel}<ArrowRight size={14}/></span>}</>
  return onClick?<button className="client-summary-card is-clickable" onClick={onClick}>{content}</button>:<article className="client-summary-card">{content}</article>
}

export function ClientEmptyState({icon:Icon=CheckCircle2,title='No hay información disponible',text}){
  return <div className="client-empty-state"><div><Icon size={23}/></div><h3>{title}</h3>{text&&<p>{text}</p>}</div>
}

export function ClientBrandPreviewCard({brand,onOpen}){
  const incomplete=!brand?.brand_summary&&!brand?.industry
  return <section className="client-section-card brand-preview-card"><div className="brand-preview-identity"><LogoAvatar brand={brand} size="large"/><div><span className="client-eyebrow">PERFIL DE MARCA</span><h2>Sobre tu marca</h2><strong className="brand-preview-name">{brand?.brand_name||'Tu marca'}</strong><p className="brand-industry">{brand?.industry||'Industria por confirmar'}</p></div></div><div className="brand-preview-content"><p>{brand?.brand_summary||(incomplete?'Completa o confirma la información de tu marca para que podamos trabajar con datos actualizados.':'La información estratégica de tu marca está disponible en el perfil.')}</p><button className="client-secondary-button" onClick={onOpen}>Ver perfil de marca <ArrowRight size={15}/></button></div></section>
}

export default function ClientPortalApp({profile,onSignOut,previewData=null,onExitPreview}){
  const preview=Boolean(previewData)
  const [data,setData]=useState(previewData?normalizePreview(previewData):empty)
  const [loading,setLoading]=useState(!previewData),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [active,setActive]=useState('summary'),[menu,setMenu]=useState(false),[revision,setRevision]=useState(0),[modal,setModal]=useState('')
  useEffect(()=>{if(preview)return;let alive=true;setLoading(true);loadPortalWorkspace(profile).then(result=>{if(alive){setData(result);setError('')}}).catch(reason=>{if(alive)setError(reason.message)}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[revision,profile.id])
  const mutate=async(operation,message)=>{setError('');setNotice('');try{await operation();setNotice(message);setModal('');if(!preview)setRevision(value=>value+1)}catch(reason){console.error('[BIEM client portal]',reason);setError(reason.message)}}
  const brand=data.brand||{brand_name:data.account?.brand_name}
  const panels={
    summary:<ClientDashboard data={data} brand={brand} setActive={setActive}/>,
    brand:<BrandProfile brand={brand} editable={!preview&&!data.account?.onboarding_completed} profile={profile} mutate={mutate}/>,
    deliverables:<Deliverables items={data.deliverables} preview={preview} mutate={mutate}/>,
    requests:<Requests items={data.requests} preview={preview} onCreate={()=>setModal('request')}/>,
    calendar:<Calendar events={data.events} preview={preview} mutate={mutate}/>,
    billing:<Billing invoices={data.invoices}/>,
    strategy:<Strategy resources={data.resources}/>,
    notifications:<Notifications preferences={data.preferences} preview={preview} profile={profile} mutate={mutate}/>,
  }
  const agreement=previewData?.confidentiality?.active_agreement
  return <ClientPortalLayout brand={brand} active={active} setActive={setActive} menu={menu} setMenu={setMenu} preview={preview} onExitPreview={onExitPreview} onSignOut={onSignOut}>
    <div className="client-feedback-stack">{loading&&<div className="data-feedback loading">Cargando tu portal...</div>}{error&&<div className="data-feedback error"><AlertTriangle size={16}/>{error}</div>}{notice&&<div className="data-feedback success"><CheckCircle2 size={16}/>{notice}</div>}</div>
    {preview&&(agreement&&!previewData.confidentiality.accepted||!data.account?.onboarding_completed)&&<section className="client-alerts-stack">
      {agreement&&!previewData.confidentiality.accepted&&<ClientAlertCard title="Compromiso de confidencialidad pendiente">Este cliente todavía debe aceptar la versión {agreement.version} del compromiso de confidencialidad.</ClientAlertCard>}
      {!data.account?.onboarding_completed&&<ClientAlertCard icon={Clock3} title="Información pendiente" tone="info">El onboarding o confirmación de datos está pendiente: {data.account?.onboarding_type||'Sin clasificar'}.</ClientAlertCard>}
    </section>}
    {panels[active]}
    {modal==='request'&&<RequestModal onClose={()=>setModal('')} onSubmit={payload=>mutate(()=>createClientRequest(profile,payload),'Solicitud enviada. También recibirás confirmación por correo.')}/>}
  </ClientPortalLayout>
}

function normalizePreview(value){return {account:value.account,brand:value.brand,deliverables:value.deliverables||[],invoices:value.invoices||[],requests:value.requests||[],resources:value.resources||[],events:value.events||[],tasks:[],services:[],preferences:null}}

function ClientDashboard({data,brand,setActive}){
  const reviewItems=data.deliverables.filter(item=>item.status==='client_review')
  const recentRequests=data.requests.slice(0,3)
  const nextMeeting=data.events.find(event=>event.status==='scheduled')
  return <div className="client-dashboard-page">
    <ClientPortalHeader account={data.account} brand={brand}/>
    <section className="client-dashboard-section"><div className="client-section-heading"><div><span className="client-eyebrow">CUENTA</span><h2>Resumen de tu cuenta</h2></div><p>Consulta rápidamente lo más importante de tu servicio.</p></div><div className="client-summary-grid">
      <ClientSummaryCard icon={Palette} title="Perfil de marca" value={brand?.brand_name||'Por completar'} description={brand?.industry||'Información de tu marca'} actionLabel="Ver perfil" onClick={()=>setActive('brand')}/>
      <ClientSummaryCard icon={Grid2X2} title="Entregables" value={data.deliverables.length||0} description={`${reviewItems.length||0} por revisar`} actionLabel="Ver entregables" onClick={()=>setActive('deliverables')}/>
      <ClientSummaryCard icon={MessageCircle} title="Solicitudes" value={data.requests.length||0} description={`${data.requests.filter(item=>['new','in_review'].includes(item.status)).length||0} abiertas`} actionLabel="Ver solicitudes" onClick={()=>setActive('requests')}/>
      <ClientSummaryCard icon={CalendarDays} title="Próxima reunión" value={nextMeeting?date(nextMeeting.start_time):'Sin agendar'} description={nextMeeting?.title||'Coordina con tu agente'} actionLabel="Ver agenda" onClick={()=>setActive('calendar')}/>
    </div></section>
    <section className="client-section-card next-steps-card"><div className="client-section-heading compact"><div><span className="client-eyebrow">PRÓXIMOS PASOS</span><h2>Lo que sigue</h2></div></div>{data.tasks.length?<div className="client-compact-list">{data.tasks.slice(0,4).map(task=><article key={task.id}><div className="compact-list-icon"><CheckCircle2 size={18}/></div><div><h3>{task.title}</h3><p>{task.description||date(task.due_date)}</p></div><span className={`client-item-status ${task.status}`}>{labels[task.status]||task.status}</span></article>)}</div>:<ClientEmptyState title="No hay pendientes visibles por ahora" text="Cuando Biem tenga una acción pendiente para ti, aparecerá en esta sección."/>}</section>
    {reviewItems.length>0&&<DashboardDeliverables items={reviewItems} onOpen={()=>setActive('deliverables')}/>}
    {recentRequests.length>0&&<DashboardRequests items={recentRequests} onOpen={()=>setActive('requests')}/>}
    <ClientBrandPreviewCard brand={brand} onOpen={()=>setActive('brand')}/>
  </div>
}

function DashboardDeliverables({items,onOpen}){return <section className="client-section-card"><div className="client-section-heading compact"><div><span className="client-eyebrow">REVISIÓN</span><h2>Entregables para revisión</h2></div><button className="client-link-button" onClick={onOpen}>Ver todos <ArrowRight size={14}/></button></div><div className="client-card-list">{items.slice(0,3).map(item=><article key={item.id}><div className="compact-list-icon"><Grid2X2 size={18}/></div><div><h3>{item.name}</h3><p>{item.content_type} · {date(item.due_date)}</p></div><span className="client-item-status client_review">Por revisar</span><button onClick={onOpen}>Ver entregable</button></article>)}</div></section>}
function DashboardRequests({items,onOpen}){return <section className="client-section-card"><div className="client-section-heading compact"><div><span className="client-eyebrow">SEGUIMIENTO</span><h2>Solicitudes recientes</h2></div><button className="client-link-button" onClick={onOpen}>Ver todas <ArrowRight size={14}/></button></div><div className="client-card-list">{items.map(item=><article key={item.id}><div className="compact-list-icon"><MessageCircle size={18}/></div><div><h3>{item.request_type}</h3><p>{date(item.created_at)}</p></div><span className={`client-item-status ${item.status}`}>{labels[item.status]||item.status}</span><button onClick={onOpen}>Ver solicitud</button></article>)}</div></section>}

function BrandProfile({brand,editable,profile,mutate}){const [editing,setEditing]=useState(false);const submit=event=>{event.preventDefault();const payload=Object.fromEntries(new FormData(event.currentTarget));mutate(()=>saveBrandBasics(payload),'Perfil de marca actualizado.');setEditing(false)};const upload=async event=>{const file=event.target.files?.[0];if(!file)return;const url=await uploadBrandLogo(profile,file);await mutate(()=>saveBrandBasics({brand_logo_url:url}),'Logo actualizado.')};return <div className="brand-profile-page"><div className="brand-cover" style={brand?.brand_cover_image_url?{backgroundImage:`url(${brand.brand_cover_image_url})`}:undefined}><LogoAvatar brand={brand} size="hero"/><div><span>PERFIL DE MARCA</span><h1>{brand?.brand_name||'Tu marca'}</h1><p>{brand?.industry||'Industria por completar'}</p></div>{editable&&<button onClick={()=>setEditing(!editing)}>Editar datos básicos</button>}</div>{editing?<form className="brand-edit-form" onSubmit={submit}><input name="brand_name" value={brand?.brand_name||''} placeholder="Nombre de marca"/><input name="industry" value={brand?.industry||''} placeholder="Industria"/><textarea name="brand_summary" value={brand?.brand_summary||''} placeholder="Descripción corta"/><textarea name="brand_about" value={brand?.brand_about||''} placeholder="Sobre la marca"/><input name="website_url" value={brand?.website_url||''} placeholder="Sitio web"/><input name="instagram_url" value={brand?.instagram_url||''} placeholder="Instagram"/><input name="whatsapp_number" value={brand?.whatsapp_number||''} placeholder="WhatsApp"/><input type="file" accept="image/*" onChange={upload}/><button className="admin-primary">Guardar cambios</button></form>:<><section className="brand-about-card"><span>SOBRE LA MARCA</span><h2>Sobre {brand?.brand_name||'tu marca'}</h2><p>{brand?.brand_about||brand?.brand_summary||`${brand?.brand_name||'Esta marca'} está construyendo una presencia clara y consistente junto a Biem Digital.`}</p></section><div className="brand-detail-grid">{[['Qué ofrece',brand?.main_products_services],['Público objetivo',brand?.target_audience],['Propuesta de valor',brand?.value_proposition],['Tono de comunicación',brand?.communication_tone],['Tipografías',brand?.typography],['Ubicación',brand?.location]].map(([title,value])=><article key={title}><span>{title}</span><p>{value||'Por completar'}</p></article>)}</div><section className="client-section-card"><div className="client-section-heading compact"><div><span className="client-eyebrow">ENLACES PRINCIPALES</span><h2>Presencia digital</h2></div></div><div className="brand-links">{[['Sitio web',brand?.website_url],['Instagram',brand?.instagram_url],['Facebook',brand?.facebook_url],['TikTok',brand?.tiktok_url],['WhatsApp',brand?.whatsapp_number]].filter(([,value])=>value).map(([label,value])=><a href={value.startsWith?.('http')?value:`https://wa.me/${value}`} target="_blank" rel="noopener noreferrer" key={label}>{label}</a>)}</div></section></>}</div>}

function PageHeading({eyebrow,title,copy,action}){return <div className="client-page-heading"><div><span className="client-eyebrow">{eyebrow}</span><h1>{title}</h1>{copy&&<p>{copy}</p>}</div>{action}</div>}
function Deliverables({items,preview,mutate}){return <section className="client-section-card"><PageHeading eyebrow="CONTENIDO" title="Entregables" copy="Revisa el contenido preparado para tu marca."/>{items.length?<div className="client-deliverable-list">{items.map(item=><article key={item.id}><div className="deliverable-main"><div className="compact-list-icon"><Grid2X2 size={19}/></div><div><h3>{item.name}</h3><p>{item.content_type} · {date(item.due_date)}</p>{item.client_comments&&<p className="deliverable-comment">{item.client_comments}</p>}{item.drive_assets?.length>0&&<div className="portal-drive-assets"><span>ARCHIVOS EN GOOGLE DRIVE</span>{item.drive_assets.map(asset=><a href={asset.drive_url} target="_blank" rel="noopener noreferrer" key={asset.id}><FileText size={15}/><div><strong>{asset.name}</strong><small>{asset.asset_type}{asset.is_primary?' · Principal':''}</small></div><ArrowRight size={14}/></a>)}</div>}</div></div><div className="deliverable-actions"><span className={`client-item-status ${item.status}`}>{labels[item.status]||item.status}</span>{!preview&&item.status==='client_review'&&<><button className="client-primary-button" onClick={()=>mutate(()=>reviewClientDeliverable(item.id,'approved'),'Entregable aprobado.')}>Aprobar</button><button className="client-secondary-button" onClick={()=>{const comment=window.prompt('Indica los cambios solicitados');if(comment)mutate(()=>reviewClientDeliverable(item.id,'changes_requested',comment),'Cambios solicitados.')}}>Solicitar cambios</button></>}</div></article>)}</div>:<ClientEmptyState icon={Grid2X2} title="Aún no hay entregables visibles" text="Cuando el equipo publique un entregable para ti, aparecerá aquí."/>}</section>}
function Requests({items,preview,onCreate}){return <section className="client-section-card"><PageHeading eyebrow="SEGUIMIENTO" title="Solicitudes" copy="Consulta tus solicitudes y las respuestas del equipo." action={!preview&&<button className="client-primary-button" onClick={onCreate}><Plus size={16}/>Nueva solicitud</button>}/>{items.length?<div className="client-card-list">{items.map(item=><article key={item.id}><div className="compact-list-icon"><MessageCircle size={18}/></div><div><h3>{item.request_type}</h3><p>{date(item.created_at)} · {item.description}</p>{item.admin_response&&<p className="portal-response">Biem: {item.admin_response}</p>}</div><span className={`client-item-status ${item.status}`}>{labels[item.status]||item.status}</span></article>)}</div>:<ClientEmptyState icon={MessageCircle} title="No hay solicitudes" text="Tus solicitudes y su estado aparecerán en esta sección."/>}</section>}
function Calendar({events,preview,mutate}){return <section className="client-section-card"><PageHeading eyebrow="AGENDA" title="Próximas reuniones" copy="Fechas y enlaces de tus próximas sesiones con Biem."/>{events.length?<div className="client-event-list">{events.map(event=><article key={event.id}><div className="event-date"><CalendarDays/><strong>{date(event.start_time)}</strong></div><div><h3>{event.title}</h3><p>{event.description||'Reunión de seguimiento'}</p><small>{event.location||'Reunión online'} · {event.timezone}</small></div><div className="event-actions">{event.google_meet_link&&<a href={event.google_meet_link} target="_blank" rel="noopener noreferrer">Entrar a Google Meet</a>}{!preview&&event.status==='scheduled'&&<button onClick={()=>{const note=window.prompt('¿Qué fecha u horario prefieres?');if(note)mutate(()=>requestEventReschedule(event.id,note),'Solicitud de reagenda enviada.')}}>Solicitar reagenda</button>}<span className={`client-item-status ${event.status}`}>{labels[event.status]||event.status}</span></div></article>)}</div>:<ClientEmptyState icon={CalendarDays} title="Sin reuniones agendadas" text="Cuando se programe una reunión, podrás consultarla aquí."/>}</section>}
function Billing({invoices}){return <section className="client-section-card"><PageHeading eyebrow="CUENTA" title="Facturación" copy="Consulta tus facturas y estados de pago."/>{invoices.length?<div className="client-card-list">{invoices.map(item=><article key={item.id}><div className="compact-list-icon"><CreditCard size={18}/></div><div><h3>{item.invoice_number}</h3><p>Vence {date(item.due_date)}</p></div><strong className="invoice-amount">{money(item.amount,item.currency)}</strong><span className={`client-item-status ${item.status}`}>{labels[item.status]||item.status}</span></article>)}</div>:<ClientEmptyState icon={CreditCard} title="No hay facturas disponibles" text="Tus facturas aparecerán en esta sección cuando estén listas."/>}</section>}
function Strategy({resources}){return <section className="client-section-card"><PageHeading eyebrow="ESTRATEGIA" title="Recomendaciones y diagnóstico" copy="Decisiones y próximos enfoques visibles para tu marca."/>{resources.length?<div className="strategy-grid">{resources.map(item=><article className="strategy-card" key={item.id}><span>{item.resource_type}</span><h3>{item.title}</h3><p>{item.content}</p>{item.file_url&&<a href={item.file_url} target="_blank" rel="noopener noreferrer">Abrir recurso</a>}</article>)}</div>:<ClientEmptyState icon={Sparkles} title="No hay recomendaciones visibles todavía" text="Las recomendaciones estratégicas aparecerán aquí cuando estén listas."/>}</section>}
function Notifications({preferences,preview,profile,mutate}){const values=preferences||{email_enabled:true,request_updates:true,deliverable_updates:true,invoice_updates:true,recommendation_updates:true,calendar_updates:true};const submit=event=>{event.preventDefault();const form=new FormData(event.currentTarget);const payload={};['email_enabled','request_updates','deliverable_updates','invoice_updates','recommendation_updates','calendar_updates'].forEach(key=>payload[key]=form.get(key)==='on');mutate(()=>saveNotificationPreferences(profile,payload),'Preferencias guardadas.')};return <section className="client-section-card"><PageHeading eyebrow="COMUNICACIÓN" title="Notificaciones por correo" copy="Elige qué actualizaciones deseas recibir."/><form className="notification-form" onSubmit={submit}>{[['email_enabled','Recibir correos del portal'],['request_updates','Actualizaciones de solicitudes'],['deliverable_updates','Entregables listos'],['invoice_updates','Facturas y recordatorios'],['recommendation_updates','Recomendaciones estratégicas'],['calendar_updates','Reuniones y calendario']].map(([key,label])=><label key={key}><input type="checkbox" name={key} checked={values[key]}/><span>{label}</span></label>)}{!preview&&<button className="client-primary-button">Guardar preferencias</button>}</form></section>}
function RequestModal({onClose,onSubmit}){const submit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.currentTarget));onSubmit({...values,priority:'medium'})};return <div className="modal-backdrop" onMouseDown={onClose}><form className="portal-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><header><h2>Nueva solicitud</h2><button type="button" onClick={onClose}><X/></button></header><label>Título<input name="request_type" required/></label><label>Descripción<textarea name="description" required/></label><label>Fecha deseada<input name="desired_due_date" type="date"/></label><footer><button type="button" onClick={onClose}>Cancelar</button><button className="client-primary-button"><Send/>Enviar solicitud</button></footer></form></div>}
