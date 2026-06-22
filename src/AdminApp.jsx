import { createElement, Fragment, useEffect, useMemo, useState } from './mini-react.js'
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Briefcase, CalendarDays, Check,
  CheckCircle2, ChevronDown, Clock3, CreditCard, DollarSign, Edit, Eye,
  FileBarChart, FileText, Filter, Grid2X2, Image, LayoutDashboard, LogOut,
  Menu, MessageCircle, MoreHorizontal, Package, Palette, Plus, Receipt, Search,
  Send, Settings, Shield, Sparkles, UserRound, Users, X
} from './icons.jsx'
import GuideExample from './GuideExample.jsx'
import { activateConfidentialityAgreement, createRecord, listRecords, deleteRecord, loadAdminWorkspace, loadConfidentialityAdmin, updateRecord, inviteTeamMember, uploadAdminBrandLogo, createClientWithAuthUser } from './lib/admin-api.js'
import { applyPortalSettings, defaultPortalSettings, loadPortalSettings, savePortalSettings, uploadPortalAsset } from './lib/portal-settings.js'

const adminNav = [
  { id:'dashboard', label:'Dashboard', icon:LayoutDashboard },
  { id:'clients', label:'Clientes', icon:Users },
  { id:'packages', label:'Paquetes', icon:Package },
  { id:'deliverables', label:'Entregables', icon:Grid2X2 },
  { id:'drive_assets', label:'Archivos Google Drive', icon:FileText },
  { id:'calendar', label:'Calendario', icon:CalendarDays },
  { id:'billing', label:'Facturación', icon:Receipt },
  { id:'requests', label:'Solicitudes', icon:MessageCircle },
  { id:'services', label:'Servicios adicionales', icon:Briefcase },
  { id:'reports', label:'Reportes', icon:FileBarChart },
  { id:'team', label:'Equipo', icon:UserRound },
  { id:'assignments', label:'Asignaciones', icon:Users },
  { id:'tasks', label:'Tareas internas', icon:CheckCircle2 },
  { id:'notes', label:'Notas internas', icon:FileText },
  { id:'resources', label:'Estrategia y materiales', icon:Briefcase },
  { id:'brand_profiles', label:'Perfiles de marca', icon:Palette },
  { id:'meetings', label:'Reuniones', icon:CalendarDays },
  { id:'notifications', label:'Notificaciones', icon:Bell },
  { id:'confidentiality', label:'Confidencialidad', icon:Shield },
  { id:'settings', label:'Configuración', icon:Settings },
]

const rolePermissions = {
  admin: adminNav.map(item => item.id),
  client: [],
}

const labels = {
  active:'Activo', paused:'Pausado', expired:'Vencido', paid:'Pagado', pending:'Pendiente', overdue:'Vencido',
  todo:'Por hacer', in_progress:'En proceso', in_review:'En revisión', urgent:'Urgente', internal_review:'Revisión interna', client_review:'Enviado al cliente',
  changes_requested:'Cambios solicitados', approved:'Aprobado', published:'Publicado', cancelled:'Cancelado',
  new:'Nueva', in_review:'En revisión', rejected:'Rechazada', converted:'Convertida', completed:'Completada',
  high:'Alta', medium:'Media', low:'Baja', admin:'Admin', client:'Cliente', viewer:'Viewer', account_manager:'Agente de cuenta', designer:'Diseño gráfico', social_media:'Social media', video_editor:'Editor de video', ready_for_review:'Listo para revisión', corrected:'Corregido',
}

const retainedAdminGuideKeys='admin.dashboard admin.notifications admin.confidentiality admin.reports admin.settings admin.${resource}'

const emptyWorkspace = {
  clients:[], packages:[], invoices:[], deliverables:[], deliverable_drive_assets:[], requests:[], extra_services:[], profiles:[], client_team_assignments:[], internal_tasks:[], internal_notes:[], client_resources:[], client_brand_profiles:[], calendar_events:[], email_notifications:[], confidentiality_agreements:[], client_confidentiality_acceptances:[],
}

function initials(value='BI') {
  return value.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0,2).toUpperCase()
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value}`.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es', { day:'2-digit', month:'short', year:'numeric' }).format(date)
}

function formatMoney(value, currency='USD') {
  return new Intl.NumberFormat('es', { style:'currency', currency, maximumFractionDigits:0 }).format(Number(value || 0))
}

function useWorkspace() {
  const [data, setData] = useState(emptyWorkspace)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [mutating, setMutating] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    loadAdminWorkspace()
      .then(result => { if (active) { setData(result); setError('') } })
      .catch(loadError => { if (active) setError(loadError.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])

  const refresh = () => setRevision(value => value + 1)
  const mutate = async (operation, successMessage) => {
    setError('')
    setNotice('')
    setMutating(true)
    try {
      await operation()
      setNotice(successMessage)
      refresh()
      return { ok:true, error:'' }
    } catch (mutationError) {
      const message=mutationError.message || 'No se pudo completar la operación en Supabase.'
      console.error('[BIEM admin CRUD]', mutationError)
      setError(message)
      return { ok:false, error:message }
    } finally {
      setMutating(false)
    }
  }

  return { data, loading, mutating, error, notice, setError, setNotice, refresh, mutate }
}

function AdminLogo() {
  return <div className="admin-logo"><span className="logo-mark"><i/><i/><i/></span><span>biem<span>.</span></span><b>ADMIN</b></div>
}

function Badge({ value, type='status' }) {
  return <span className={`admin-badge ${type} ${value}`}><i/>{labels[value] || value || '—'}</span>
}

const adminNavGroups = [
  ['Principal',['dashboard']],
  ['Gestión',['clients','packages','deliverables','drive_assets','calendar','billing','requests']],
  ['Equipo',['team','assignments','tasks','notes']],
  ['Contenido',['services','reports','resources','brand_profiles','meetings','notifications']],
  ['Sistema',['confidentiality','settings']],
]

function AdminSidebar({ active, setActive, open, setOpen, profile, onLogout }) {
  const allowed = rolePermissions[profile.role] || []
  const itemMap = Object.fromEntries(adminNav.map(item=>[item.id,item]))
  return <aside className={`admin-sidebar ${open?'open':''}`}>
    <div className="admin-sidebar-head"><AdminLogo/><button className="admin-mobile-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="admin-workspace"><div className="admin-workspace-icon">BD</div><div><small>AGENCIA</small><strong>Biem Digital</strong></div><ChevronDown size={15}/></div>
    <nav>{adminNavGroups.map(([group,ids])=>{const items=ids.map(id=>itemMap[id]).filter(item=>item&&allowed.includes(item.id));return items.length?<section className="admin-nav-section" key={group}><span>{group}</span>{items.map(item=>{const Icon=item.icon;return <button key={item.id} className={active===item.id?'active':''} onClick={()=>{setActive(item.id);setOpen(false)}}><Icon size={17}/><b>{item.label}</b></button>})}</section>:null})}</nav>
    <div className="admin-sidebar-user"><div className="team-avatar">{initials(profile.full_name || profile.email)}</div><div><strong>{profile.full_name || profile.email}</strong><span>{labels[profile.role]}</span></div><button onClick={onLogout} title="Cerrar sesión"><LogOut size={17}/></button></div>
  </aside>
}

function AdminTopbar({ active, setMenuOpen, profile, onRefresh }) {
  const title=adminNav.find(item=>item.id===active)?.label || 'Dashboard'
  return <header className="admin-topbar"><button className="admin-menu-button" onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><div><span>BIEM DIGITAL <i>/</i></span><strong>{title}</strong></div><div className="admin-top-actions"><button className="global-search" onClick={onRefresh}><Search size={16}/><span>Actualizar datos desde Supabase</span><kbd>↻</kbd></button><button className="admin-icon-button"><Bell size={18}/></button><div className="role-switch"><div className="team-avatar">{initials(profile.full_name || profile.email)}</div><span>{labels[profile.role]}</span></div></div></header>
}

function AdminHeading({ eyebrow, title, copy, action }) {
  return <div className="admin-heading"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1>{copy&&<p>{copy}</p>}</div>{action}</div>
}

function Feedback({ error, notice, loading }) {
  return <>{loading&&<div className="data-feedback loading"><span className="auth-spinner"/>Sincronizando con Supabase...</div>}{error&&<div className="data-feedback error"><AlertTriangle size={16}/>{error}</div>}{notice&&<div className="data-feedback success"><CheckCircle2 size={16}/>{notice}</div>}</>
}

function Toolbar({ placeholder='Buscar...', filters=[] }) {
  return <div className="admin-toolbar"><div className="admin-search"><Search size={16}/><input placeholder={placeholder}/></div>{filters.map(filter=><button key={filter}><Filter size={14}/>{filter}<ChevronDown size={13}/></button>)}</div>
}

function ConfirmDelete({ label, onConfirm, onClose }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="delete-confirm" onMouseDown={event=>event.stopPropagation()}><div className="delete-icon"><AlertTriangle size={22}/></div><span className="admin-eyebrow">CONFIRMAR ELIMINACIÓN</span><h2>¿Eliminar {label}?</h2><p>Esta acción se guardará en Supabase y no puede deshacerse. Los registros relacionados podrían impedir la eliminación.</p><div><button className="admin-secondary" onClick={onClose}>Cancelar</button><button className="danger-button" onClick={onConfirm}>Sí, eliminar</button></div></div></div>
}

const formConfigs = {
  clients: {
    title:'cliente', fields:[
      ['brand_name','Marca','text',true],['name','Nombre de contacto','text',true],['email','Correo','email'],['phone','Teléfono','text'],
      ['status','Estado','select',true,['active','paused','expired']],['package_id','Paquete','packages'],['assigned_to','Responsable','profiles'],
      ['start_date','Fecha de inicio','date'],['renewal_date','Fecha de renovación','date'],['package_usage','Uso del paquete','number'],['internal_notes','Notas internas','textarea'],
    ],
  },
  packages: {
    title:'paquete', fields:[
      ['name','Nombre','text',true],['monthly_price','Precio mensual','number',true],['description','Descripción','textarea'],['included_services','Servicios incluidos (uno por línea)','lines'],
      ['graphic_pieces','Piezas gráficas','number'],['reels','Reels','number'],['stories','Historias','number'],['carousels','Carruseles','number'],['meetings','Reuniones','number'],
      ['support_level','Nivel de soporte','text'],['internal_notes','Notas internas','textarea'],['includes_monthly_report','Incluye reporte mensual','checkbox'],['is_active','Paquete activo','checkbox'],
    ],
  },
  invoices: {
    title:'factura', fields:[
      ['client_id','Cliente','clients',true],['package_id','Paquete','packages'],['assigned_to','Responsable','profiles'],['invoice_number','Número de factura','text',true],
      ['amount','Monto','number',true],['currency','Moneda','text',true],['due_date','Fecha límite','date',true],['status','Estado','select',true,['pending','paid','overdue']],
      ['payment_method','Método de pago','text'],['external_url','Enlace de pago/factura','url'],['notes','Notas','textarea'],
    ],
  },
  deliverables: {
    title:'entregable', fields:[
      ['client_id','Cliente','clients',true],['assigned_to','Responsable','profiles'],['name','Nombre','text',true],['content_type','Tipo de contenido','text',true],
      ['description','Descripción','textarea'],['status','Estado','select',true,['pending','in_progress','internal_review','client_review','changes_requested','approved','published','cancelled']],
      ['priority','Prioridad','select',true,['low','medium','high']],['due_date','Fecha límite','date'],['scheduled_at','Fecha programada','datetime-local'],
      ['file_url','Archivo o enlace','url'],['publication_url','Enlace publicado','url'],['internal_comments','Comentarios internos','textarea'],['client_comments','Comentarios para cliente','textarea'],
      ['visible_to_client','Visible para cliente','checkbox'],['visible_to_account_manager','Visible para agente','checkbox'],['visible_to_designer','Visible para diseño','checkbox'],['visible_to_social_media','Visible para social media','checkbox'],['visible_to_video_editor','Visible para video','checkbox'],['internal_only','Solo interno','checkbox'],
    ],
  },
  deliverable_drive_assets: {
    title:'vínculo de Google Drive', fields:[
      ['deliverable_id','Entregable','deliverables',true],['name','Nombre del archivo o carpeta','text',true],['drive_url','Enlace de Google Drive','url',true],
      ['asset_type','Tipo','select',true,['file','folder','post','design','video','material','other']],['mime_type','Tipo MIME','text'],['sort_order','Orden','number'],['status','Estado','select',true,['active','archived']],['visible_to_client','Visible para cliente','checkbox'],['is_primary','Enlace principal','checkbox'],
    ],
  },
  requests: {
    title:'solicitud', fields:[
      ['client_id','Cliente','clients',true],['extra_service_id','Servicio adicional','extra_services'],['assigned_to','Responsable','profiles'],['request_type','Tipo de solicitud','text',true],
      ['description','Descripción','textarea'],['desired_due_date','Fecha deseada','date'],['priority','Prioridad','select',true,['low','medium','high']],
      ['status','Estado','select',true,['new','in_review','approved','rejected','converted','completed']],['admin_response','Respuesta al cliente','textarea'],
    ],
  },
  extra_services: {
    title:'servicio adicional', fields:[
      ['name','Nombre','text',true],['category','Categoría','select',true,['strategy_growth','content_design','advertising_sales','organization_automation']],
      ['description','Descripción','textarea'],['price_from','Precio desde','number',true],['estimated_delivery','Tiempo estimado','text'],['is_active','Visible en portal','checkbox'],
    ],
  },
  client_team_assignments: {
    title:'asignación', fields:[
      ['client_id','Cliente','clients',true],['user_id','Colaborador','staff_profiles',true],['role_on_client','Rol en cliente','select',true,['account_manager','designer','social_media','video_editor']],['is_active','Asignación activa','checkbox'],
    ],
  },
  internal_tasks: {
    title:'tarea interna', fields:[
      ['client_id','Cliente','clients',true],['assigned_to','Responsable','profiles'],['task_type','Tipo','select',true,['design','video','copy','social_media','strategy','review','administration','meeting','publication','client_delivery']],['title','Título','text',true],['description','Descripción','textarea'],['status','Estado','select',true,['todo','in_progress','in_review','completed']],['priority','Prioridad','select',true,['low','medium','high','urgent']],['due_date','Fecha límite','date'],['result_url','Resultado o enlace','url'],['internal_comment','Comentario interno','textarea'],['visible_to_client','Visible para cliente','checkbox'],['visible_to_account_manager','Visible para agente','checkbox'],['visible_to_designer','Visible para diseño','checkbox'],['visible_to_social_media','Visible para social media','checkbox'],['visible_to_video_editor','Visible para video','checkbox'],['internal_only','Solo interno','checkbox'],
    ],
  },
  internal_notes: {
    title:'nota interna', fields:[
      ['client_id','Cliente','clients',true],['note','Nota','textarea',true],['visibility','Visibilidad','select',true,['admin_only','admin_and_account_manager','assigned_team','specific_role']],['specific_role','Rol específico','select',false,['account_manager','designer','social_media','video_editor']],
    ],
  },
  client_resources: {
    title:'recurso', fields:[
      ['client_id','Cliente','clients',true],['resource_type','Tipo','select',true,['recommendation','diagnostic','growth_route','brand_material','brief','comment','next_step']],['title','Título','text',true],['content','Contenido','textarea'],['file_url','Archivo o enlace','url'],['status','Estado','select',true,['draft','in_review','published','archived']],['visible_to_client','Visible para cliente','checkbox'],['visible_to_account_manager','Visible para agente','checkbox'],['visible_to_designer','Visible para diseño','checkbox'],['visible_to_social_media','Visible para social media','checkbox'],['visible_to_video_editor','Visible para video','checkbox'],['internal_only','Solo interno','checkbox'],
    ],
  },
  client_brand_profiles: {
    title:'perfil de marca', fields:[
      ['client_id','Cliente','clients',true],['brand_logo_file','Subir logo','file'],['brand_name','Nombre de marca','text',true],['brand_logo_url','URL del logo','url'],['brand_cover_image_url','URL de portada','url'],['industry','Industria','text'],['brand_summary','Descripción corta','textarea'],['brand_about','Sobre la marca','textarea'],['main_products_services','Productos o servicios','textarea'],['target_audience','Público objetivo','textarea'],['value_proposition','Propuesta de valor','textarea'],['communication_tone','Tono de comunicación','text'],['typography','Tipografías','text'],['website_url','Sitio web','url'],['instagram_url','Instagram','url'],['whatsapp_number','WhatsApp','text'],['location','Ubicación','text'],['visible_notes','Notas visibles','textarea'],['internal_notes','Notas internas','textarea'],['client_suggestions_enabled','Permitir sugerencias','checkbox'],
    ],
  },
  calendar_events: {
    title:'reunión', fields:[
      ['client_id','Cliente','clients',true],['title','Título','text',true],['description','Descripción','textarea'],['start_time','Inicio','datetime-local',true],['end_time','Fin','datetime-local',true],['timezone','Zona horaria','text',true],['location','Ubicación','text'],['google_meet_link','Google Meet','url'],['status','Estado','select',true,['scheduled','reschedule_requested','cancelled','completed']],['visible_to_client','Visible para cliente','checkbox'],
    ],
  },
  confidentiality_agreements: {
    title:'compromiso', fields:[
      ['version','Versión','text',true],['title','Título','text',true],['content','Contenido del compromiso','textarea',true],
    ],
  },
}

const categoryLabels = { strategy_growth:'Estrategia y crecimiento', content_design:'Contenido y diseño', advertising_sales:'Publicidad y ventas', organization_automation:'Organización y automatización' }

function relationOptions(type, data) {
  if(type==='clients') return data.clients.map(item=>[item.id,item.brand_name])
  if(type==='packages') return data.packages.map(item=>[item.id,item.name])
  if(type==='profiles') return data.profiles.filter(item=>['admin','account_manager','designer','social_media','video_editor'].includes(item.role)).map(item=>[item.id,item.full_name||item.email])
  if(type==='staff_profiles') return data.profiles.filter(item=>['account_manager','designer','social_media','video_editor'].includes(item.role)).map(item=>[item.id,`${item.full_name||item.email} · ${labels[item.role]}`])
  if(type==='deliverables') return data.deliverables.map(item=>[item.id,`${item.name} · ${item.clients?.brand_name||'Cliente'}`])
  if(type==='extra_services') return data.extra_services.map(item=>[item.id,item.name])
  return []
}

function normalizeValue(field, value) {
  if (value === undefined || value === null) return ''
  if (field === 'included_services') return Array.isArray(value) ? value.join('\n') : ''
  if (field === 'scheduled_at') return `${value}`.slice(0,16)
  return value
}

const integerFields = new Set(['graphic_pieces','reels','stories','carousels','meetings','package_usage','sort_order'])
const decimalFields = new Set(['monthly_price','amount','price_from'])
const nonNegativeFields = new Set([...integerFields, ...decimalFields])

const createDefaults = {
  clients: { status:'active', package_usage:0 },
  packages: { monthly_price:0, graphic_pieces:0, reels:0, stories:0, carousels:0, meetings:0, includes_monthly_report:true, is_active:true },
  invoices: { amount:0, currency:'USD', status:'pending' },
  deliverables: { status:'pending', priority:'medium' },
  deliverable_drive_assets: { asset_type:'file', sort_order:0, status:'active', visible_to_client:false, is_primary:false },
  requests: { status:'new', priority:'medium' },
  internal_tasks: { status:'todo', priority:'medium', visible_to_account_manager:true, internal_only:true },
  client_team_assignments: { is_active:true },
  client_resources: { status:'draft', visible_to_account_manager:true, internal_only:true },
  extra_services: { price_from:0, is_active:true },
  client_brand_profiles: { client_suggestions_enabled:true },
  calendar_events: { timezone:'America/New_York', status:'scheduled', visible_to_client:true },
}

function initialFieldValue(resource, record, name) {
  if (record?.id) return record[name]
  return createDefaults[resource]?.[name]
}

function payloadFromForm(resource, form) {
  const config=formConfigs[resource]
  const fieldLabels=Object.fromEntries(config.fields.map(([name,label])=>[name,label]))
  const formData=new FormData(form)
  const payload={}
  const booleans=new Set(['includes_monthly_report','is_active','visible_to_client','visible_to_admin','visible_to_account_manager','visible_to_designer','visible_to_social_media','visible_to_video_editor','internal_only','client_suggestions_enabled','is_primary'])
  for(const [name,,type] of config.fields){
    if(booleans.has(name)){ payload[name]=formData.get(name)==='on'; continue }
    if(type==='file'){ payload[name]=formData.get(name); continue }
    let value=formData.get(name)
    if(type==='lines'){ payload[name]=`${value||''}`.split('\n').map(item=>item.trim()).filter(Boolean); continue }
    if(integerFields.has(name)){
      const parsed=value===''||value===null ? 0 : Number(value)
      if(!Number.isInteger(parsed)||parsed<0) throw new Error(`${fieldLabels[name]} debe ser un número entero mayor o igual a 0.`)
      payload[name]=parsed
      continue
    }
    if(decimalFields.has(name)){
      const parsed=value===''||value===null ? 0 : Number(value)
      if(!Number.isFinite(parsed)||parsed<0) throw new Error(`${fieldLabels[name]} debe ser un monto válido mayor o igual a 0.`)
      payload[name]=parsed
      continue
    }
    if(value===''||value===null){ payload[name]=null; continue }
    payload[name]=typeof value==='string' ? value.trim() : value
    if(name==='drive_url'&&!/^https:\/\/(drive|docs)\.google\.com\//i.test(value)) throw new Error('El enlace debe pertenecer a Google Drive o Google Docs.')
    if(['scheduled_at','start_time','end_time'].includes(name)&&value) payload[name]=new Date(value).toISOString()
  }
  if(resource==='invoices'&&!payload.currency) payload.currency='USD'
  return payload
}

function CrudModal({ resource, record, data, onClose, onSave, error, saving }) {
  const config=formConfigs[resource]
  const editing=Boolean(record?.id)
  const submit=async event=>{
    event.preventDefault()
    try {
      const payload=payloadFromForm(resource,event.currentTarget)
      if(resource==='deliverable_drive_assets'){
        const deliverable=data.deliverables.find(item=>item.id===payload.deliverable_id)
        if(!deliverable)throw new Error('Selecciona un entregable válido.')
        payload.client_id=deliverable.client_id
      }
      if(resource==='client_brand_profiles'&&payload.brand_logo_file?.size){
        payload.brand_logo_url=await uploadAdminBrandLogo(payload.client_id||record.client_id,payload.brand_logo_file)
      }
      delete payload.brand_logo_file
      await onSave(payload)
    }
    catch (validationError) { console.error('[BIEM form validation]', validationError); data.setFormError(validationError.message) }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="crud-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><header><div><span className="admin-eyebrow">{editing?'EDITAR':'CREAR'}</span><h2>{editing?'Editar':'Nuevo'} {config.title}</h2><p>Los cambios se guardarán directamente en Supabase.</p></div><button type="button" onClick={onClose}><X size={19}/></button></header><div className="crud-form-grid">{config.fields.map(([name,label,type,required,values])=>{
    const value=normalizeValue(name,initialFieldValue(resource,record,name))
    if(type==='textarea'||type==='lines') return <label className="span-two" key={name}>{label}<textarea name={name} value={value}/></label>
    if(type==='checkbox') return <label className="crud-checkbox span-two" key={name}><input type="checkbox" name={name} checked={record ? Boolean(record[name]) : !['visible_to_client','visible_to_designer','visible_to_social_media','visible_to_video_editor'].includes(name)}/><span><strong>{label}</strong><small>Activa o desactiva esta opción.</small></span></label>
    if(type==='select') return <label key={name}>{label}<select name={name} required={required}>{values.map(option=><option value={option} selected={value===option} key={option}>{categoryLabels[option]||labels[option]||option}</option>)}</select></label>
    if(['clients','packages','profiles','staff_profiles','extra_services','deliverables'].includes(type)) return <label key={name}>{label}<select name={name} required={required}><option value="">Sin asignar</option>{relationOptions(type,data).map(([id,text])=><option value={id} selected={value===id} key={id}>{text}</option>)}</select></label>
    return <label key={name}>{label}<input name={name} type={type} value={value} required={required} min={nonNegativeFields.has(name)?'0':undefined} step={integerFields.has(name)?'1':type==='number'?'0.01':undefined} inputMode={type==='number'?'decimal':undefined}/></label>
  })}</div>{error&&<div className="data-feedback error modal-error"><AlertTriangle size={16}/>{error}</div>}<footer><button type="button" className="admin-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="admin-primary" disabled={saving}>{saving?'Guardando en Supabase...':editing?'Guardar cambios':'Crear registro'}</button></footer></form></div>
}

function RowActions({ canWrite, onEdit, onDelete }) {
  if(!canWrite) return <span className="read-only-cell"><Eye size={14}/>Solo lectura</span>
  return <div className="table-actions"><button onClick={onEdit}><Edit size={14}/>Editar</button><button className="delete-row" onClick={onDelete}><X size={14}/>Eliminar</button></div>
}

function EntityTablePage({ resource, workspace, title, eyebrow, copy, columns, filters=[], onCreate=null, createLabel=null }) {
  const { data, mutate }=workspace
  const [editing,setEditing]=useState(null)
  const [deleting,setDeleting]=useState(null)
  const [formError,setFormError]=useState('')
  const records=data[resource]||[]
  const canWrite=workspace.canWrite
  const save=async payload=>{
    setFormError('')
    workspace.setError('')
    const result=await mutate(
      ()=>editing?.id?updateRecord(resource,editing.id,payload):createRecord(resource,payload),
      `${formConfigs[resource].title[0].toUpperCase()+formConfigs[resource].title.slice(1)} ${editing?.id?'actualizado':'creado'} correctamente.`,
    )
    if(result.ok)setEditing(null)
    else setFormError(result.error)
  }
  const remove=async()=>{
    const result=await mutate(()=>deleteRecord(resource,deleting.id),`${formConfigs[resource].title} eliminado correctamente.`)
    if(result.ok)setDeleting(null)
  }
  return <div className="admin-page"><AdminHeading eyebrow={eyebrow} title={title} copy={copy} action={canWrite?<button className="admin-primary" onClick={()=>{setFormError('');onCreate?onCreate():setEditing({})}}><Plus size={16}/>{createLabel||`Crear ${formConfigs[resource].title}`}</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><Toolbar placeholder={`Buscar ${title.toLowerCase()}...`} filters={filters}/><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(column=><th key={column.key}>{column.label}</th>)}<th></th></tr></thead><tbody>{records.map(record=><tr key={record.id}>{columns.map(column=><td key={column.key}>{column.render?column.render(record):record[column.key]||'—'}</td>)}<td><RowActions canWrite={canWrite} onEdit={()=>{setFormError('');setEditing(record)}} onDelete={()=>setDeleting(record)}/></td></tr>)}{!workspace.loading&&records.length===0&&<tr><td colSpan={columns.length+1}><GuideExample guideKey={`admin.${resource}`} canDismiss={canWrite}/></td></tr>}</tbody></table></div>{editing&&<CrudModal resource={resource} record={editing} data={{...data,setFormError}} onClose={()=>setEditing(null)} onSave={save} error={formError||workspace.error} saving={workspace.mutating}/>} {deleting&&<ConfirmDelete label={deleting.brand_name||deleting.name||deleting.invoice_number||deleting.request_type} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>
}

function Dashboard({ workspace, setActive, profile }) {
  const {data}=workspace
  const activeClients=data.clients.filter(item=>item.status==='active')
  const openDeliverables=data.deliverables.filter(item=>['pending','in_progress','internal_review','client_review'].includes(item.status))
  const review=data.deliverables.filter(item=>['internal_review','client_review'].includes(item.status))
  const pendingInvoices=data.invoices.filter(item=>['pending','overdue'].includes(item.status))
  const newRequests=data.requests.filter(item=>item.status==='new')
  const nextMeetings=data.calendar_events.filter(item=>['scheduled','reschedule_requested'].includes(item.status)).slice(0,4)
  const monthGoal=Math.max(1,data.deliverables.length)
  const completedMonth=data.deliverables.filter(item=>['approved','published','completed'].includes(item.status)).length
  const progress=Math.min(100,Math.round((completedMonth/monthGoal)*100))
  const cards=[
    ['Clientes activos',activeClients.length,'Cuentas en servicio',Users,'violet','clients'],
    ['Entregables pendientes',openDeliverables.length,'Producción abierta',Clock3,'amber','deliverables'],
    ['Solicitudes nuevas',newRequests.length,'Peticiones sin resolver',MessageCircle,'green','requests'],
    ['Facturas pendientes',pendingInvoices.length,'Cobros por resolver',Receipt,'orange','billing'],
  ]
  const priorityClients=activeClients.slice(0,4)
  const agenda=[...nextMeetings.map(item=>({id:`m-${item.id}`,title:item.title,meta:item.client?.brand_name||'Cliente',date:item.start_time,type:'Reunión',target:'meetings'})),...openDeliverables.slice(0,4).map(item=>({id:`d-${item.id}`,title:item.name,meta:item.clients?.brand_name||'Cliente',date:item.due_date,type:'Entrega',target:'deliverables'}))].slice(0,6)
  const activity=[...data.requests.slice(0,3).map(item=>({id:`r-${item.id}`,title:item.clients?.brand_name||'Cliente',text:`solicitó ${item.request_type}`,time:formatDate(item.created_at),icon:MessageCircle,target:'requests'})),...data.deliverables.slice(0,3).map(item=>({id:`d-${item.id}`,title:item.clients?.brand_name||'Cliente',text:`actualizó ${item.name}`,time:formatDate(item.updated_at),icon:Image,target:'deliverables'})),...data.invoices.slice(0,2).map(item=>({id:`i-${item.id}`,title:item.clients?.brand_name||'Cliente',text:`factura ${labels[item.status]}`,time:formatDate(item.updated_at),icon:Receipt,target:'billing'}))].slice(0,7)
  const quickActions=[['Crear cliente','clients',Users],['Crear paquete','packages',Package],['Crear entregable','deliverables',Grid2X2],['Crear reunión','meetings',CalendarDays]]
  return <div className="admin-page dashboard-page biem-dashboard"><section className="biem-hero-frame"><div><span className="admin-eyebrow">SEMANA OPERATIVA</span><h1>Hola, {profile.full_name?.split(' ')[0]||'equipo'}</h1><p>Resumen semanal de clientes, entregables, solicitudes y cobros sincronizados con Supabase.</p><div className="biem-hero-actions">{quickActions.map(([label,target,Icon])=><button key={label} onClick={()=>setActive(target)}><Icon size={16}/>{label}</button>)}</div></div><aside><span>Acción prioritaria</span><strong>{review.length?`${review.length} entregables por revisar`:pendingInvoices.length?`${pendingInvoices.length} facturas pendientes`:'Operación al día'}</strong><button onClick={()=>setActive(review.length?'deliverables':pendingInvoices.length?'billing':'clients')}>Abrir módulo <ArrowRight size={14}/></button></aside></section><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><section className="biem-metric-row">{cards.map(([label,value,note,Icon,tone,target])=><button className={`biem-metric ${tone}`} key={label} onClick={()=>setActive(target)}><Icon size={18}/><span>{label}</span><strong>{value}</strong><small>{note}</small></button>)}</section><section className="biem-dashboard-layout"><div className="biem-progress-frame"><div><span className="admin-eyebrow">PROGRESO MENSUAL</span><h2>{progress}% completado</h2><p>{completedMonth} de {monthGoal} entregables aprobados o publicados este mes.</p></div><div className="biem-progress-visual"><i style={{width:`${progress}%`}}/><b>{progress}%</b></div><div className="biem-progress-bars"><span><b style={{height:`${Math.max(8,activeClients.length*8)}%`}}/>Clientes</span><span><b style={{height:`${Math.max(8,openDeliverables.length*8)}%`}}/>Entregas</span><span><b style={{height:`${Math.max(8,newRequests.length*12)}%`}}/>Solicitudes</span><span><b style={{height:`${Math.max(8,pendingInvoices.length*12)}%`}}/>Cobros</span></div></div><aside className="biem-agenda-frame"><header><span className="admin-eyebrow">AGENDA</span><h2>Próximas fechas</h2></header>{agenda.map(item=><button key={item.id} onClick={()=>setActive(item.target)}><time>{formatDate(item.date).slice(0,6)}</time><span><strong>{item.title}</strong><small>{item.type} · {item.meta}</small></span></button>)}</aside><section className="biem-priority-clients"><header><span className="admin-eyebrow">CLIENTES</span><h2>Clientes prioritarios</h2></header>{priorityClients.map(client=><button key={client.id} onClick={()=>setActive('clients')}><div className="brand-avatar">{initials(client.brand_name)}</div><span><strong>{client.brand_name}</strong><small>{client.name||'Contacto pendiente'}</small></span><Badge value={client.status}/></button>)}</section><section className="biem-alert-frame"><header><span className="admin-eyebrow">ALERTAS</span><h2>Facturas y solicitudes</h2></header>{pendingInvoices.slice(0,3).map(item=><button key={item.id} onClick={()=>setActive('billing')}><Receipt size={16}/><span><strong>{item.invoice_number}</strong><small>{item.clients?.brand_name||'Cliente'} · {formatMoney(item.amount,item.currency)}</small></span><Badge value={item.status}/></button>)}{newRequests.slice(0,3).map(item=><button key={item.id} onClick={()=>setActive('requests')}><MessageCircle size={16}/><span><strong>{item.request_type}</strong><small>{item.clients?.brand_name||'Cliente'}</small></span><Badge value={item.status}/></button>)}</section><section className="biem-timeline-frame"><header><span className="admin-eyebrow">TIMELINE</span><h2>Actividad reciente</h2></header>{activity.map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>setActive(item.target)}><div className="biem-avatar">{initials(item.title)}</div><Icon size={14}/><span><strong>{item.title}</strong><small>{item.text} · {item.time}</small></span></button>})}</section></section></div>
}

function generateClientPassword(){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'
  const bytes=new Uint32Array(16);crypto.getRandomValues(bytes)
  const generated=Array.from(bytes,value=>alphabet[value%alphabet.length]).join('')
  return `B1!${generated}`
}
function passwordChecks(value){return {length:value.length>=10,upper:/[A-Z]/.test(value),lower:/[a-z]/.test(value),number:/\d/.test(value),symbol:/[^A-Za-z0-9]/.test(value)}}
function ClientRegistrationModal({packages,onClose,onCreated}){
  const [password,setPassword]=useState(generateClientPassword()),[confirm,setConfirm]=useState(''),[visible,setVisible]=useState(false),[sendAccess,setSendAccess]=useState(false),[error,setError]=useState(''),[saving,setSaving]=useState(false),[result,setResult]=useState(null)
  const checks=passwordChecks(password),valid=Object.values(checks).every(Boolean)&&password===confirm
  const generate=()=>{const next=generateClientPassword();setPassword(next);setConfirm(next);setError('')}
  const copy=async()=>{try{await navigator.clipboard.writeText(password)}catch{setError('No se pudo copiar automáticamente. Selecciona y copia la contraseña.') }}
  const submit=async event=>{event.preventDefault();setError('');if(!valid){setError('La contraseña y su confirmación deben coincidir y cumplir todos los requisitos.');return}setSaving(true);try{const form=new FormData(event.currentTarget);const payload=Object.fromEntries(form);payload.password=password;payload.sendAccessEmail=form.get('sendAccessEmail')==='on';const logo=form.get('brandLogo');delete payload.brandLogo;const created=await createClientWithAuthUser(payload);if(logo?.size){try{const logoUrl=await uploadAdminBrandLogo(created.clientId,logo);await updateRecord('client_brand_profiles',(await listBrandProfileId(created.clientId)),{brand_logo_url:logoUrl})}catch(logoError){console.error('[BIEM client logo]',logoError);created.logoWarning='El acceso fue creado, pero no se pudo subir el logo.'}}setResult(created);onCreated()}catch(reason){console.error('[BIEM client registration]',reason);setError(reason.message||'No se pudo registrar el cliente.')}finally{setSaving(false)}}
  if(result)return <div className="modal-backdrop"><div className="client-created-card"><div className="success-mark"><Check size={24}/></div><span className="admin-eyebrow">REGISTRO COMPLETADO</span><h2>Cliente creado correctamente</h2><p>El usuario de acceso, perfil, cliente y perfil de marca quedaron vinculados en Supabase.</p>{result.logoWarning&&<div className="data-feedback error">{result.logoWarning}</div>}<dl><div><dt>Cliente</dt><dd>{result.clientId}</dd></div><div><dt>Acceso</dt><dd>Activo</dd></div><div><dt>Correo de bienvenida</dt><dd>{result.accessEmailStatus==='sent'?'Enviado':result.accessEmailStatus==='failed'?'No se pudo enviar':'No solicitado'}</dd></div></dl><div className="created-actions"><button className="admin-secondary" onClick={()=>window.location.assign(`/admin/preview-client/${result.clientId}`)}><Eye size={15}/>Ver como cliente</button><button className="admin-primary" onClick={onClose}>Ver cliente</button></div></div></div>
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="client-registration-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><header><div><span className="admin-eyebrow">ACCESO CONTROLADO</span><h2>Crear cliente</h2><p>Crea la cuenta, el usuario de Auth y el perfil de marca en una sola operación segura.</p></div><button type="button" onClick={onClose}><X/></button></header><section><h3>Datos de acceso</h3><div className="registration-grid"><label>Nombre del contacto<input name="contactName" required/></label><label>Correo electrónico<input name="email" type="email" required/></label><label>Contraseña inicial<div className="password-field"><input value={password} onChange={event=>setPassword(event.target.value)} type={visible?'text':'password'} required/><button type="button" onClick={()=>setVisible(!visible)}><Eye size={16}/></button></div></label><label>Confirmar contraseña<input value={confirm} onChange={event=>setConfirm(event.target.value)} type={visible?'text':'password'} required/></label></div><div className="password-tools"><button type="button" onClick={generate}>Generar contraseña segura</button><button type="button" onClick={copy}>Copiar contraseña</button></div><div className="password-rules">{[['length','10+ caracteres'],['upper','Mayúscula'],['lower','Minúscula'],['number','Número'],['symbol','Símbolo']].map(([key,label])=><span className={checks[key]?'valid':''} key={key}><Check size={13}/>{label}</span>)}</div></section><section><h3>Cliente y marca</h3><div className="registration-grid"><label>Nombre de la marca<input name="brandName" required/></label><label>Tipo de cliente<select name="onboardingType" required><option value="new">Nuevo · onboarding inicial</option><option value="existing">Existente · confirmar datos</option></select></label><label>Paquete contratado<select name="packageId" required><option value="">Seleccionar paquete</option>{packages.filter(item=>item.is_active).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Teléfono<input name="phone"/></label><label>WhatsApp<input name="whatsapp"/></label><label>Industria<input name="industry"/></label><label>Logo de marca<input name="brandLogo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"/></label><label>Sitio web<input name="websiteUrl" type="url"/></label><label>Instagram<input name="instagramUrl" type="url"/></label><label>Facebook<input name="facebookUrl" type="url"/></label><label>TikTok<input name="tiktokUrl" type="url"/></label><label className="span-two">Descripción corta<textarea name="brandSummary"/></label><label className="span-two">Notas internas<textarea name="internalNotes"/></label></div></section><label className="send-access-check"><input type="checkbox" name="sendAccessEmail" checked={sendAccess} onChange={event=>setSendAccess(event.target.checked)}/><span><strong>Enviar acceso por correo</strong><small>El correo incluye el enlace al portal, pero nunca la contraseña.</small></span></label>{error&&<div className="data-feedback error"><AlertTriangle size={16}/>{error}</div>}<footer><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button className="admin-primary" disabled={saving||!valid}>{saving?'Creando cuenta segura...':sendAccess?'Crear y enviar acceso':'Crear cliente'}</button></footer></form></div>
}
async function listBrandProfileId(clientId){const record=await listRecords('client_brand_profiles');const profile=record.find(item=>item.client_id===clientId);if(!profile)throw new Error('No se encontró el perfil de marca creado.');return profile.id}
function ClientsPage({workspace}){const [registering,setRegistering]=useState(false),[editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null),[formError,setFormError]=useState(''),[query,setQuery]=useState('')
  const {data,mutate}=workspace,canWrite=workspace.canWrite
  const active=data.clients.filter(item=>item.status==='active').length,pendingDeliverables=data.deliverables.filter(item=>['pending','in_progress','internal_review'].includes(item.status)).length,waiting=data.deliverables.filter(item=>item.status==='client_review').length,pendingInvoices=data.invoices.filter(item=>['pending','overdue'].includes(item.status)).length,newRequests=data.requests.filter(item=>item.status==='new').length
  const rows=data.clients.filter(client=>`${client.brand_name} ${client.name} ${client.packages?.name||''}`.toLowerCase().includes(query.toLowerCase()))
  const nextMeeting=client=>data.calendar_events.filter(event=>event.client_id===client.id&&['scheduled','reschedule_requested'].includes(event.status)&&new Date(event.start_time)>new Date()).sort((a,b)=>new Date(a.start_time)-new Date(b.start_time))[0]
  const save=async payload=>{setFormError('');workspace.setError('');const result=await mutate(()=>updateRecord('clients',editing.id,payload),'Cliente actualizado correctamente.');if(result.ok)setEditing(null);else setFormError(result.error)}
  const remove=async()=>{const result=await mutate(()=>deleteRecord('clients',deleting.id),'Cliente eliminado correctamente.');if(result.ok)setDeleting(null)}
  return <div className="admin-page clients-showcase"><AdminHeading eyebrow="CARTERA REAL" title="Clientes" copy="Gestiona cada cuenta como una relación operativa: paquete, entregables, reuniones, cobros y acceso al portal." action={canWrite?<button className="admin-primary" onClick={()=>setRegistering(true)}><Plus size={16}/>Crear cliente</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="admin-client-summary">{[[active,'Clientes activos',Users],[pendingDeliverables,'Entregables pendientes',Clock3],[waiting,'Aprobaciones esperando cliente',CheckCircle2],[pendingInvoices,'Facturas pendientes',Receipt],[newRequests,'Solicitudes nuevas',MessageCircle]].map(([value,label,Icon])=><article key={label}><Icon size={17}/><span>{label}</span><strong>{value}</strong></article>)}</div><div className="admin-card-toolbar"><label><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar cliente, marca o paquete..."/></label></div><div className="admin-client-cards">{rows.map(client=>{const meeting=nextMeeting(client),open=data.deliverables.filter(item=>item.client_id===client.id&&item.status!=='published'&&item.status!=='cancelled'),invoice=data.invoices.find(item=>item.client_id===client.id&&['pending','overdue'].includes(item.status));return <article className="admin-client-card" key={client.id}><header><div className="brand-avatar large">{initials(client.brand_name)}</div><div><Badge value={client.status}/><h2>{client.brand_name}</h2><p>{client.name||client.email||'Contacto por completar'}</p></div><button className="admin-secondary" onClick={()=>window.location.assign(`/admin/preview-client/${client.id}`)}><Eye size={14}/>Ver portal</button></header><div className="admin-client-metrics"><span><small>Paquete</small><strong>{client.packages?.name||'Sin paquete'}</strong></span><span><small>Próxima reunión</small><strong>{meeting?formatDate(meeting.start_time):'Sin agendar'}</strong></span><span><small>Entregables pendientes</small><strong>{open.length}</strong></span><span><small>Factura pendiente</small><strong>{invoice?formatMoney(invoice.amount,invoice.currency):'Al día'}</strong></span></div><footer><span>Renovación: {formatDate(client.renewal_date)}</span><div>{canWrite&&<button className="admin-secondary" onClick={()=>setEditing(client)}><Edit size={14}/>Editar</button>}{canWrite&&<button className="admin-secondary danger-text" onClick={()=>setDeleting(client)}>Eliminar</button>}</div></footer></article>})}</div>{!workspace.loading&&!rows.length&&<div className="admin-empty compact"><Users size={22}/><p>No hay clientes que coincidan con la búsqueda.</p></div>}{registering&&<ClientRegistrationModal packages={workspace.data.packages} onClose={()=>setRegistering(false)} onCreated={workspace.refresh}/>} {editing&&<CrudModal resource="clients" record={editing} data={{...data,setFormError}} onClose={()=>setEditing(null)} onSave={save} error={formError||workspace.error} saving={workspace.mutating}/>} {deleting&&<ConfirmDelete label={deleting.brand_name} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>}

function packageState(item){const value=item.status||item.lifecycle_status;if(value==='draft')return 'draft';if(value==='paused')return 'paused';return item.is_active===false?'paused':'active'}
function packageTone(item,index){const haystack=`${item.name} ${item.description||''}`.toLowerCase();if(/premium|pro|elite|full|360/.test(haystack))return 'premium';if(/growth|crec|ventas|ads|publicidad/.test(haystack))return 'growth';return index%3===2?'premium':index%3===1?'growth':'strategy'}
function packageServiceTotal(item){const included=Array.isArray(item.included_services)?item.included_services.length:0;return included+['graphic_pieces','reels','stories','carousels','meetings'].reduce((sum,key)=>sum+Number(item[key]||0),0)}
function PackagesPage({workspace}){
  const {data,mutate}=workspace
  const [editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null),[formError,setFormError]=useState(''),[tab,setTab]=useState('all'),[query,setQuery]=useState(''),[filter,setFilter]=useState('all')
  const canWrite=workspace.canWrite
  const packages=data.packages||[]
  const clientCount=id=>data.clients.filter(client=>client.package_id===id).length
  const rows=packages.filter((item,index)=>{const state=packageState(item),haystack=`${item.name} ${item.description||''}`.toLowerCase(),tone=packageTone(item,index);return (tab==='all'||state===tab)&&(!query||haystack.includes(query.toLowerCase()))&&(filter==='all'||tone===filter)})
  const save=async payload=>{setFormError('');workspace.setError('');const result=await mutate(()=>editing?.id?updateRecord('packages',editing.id,payload):createRecord('packages',payload),`Paquete ${editing?.id?'actualizado':'creado'} correctamente.`);if(result.ok)setEditing(null);else setFormError(result.error)}
  const remove=async()=>{const result=await mutate(()=>deleteRecord('packages',deleting.id),'Paquete eliminado correctamente.');if(result.ok)setDeleting(null)}
  const duplicate=item=>{const payload={name:`${item.name} copia`,monthly_price:item.monthly_price||0,description:item.description||'',included_services:item.included_services||[],graphic_pieces:item.graphic_pieces||0,reels:item.reels||0,stories:item.stories||0,carousels:item.carousels||0,meetings:item.meetings||0,support_level:item.support_level||'',internal_notes:item.internal_notes||'',includes_monthly_report:Boolean(item.includes_monthly_report),is_active:false};return mutate(()=>createRecord('packages',payload),'Paquete duplicado como borrador.')}
  const pause=item=>mutate(()=>updateRecord('packages',item.id,{is_active:false}),'Paquete pausado correctamente.')
  return <div className="admin-page packages-showcase" data-view="package-cards"><AdminHeading eyebrow="OFERTA REAL" title="Paquetes" copy="Gestiona planes contratables como productos visuales de la agencia." action={canWrite?<button className="admin-primary" onClick={()=>{setFormError('');setEditing({})}}><Plus size={16}/>Crear paquete</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="package-showcase-toolbar"><div className="package-tabs">{[['all','Todos'],['active','Activos'],['paused','Pausados'],['draft','Borradores']].map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</div><label><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar paquete..."/></label><select value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todos los enfoques</option><option value="strategy">Estratégicos</option><option value="growth">Crecimiento</option><option value="premium">Premium</option></select></div><div className="package-card-list">{rows.map((item,index)=><PackageVisualCard key={item.id} item={item} tone={packageTone(item,index)} clientCount={clientCount(item.id)} canWrite={canWrite} onView={()=>setEditing(item)} onEdit={()=>setEditing(item)} onDuplicate={()=>duplicate(item)} onPause={()=>pause(item)} onDelete={()=>setDeleting(item)}/>)}</div>{!workspace.loading&&!rows.length&&<div className="admin-empty compact"><Package size={22}/><p>No hay paquetes que coincidan con la búsqueda o filtros actuales.</p></div>}{editing&&<CrudModal resource="packages" record={editing} data={{...data,setFormError}} onClose={()=>setEditing(null)} onSave={save} error={formError||workspace.error} saving={workspace.mutating}/>} {deleting&&<ConfirmDelete label={deleting.name} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>
}
function PackageVisualCard({item,tone,clientCount,canWrite,onView,onEdit,onDuplicate,onPause,onDelete}){const state=packageState(item),services=packageServiceTotal(item),metrics=[['Gráficas',item.graphic_pieces],['Reels',item.reels],['Historias',item.stories],['Carruseles',item.carousels],['Reuniones',item.meetings]].filter(([,value])=>Number(value||0)>0).slice(0,4);return <article className={`package-visual-card ${tone}`}><section><div className="package-card-head"><div><span className={`package-state ${state}`}>{state==='active'?'Activo':state==='draft'?'Borrador':'Pausado'}</span><h2>{item.name}</h2></div><details className="package-menu"><summary><MoreHorizontal size={18}/></summary><div><button onClick={onEdit}>Editar</button><button onClick={onDuplicate}>Duplicar</button><button onClick={onPause}>Pausar</button><button onClick={onDelete}>Eliminar</button></div></details></div><p>{item.description||'Paquete diseñado para organizar servicios, entregables y seguimiento comercial.'}</p><div className="package-commercial"><strong>{formatMoney(item.monthly_price)}</strong><span>Pago mensual</span><b>{services} servicios incluidos</b><b>{clientCount} clientes</b></div><div className="package-service-pills">{metrics.length?metrics.map(([label,value])=><span key={label}><b>{value}</b>{label}</span>):<span><b>{services}</b>Servicios configurados</span>}</div><footer><button className="admin-primary" onClick={onView}>Ver detalles</button>{canWrite&&<button className="admin-secondary" onClick={onEdit}>Editar</button>}</footer></section><aside aria-hidden="true"><div className="package-visual-orbit"><i/><i/><i/></div><div className="package-visual-cardlet"><span/><strong>{metrics[0]?.[0]||'Marketing'}</strong><small>{metrics[0]?.[1]||services} activos</small></div><div className="package-visual-chart">{[38,64,46,78].map(value=><b style={{height:`${value}%`}} key={value}/>)}</div></aside></article>}

const brandProfileColumns=[
  {key:'brand_name',label:'Marca',render:item=><span className="client-cell"><span className="brand-avatar">{item.brand_logo_url?<img src={item.brand_logo_url} alt=""/>:initials(item.brand_name||item.client?.brand_name)}</span><strong>{item.brand_name||item.client?.brand_name}</strong></span>},
  {key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'}, {key:'industry',label:'Industria'}, {key:'updated_at',label:'Actualizado',render:item=>formatDate(item.updated_at)},
]
const meetingColumns=[
  {key:'title',label:'Reunión'}, {key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'}, {key:'start_time',label:'Inicio',render:item=>formatDate(item.start_time)}, {key:'google_meet_link',label:'Meet',render:item=>item.google_meet_link?<a href={item.google_meet_link} target="_blank">Abrir enlace</a>:'—'}, {key:'status',label:'Estado',render:item=><Badge value={item.status}/>},
]


function ExtraServicesPage({workspace}){const {data,mutate}=workspace;const [editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null),[formError,setFormError]=useState(''),[query,setQuery]=useState('');const canWrite=workspace.canWrite,rows=(data.extra_services||[]).filter(item=>`${item.name} ${item.category} ${item.description||''}`.toLowerCase().includes(query.toLowerCase()));const save=async payload=>{setFormError('');workspace.setError('');const result=await mutate(()=>editing?.id?updateRecord('extra_services',editing.id,payload):createRecord('extra_services',payload),`Servicio ${editing?.id?'actualizado':'creado'} correctamente.`);if(result.ok)setEditing(null);else setFormError(result.error)};const remove=async()=>{const result=await mutate(()=>deleteRecord('extra_services',deleting.id),'Servicio adicional eliminado correctamente.');if(result.ok)setDeleting(null)};return <div className="admin-page services-showcase"><AdminHeading eyebrow="CATÁLOGO REAL" title="Servicios adicionales" copy="Servicios solicitables desde el portal cliente, presentados como oferta comercial y no como inventario interno." action={canWrite?<button className="admin-primary" onClick={()=>{setFormError('');setEditing({})}}><Plus size={16}/>Crear servicio</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="admin-card-toolbar"><label><Search size={15}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar servicio adicional..."/></label></div><div className="extra-service-grid">{rows.map(service=><article className={`extra-service-admin-card ${service.is_active?'active':'paused'}`} key={service.id}><header><div><Sparkles size={18}/></div><Badge value={service.is_active?'active':'paused'}/></header><span>{service.category}</span><h2>{service.name}</h2><p>{service.description||'Descripción pendiente para este servicio adicional.'}</p><div><strong>{Number(service.price_from)>0?formatMoney(service.price_from):'Cotizar'}</strong><small>{service.estimated_delivery||'Tiempo por confirmar'}</small></div><footer>{canWrite&&<button className="admin-secondary" onClick={()=>setEditing(service)}><Edit size={14}/>Editar</button>}{canWrite&&<button className="admin-secondary danger-text" onClick={()=>setDeleting(service)}>Eliminar</button>}</footer></article>)}</div>{!workspace.loading&&!rows.length&&<div className="admin-empty compact"><Briefcase size={22}/><p>No hay servicios adicionales que coincidan con la búsqueda.</p></div>}{editing&&<CrudModal resource="extra_services" record={editing} data={{...data,setFormError}} onClose={()=>setEditing(null)} onSave={save} error={formError||workspace.error} saving={workspace.mutating}/>} {deleting&&<ConfirmDelete label={deleting.name} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>}
const clientColumns=[
  {key:'brand_name',label:'Cliente',render:item=><div className="client-cell"><div className="brand-avatar">{initials(item.brand_name)}</div><div><strong>{item.brand_name}</strong><span>{item.name}</span></div></div>},
  {key:'package',label:'Paquete',render:item=>item.packages?.name||'Sin paquete'}, {key:'status',label:'Estado',render:item=><Badge value={item.status}/>},
  {key:'renewal_date',label:'Renovación',render:item=>formatDate(item.renewal_date)}, {key:'assigned_to',label:'Responsable',render:item=>item.assignee?.full_name||item.assignee?.email||'Sin asignar'},
  {key:'package_usage',label:'Uso',render:item=><strong>{item.package_usage||0}</strong>},{key:'preview',label:'Portal',render:item=><button className="admin-secondary" onClick={()=>window.location.assign(`/admin/preview-client/${item.id}`)}><Eye size={14}/>Ver como cliente</button>},
]
const packageColumns=[
  {key:'name',label:'Paquete',render:item=><strong>{item.name}</strong>},{key:'monthly_price',label:'Precio',render:item=>formatMoney(item.monthly_price)},
  {key:'included_services',label:'Servicios',render:item=>`${item.included_services?.length||0} incluidos`},{key:'graphic_pieces',label:'Gráficas'},{key:'reels',label:'Reels'},
  {key:'stories',label:'Historias'},{key:'is_active',label:'Estado',render:item=><Badge value={item.is_active?'active':'paused'}/>},
]
const invoiceColumns=[
  {key:'invoice_number',label:'Factura',render:item=><strong>{item.invoice_number}</strong>},{key:'client',label:'Cliente',render:item=>item.clients?.brand_name||'—'},
  {key:'package',label:'Paquete',render:item=>item.packages?.name||'—'},{key:'amount',label:'Monto',render:item=><strong>{formatMoney(item.amount,item.currency)}</strong>},
  {key:'due_date',label:'Vencimiento',render:item=>formatDate(item.due_date)},{key:'status',label:'Estado',render:item=><Badge value={item.status}/>},{key:'payment_method',label:'Método'},
]
const driveAssetColumns=[
  {key:'name',label:'Archivo o carpeta',render:item=><div><strong>{item.name}</strong><div className="muted-cell">{item.asset_type}</div></div>},
  {key:'deliverable',label:'Entregable',render:item=>item.deliverable?.name||'—'}, {key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'},
  {key:'drive_url',label:'Google Drive',render:item=><a href={item.drive_url} target="_blank" rel="noopener noreferrer">Abrir en Drive</a>},
  {key:'visible_to_client',label:'Cliente',render:item=><Badge value={item.visible_to_client?'active':'paused'}/>}, {key:'status',label:'Estado',render:item=><Badge value={item.status}/>},
]
const deliverableColumns=[
  {key:'name',label:'Entregable',render:item=><strong>{item.name}</strong>},{key:'client',label:'Cliente',render:item=>item.clients?.brand_name||'—'},
  {key:'assigned_to',label:'Responsable',render:item=>item.assignee?.full_name||'Sin asignar'},{key:'content_type',label:'Tipo'},
  {key:'due_date',label:'Fecha límite',render:item=>formatDate(item.due_date)},{key:'status',label:'Estado',render:item=><Badge value={item.status}/>},{key:'priority',label:'Prioridad',render:item=><Badge value={item.priority} type="priority"/>},
]
const requestColumns=[
  {key:'request_type',label:'Solicitud',render:item=><div><strong>{item.request_type}</strong><div className="muted-cell">{item.description?.slice(0,45)}</div></div>},
  {key:'client',label:'Cliente',render:item=>item.clients?.brand_name||'—'},{key:'service',label:'Servicio',render:item=>item.extra_services?.name||'—'},
  {key:'desired_due_date',label:'Fecha deseada',render:item=>formatDate(item.desired_due_date)},{key:'assigned_to',label:'Responsable',render:item=>item.assignee?.full_name||'Sin asignar'},
  {key:'status',label:'Estado',render:item=><Badge value={item.status}/>},{key:'priority',label:'Prioridad',render:item=><Badge value={item.priority} type="priority"/>},
]
const serviceColumns=[
  {key:'name',label:'Servicio',render:item=><strong>{item.name}</strong>},{key:'category',label:'Categoría',render:item=>categoryLabels[item.category]},
  {key:'price_from',label:'Precio desde',render:item=>formatMoney(item.price_from)},{key:'estimated_delivery',label:'Entrega'},{key:'is_active',label:'Estado',render:item=><Badge value={item.is_active?'active':'paused'}/>},
]


const assignmentColumns=[
  {key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'},{key:'user',label:'Colaborador',render:item=>item.team_member?.full_name||item.team_member?.email||'—'},{key:'role_on_client',label:'Rol',render:item=>labels[item.role_on_client]},{key:'is_active',label:'Estado',render:item=><Badge value={item.is_active?'active':'paused'}/>},
]
const taskColumns=[
  {key:'title',label:'Tarea',render:item=><strong>{item.title}</strong>},{key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'},{key:'assigned_to',label:'Responsable',render:item=>item.assignee_profile?.full_name||'Sin asignar'},{key:'task_type',label:'Tipo'},{key:'due_date',label:'Fecha límite',render:item=>formatDate(item.due_date)},{key:'status',label:'Estado',render:item=><Badge value={item.status}/>},
]
const noteColumns=[
  {key:'note',label:'Nota',render:item=><div><strong>{item.note?.slice(0,70)}</strong></div>},{key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'},{key:'author',label:'Creó',render:item=>item.created_by_profile?.full_name||'Admin'},{key:'visibility',label:'Visibilidad'},{key:'created_at',label:'Fecha',render:item=>formatDate(item.created_at)},
]
const resourceColumns=[
  {key:'title',label:'Recurso',render:item=><strong>{item.title}</strong>},{key:'client',label:'Cliente',render:item=>item.client?.brand_name||'—'},{key:'resource_type',label:'Tipo'},{key:'status',label:'Estado',render:item=><Badge value={item.status}/>},{key:'visible_to_client',label:'Cliente',render:item=>item.visible_to_client&&!item.internal_only?'Visible':'Interno'},
]

function CalendarPage({ workspace }) {
  const grouped=useMemo(()=>workspace.data.deliverables.reduce((acc,item)=>{const key=item.scheduled_at?.slice(0,10)||item.due_date||'Sin fecha';(acc[key]||=[]).push(item);return acc},{}),[workspace.data.deliverables])
  return <div className="admin-page"><AdminHeading eyebrow="PROGRAMACIÓN REAL" title="Calendario" copy="Entregables agrupados por la fecha almacenada en Supabase."/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="real-calendar-list">{Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=><section key={date}><div className="real-calendar-date"><CalendarDays size={17}/><strong>{formatDate(date)}</strong><span>{items.length} pieza{items.length!==1?'s':''}</span></div><div>{items.map(item=><article key={item.id}><div><span>{item.clients?.brand_name}</span><strong>{item.name}</strong><small>{item.content_type} · {item.assignee?.full_name||'Sin asignar'}</small></div><Badge value={item.status}/></article>)}</div></section>)}{!workspace.loading&&!Object.keys(grouped).length&&<div className="empty-table"><CalendarDays size={28}/><strong>No hay entregables programados</strong></div>}</div></div>
}

function TeamPage({ workspace }) {
  const roles=['admin','client','account_manager','designer','social_media','video_editor','viewer']
  const changeRole=(member,role)=>workspace.mutate(()=>updateRecord('profiles',member.id,{role}),`Rol de ${member.full_name||member.email} actualizado.`)
  const invite=async()=>{const full_name=window.prompt('Nombre completo del colaborador');if(!full_name)return;const email=window.prompt('Correo del colaborador');if(!email)return;const role=window.prompt('Rol: account_manager, designer, social_media o video_editor','designer');if(!role)return;await workspace.mutate(()=>inviteTeamMember({full_name,email,role}),`Invitación enviada a ${email}.`)}
  return <div className="admin-page"><AdminHeading eyebrow="USUARIOS REALES" title="Equipo" copy="Asigna el rol principal aquí y vincula colaboradores a clientes desde Asignaciones." action={<button className="admin-primary" onClick={invite}><Plus size={16}/>Invitar colaborador</button>}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="team-admin-grid">{workspace.data.profiles.map(member=><article key={member.id}><header><div className="team-avatar large">{initials(member.full_name||member.email)}</div><Badge value="active"/></header><h3>{member.full_name||'Sin nombre'}</h3><p>{member.email}</p><label className="team-role-editor">Rol<select value={member.role} onChange={event=>changeRole(member,event.target.value)}>{roles.map(role=><option value={role} key={role}>{labels[role]}</option>)}</select></label><footer><span className="muted-cell">Creado {formatDate(member.created_at)}</span></footer></article>)}{!workspace.data.profiles.length&&<GuideExample guideKey="admin.profiles" canDismiss={workspace.canWrite}/>}</div><div className="admin-empty compact"><Shield size={20}/><p>Las invitaciones se procesan mediante una Edge Function segura. El navegador nunca utiliza una service role key.</p></div></div>
}

function NotificationHistory({workspace}) { const rows=workspace.data.email_notifications||[]; return <div className="admin-page"><AdminHeading eyebrow="COMUNICACIÓN" title="Historial de notificaciones" copy="Registro persistente de correos procesados desde funciones seguras."/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Tipo</th><th>Destinatario</th><th>Asunto</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{rows.map(item=><tr key={item.id}><td>{item.client?.brand_name||'Interno'}</td><td>{item.notification_type}</td><td>{item.recipient_email}</td><td>{item.subject}</td><td><Badge value={item.status}/></td><td>{formatDate(item.sent_at||item.created_at)}</td></tr>)}{!rows.length&&<tr><td colSpan="6"><GuideExample guideKey="admin.notifications" canDismiss={workspace.canWrite}/></td></tr>}</tbody></table></div></div> }

function ConfidentialityAdminPage({ workspace }) {
  const [data,setData]=useState({agreements:[],acceptances:[]})
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [editing,setEditing]=useState(null)
  const [deleting,setDeleting]=useState(null)
  const [revision,setRevision]=useState(0)

  useEffect(()=>{
    let active=true
    setLoading(true)
    loadConfidentialityAdmin().then(result=>{if(active){setData(result);setError('')}}).catch(loadError=>{if(active)setError(loadError.message)}).finally(()=>{if(active)setLoading(false)})
    return ()=>{active=false}
  },[revision])

  const run=async(operation,message)=>{
    setError('');setNotice('')
    try{await operation();setNotice(message);setRevision(value=>value+1);return true}
    catch(operationError){console.error('[BIEM confidentiality admin]',operationError);setError(operationError.message);return false}
  }
  const save=async payload=>{
    const ok=await run(()=>editing?.id?updateRecord('confidentiality_agreements',editing.id,payload):createRecord('confidentiality_agreements',payload),`Compromiso ${editing?.id?'actualizado':'creado'} correctamente.`)
    if(ok)setEditing(null)
  }
  const remove=async()=>{
    const ok=await run(()=>deleteRecord('confidentiality_agreements',deleting.id),'Compromiso eliminado correctamente.')
    if(ok)setDeleting(null)
  }
  const activeAgreement=data.agreements.find(item=>item.is_active)
  const acceptedClients=new Set(data.acceptances.filter(item=>item.agreement_id===activeAgreement?.id).map(item=>item.client_id))
  const pending=Math.max(0,workspace.data.clients.length-acceptedClients.size)

  return <div className="admin-page"><AdminHeading eyebrow="ACCESO PRIVADO" title="Confidencialidad" copy="Gestiona versiones del compromiso y revisa qué clientes aceptaron." action={<button className="admin-primary" onClick={()=>setEditing({})}><Plus size={16}/>Crear versión</button>}/><Feedback error={error} notice={notice} loading={loading}/><div className="acceptance-counts"><span><strong>{data.agreements.length}</strong>versiones</span><span><strong>{acceptedClients.size}</strong>clientes aceptaron la activa</span><span><strong>{pending}</strong>pendientes</span></div><div className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">VERSIONES</span><h2>Compromisos registrados</h2></div></div><div className="confidentiality-admin-list">{data.agreements.map(item=><article className="confidentiality-admin-card" key={item.id}><div><Badge value={item.is_active?'active':'paused'}/><h3>{item.title} · {item.version}</h3><p>{item.content.slice(0,180)}{item.content.length>180?'…':''}</p></div><div className="confidentiality-admin-actions">{!item.is_active&&<button className="admin-primary" onClick={()=>run(()=>activateConfidentialityAgreement(item.id),'Nueva versión activa. Los clientes deberán aceptarla.')}>Activar</button>}<button className="admin-secondary" onClick={()=>setEditing(item)}><Edit size={14}/>Editar</button>{!item.is_active&&<button className="danger-button" onClick={()=>setDeleting(item)}>Eliminar</button>}</div></article>)}{!loading&&!data.agreements.length&&<GuideExample guideKey="admin.confidentiality" canDismiss={workspace.canWrite}/>}</div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Versión</th><th>Nombre aceptante</th><th>Fecha</th><th>IP</th></tr></thead><tbody>{data.acceptances.map(item=><tr key={item.id}><td><strong>{item.clients?.brand_name||'Cliente'}</strong></td><td>{item.agreement_version}</td><td>{item.accepted_name}</td><td>{formatDate(item.accepted_at)}</td><td>{item.ip_address||'No disponible'}</td></tr>)}{!loading&&!data.acceptances.length&&<tr><td colSpan="5"><div className="empty-table"><FileText size={22}/><strong>Aún no hay aceptaciones</strong></div></td></tr>}</tbody></table></div>{editing&&<CrudModal resource="confidentiality_agreements" record={editing} data={{...workspace.data,setFormError:setError}} onClose={()=>setEditing(null)} onSave={save} error={error} saving={false}/>} {deleting&&<ConfirmDelete label={`${deleting.title} ${deleting.version}`} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>
}

function UnavailablePage({ title, canDismiss=false }) {
  const guideKey=title==='Reportes'?'admin.reports':'admin.settings'
  return <div className="admin-page"><AdminHeading eyebrow="GUÍA DEL MÓDULO" title={title} copy="Esta referencia visual muestra cómo se organizará la información cuando el módulo tenga datos reales."/><GuideExample guideKey={guideKey} canDismiss={canDismiss}/></div>
}

function SettingsPage({workspace}) {
  const [settings,setSettings]=useState(defaultPortalSettings)
  const [saved,setSaved]=useState(defaultPortalSettings)
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const colors=[['primary_color','Principal'],['soft_color','Secundario suave'],['accent_color','Botones y acentos'],['background_color','Fondo'],['card_color','Tarjetas'],['text_color','Texto'],['muted_text_color','Texto secundario'],['border_color','Bordes']]
  useEffect(()=>{let active=true;loadPortalSettings().then(value=>{if(active){setSettings(value);setSaved(value)}}).catch(reason=>active&&setError(reason.message)).finally(()=>active&&setLoading(false));return()=>{active=false}},[])
  useEffect(()=>{if(!loading)applyPortalSettings(settings)},[settings,loading])
  const change=event=>setSettings(current=>({...current,[event.target.name]:event.target.type==='number'?Number(event.target.value):event.target.value}))
  const upload=async(event,key)=>{const file=event.target.files?.[0];if(!file)return;setError('');try{const url=await uploadPortalAsset(file,key);setSettings(current=>({...current,[key]:url}))}catch(reason){setError(reason.message)}}
  const submit=async event=>{event.preventDefault();setSaving(true);setError('');setNotice('');try{const value=await savePortalSettings(settings);setSettings(value);setSaved(value);setNotice('Configuración guardada en Supabase y aplicada a todo el portal.')}catch(reason){setError(reason.message)}finally{setSaving(false)}}
  const cancel=()=>{setSettings(saved);applyPortalSettings(saved)}
  const restore=()=>setSettings({...defaultPortalSettings})
  return <div className="admin-page settings-page"><AdminHeading eyebrow="IDENTIDAD Y OPERACIÓN" title="Configuración" copy="Personaliza el portal, previsualiza los cambios y guárdalos de forma persistente en Supabase."/><Feedback error={error||workspace.error} notice={notice} loading={loading}/><form onSubmit={submit}>
    <section className="settings-preview" style={{background:settings.background_color,color:settings.text_color}}><div className="settings-preview-brand">{settings.main_logo_url?<img src={settings.main_logo_url} alt="Vista previa del logotipo"/>:<div className="settings-preview-mark">{initials(settings.commercial_name)}</div>}<div><small>VISTA PREVIA</small><h2>{settings.commercial_name}</h2><p>{settings.welcome_message}</p></div></div><button type="button" style={{background:settings.accent_color,color:'#fff',borderRadius:`${settings.border_radius}px`}}>Botón principal</button></section>
    <div className="settings-grid"><section className="admin-panel settings-section"><div className="admin-panel-head"><div><span className="admin-eyebrow">IDENTIDAD</span><h2>Datos generales</h2></div></div><label>Nombre comercial<input name="commercial_name" value={settings.commercial_name} onChange={change} required/></label><label>Nombre de la agencia<input name="agency_name" value={settings.agency_name} onChange={change} required/></label><label>Nombre del portal<input name="portal_name" value={settings.portal_name} onChange={change} required/></label><label>Mensaje de bienvenida<textarea name="welcome_message" value={settings.welcome_message} onChange={change}/></label></section>
    <section className="admin-panel settings-section"><div className="admin-panel-head"><div><span className="admin-eyebrow">RECURSOS</span><h2>Logotipos e iconos</h2></div></div>{[['main_logo_url','Logotipo principal'],['icon_logo_url','Imagen de perfil'],['favicon_url','Favicon']].map(([key,label])=><label key={key}>{label}<div className="asset-control">{settings[key]?<img src={settings[key]} alt=""/>:<span>Sin archivo</span>}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" onChange={event=>upload(event,key)}/></div></label>)}</section>
    <section className="admin-panel settings-section settings-colors"><div className="admin-panel-head"><div><span className="admin-eyebrow">TEMA GLOBAL</span><h2>Colores y superficies</h2></div></div>{colors.map(([key,label])=><label key={key}>{label}<span><input type="color" name={key} value={settings[key]} onChange={change}/><input name={key} value={settings[key]} onChange={change} pattern="#[0-9A-Fa-f]{6}"/></span></label>)}<label>Radio de bordes<input type="range" min="0" max="32" name="border_radius" value={settings.border_radius} onChange={change}/><small>{settings.border_radius}px</small></label></section>
    <section className="admin-panel settings-section"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONTACTO</span><h2>Canales y enlaces</h2></div></div>{[['support_email','Correo','email'],['support_whatsapp','WhatsApp','text'],['website_url','Sitio web','url'],['instagram_url','Instagram','url'],['facebook_url','Facebook','url'],['tiktok_url','TikTok','url']].map(([key,label,type])=><label key={key}>{label}<input type={type} name={key} value={settings[key]} onChange={change}/></label>)}</section></div>
    <section className="admin-panel settings-integration"><div><span className="admin-eyebrow">INTEGRACIONES</span><h2>Google Drive</h2><p>Actualmente el portal admite referencias autorizadas de Drive en tareas y entregables. La conexión OAuth debe desplegarse mediante funciones seguras; nunca se almacenarán secretos ni tokens en el navegador.</p></div><span className="integration-status"><i/>Modo de enlaces seguros</span></section>
    <footer className="settings-actions"><button type="button" className="admin-secondary" onClick={restore}>Restaurar identidad Biem</button><button type="button" className="admin-secondary" onClick={cancel}>Descartar cambios</button><button className="admin-primary" disabled={saving}>{saving?'Guardando…':'Guardar configuración'}</button></footer>
  </form></div>
}

export default function AdminApp({ profile, onSignOut }) {
  const [active,setActive]=useState('dashboard')
  const [menuOpen,setMenuOpen]=useState(false)
  const workspace=useWorkspace()
  workspace.canWrite=profile.role==='admin'
  const allowed=rolePermissions[profile.role]||[]
  if(!allowed.includes(active)) queueMicrotask(()=>setActive(allowed[0]||'dashboard'))
  const pageProps={workspace}
  const pages={
    dashboard:<Dashboard {...pageProps} setActive={setActive} profile={profile}/>,
    clients:<ClientsPage {...pageProps}/>,
    packages:<PackagesPage {...pageProps}/>,
    deliverables:<EntityTablePage {...pageProps} resource="deliverables" title="Entregables" eyebrow="PRODUCCIÓN REAL" copy="Administra piezas, responsables, archivos y estados." columns={deliverableColumns} filters={['Cliente','Estado','Responsable']}/>, drive_assets:<EntityTablePage {...pageProps} resource="deliverable_drive_assets" title="Archivos Google Drive" eyebrow="BIBLIOTECA VINCULADA" copy="Vincula archivos y carpetas de Drive a entregables y controla su visibilidad para el cliente." columns={driveAssetColumns} filters={['Cliente','Entregable','Visibilidad']}/>,
    calendar:<CalendarPage {...pageProps}/>,
    billing:<EntityTablePage {...pageProps} resource="invoices" title="Facturación" eyebrow="CONTROL FINANCIERO" copy="Gestiona facturas persistentes y su estado de pago." columns={invoiceColumns} filters={['Estado','Cliente']}/>,
    requests:<EntityTablePage {...pageProps} resource="requests" title="Solicitudes" eyebrow="PETICIONES DEL PORTAL" copy="Revisa y administra solicitudes reales de clientes." columns={requestColumns} filters={['Estado','Prioridad']}/>,
    services:<ExtraServicesPage {...pageProps}/>,
    reports:<UnavailablePage title="Reportes" canDismiss={workspace.canWrite}/>, team:<TeamPage {...pageProps}/>, assignments:<EntityTablePage {...pageProps} resource="client_team_assignments" title="Asignaciones" eyebrow="EQUIPO POR CLIENTE" copy="Asigna uno o varios colaboradores con un rol específico." columns={assignmentColumns}/>, tasks:<EntityTablePage {...pageProps} resource="internal_tasks" title="Tareas internas" eyebrow="OPERACIÓN" copy="Asigna y controla trabajo interno sin exponerlo al cliente." columns={taskColumns}/>, notes:<EntityTablePage {...pageProps} resource="internal_notes" title="Notas internas" eyebrow="CONTEXTO PRIVADO" copy="Notas con visibilidad por rol y equipo asignado." columns={noteColumns}/>, brand_profiles:<EntityTablePage {...pageProps} resource="client_brand_profiles" title="Perfiles de marca" eyebrow="IDENTIDAD DEL CLIENTE" copy="Administra logo, información estratégica y la ficha Sobre la marca." columns={brandProfileColumns}/>, meetings:<EntityTablePage {...pageProps} resource="calendar_events" title="Reuniones" eyebrow="CALENDARIO INTERNO" copy="Crea reuniones manuales y comparte enlaces de Google Meet con el cliente." columns={meetingColumns}/>, notifications:<NotificationHistory workspace={workspace}/>, resources:<EntityTablePage {...pageProps} resource="client_resources" title="Estrategia y materiales" eyebrow="VISIBILIDAD CONTROLADA" copy="Diagnósticos, rutas, recomendaciones y materiales con permisos por rol." columns={resourceColumns}/>, confidentiality:<ConfidentialityAdminPage {...pageProps}/>, settings:<SettingsPage workspace={workspace}/>,
  }
  return <div className={`admin-shell ${workspace.canWrite?'':'read-only'}`}><AdminSidebar active={active} setActive={setActive} open={menuOpen} setOpen={setMenuOpen} profile={profile} onLogout={onSignOut}/>{menuOpen&&<div className="admin-overlay" onClick={()=>setMenuOpen(false)}/>}<main className="admin-main"><AdminTopbar active={active} setMenuOpen={setMenuOpen} profile={profile} onRefresh={workspace.refresh}/>{!workspace.canWrite&&<div className="read-only-banner"><Eye size={14}/>Modo de solo lectura: los cambios están deshabilitados</div>}{pages[active]}</main></div>
}
