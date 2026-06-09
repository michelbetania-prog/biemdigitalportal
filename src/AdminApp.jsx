import { createElement, Fragment, useEffect, useMemo, useState } from './mini-react.js'
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Briefcase, CalendarDays, Check,
  CheckCircle2, ChevronDown, Clock3, CreditCard, DollarSign, Edit, Eye,
  FileBarChart, FileText, Filter, Grid2X2, Image, LayoutDashboard, LogOut,
  Menu, MessageCircle, MoreHorizontal, Package, Palette, Plus, Receipt, Search,
  Send, Settings, Shield, Sparkles, UserRound, Users, X
} from './icons.jsx'
import { activateConfidentialityAgreement, createRecord, deleteRecord, loadAdminWorkspace, loadConfidentialityAdmin, updateRecord, inviteTeamMember } from './lib/admin-api.js'

const adminNav = [
  { id:'dashboard', label:'Dashboard', icon:LayoutDashboard },
  { id:'clients', label:'Clientes', icon:Users },
  { id:'packages', label:'Paquetes', icon:Package },
  { id:'deliverables', label:'Entregables', icon:Grid2X2 },
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
  { id:'confidentiality', label:'Confidencialidad', icon:Shield },
  { id:'settings', label:'Configuración', icon:Settings },
]

const rolePermissions = {
  admin: adminNav.map(item => item.id),
  client: [],
}

const labels = {
  active:'Activo', paused:'Pausado', expired:'Vencido', paid:'Pagado', pending:'Pendiente', overdue:'Vencido',
  in_progress:'En proceso', internal_review:'Revisión interna', client_review:'Enviado al cliente',
  changes_requested:'Cambios solicitados', approved:'Aprobado', published:'Publicado', cancelled:'Cancelado',
  new:'Nueva', in_review:'En revisión', rejected:'Rechazada', converted:'Convertida', completed:'Completada',
  high:'Alta', medium:'Media', low:'Baja', admin:'Admin', client:'Cliente', viewer:'Viewer', account_manager:'Agente de cuenta', designer:'Diseño gráfico', social_media:'Social media', video_editor:'Editor de video', ready_for_review:'Listo para revisión', corrected:'Corregido',
}

const emptyWorkspace = {
  clients:[], packages:[], invoices:[], deliverables:[], requests:[], extra_services:[], profiles:[], client_team_assignments:[], internal_tasks:[], internal_notes:[], client_resources:[], confidentiality_agreements:[], client_confidentiality_acceptances:[],
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

function AdminSidebar({ active, setActive, open, setOpen, profile, onLogout }) {
  const allowed = rolePermissions[profile.role] || []
  return <aside className={`admin-sidebar ${open?'open':''}`}>
    <div className="admin-sidebar-head"><AdminLogo/><button className="admin-mobile-close" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="admin-workspace"><div className="admin-workspace-icon">BD</div><div><small>ESPACIO DE TRABAJO</small><strong>Biem Digital</strong></div><ChevronDown size={15}/></div>
    <nav><span>GESTIÓN</span>{adminNav.filter(item=>allowed.includes(item.id)).map(item=>{const Icon=item.icon;return <button key={item.id} className={active===item.id?'active':''} onClick={()=>{setActive(item.id);setOpen(false)}}><Icon size={18}/><b>{item.label}</b></button>})}</nav>
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
      ['client_id','Cliente','clients',true],['assigned_to','Responsable','profiles'],['task_type','Tipo','select',true,['design','video','copy','social_media','strategy','review','administration']],['title','Título','text',true],['description','Descripción','textarea'],['status','Estado','select',true,['pending','in_progress','ready_for_review','changes_requested','corrected','completed','paused']],['priority','Prioridad','select',true,['low','medium','high']],['due_date','Fecha límite','date'],['result_url','Resultado o enlace','url'],['internal_comment','Comentario interno','textarea'],['visible_to_client','Visible para cliente','checkbox'],['visible_to_account_manager','Visible para agente','checkbox'],['visible_to_designer','Visible para diseño','checkbox'],['visible_to_social_media','Visible para social media','checkbox'],['visible_to_video_editor','Visible para video','checkbox'],['internal_only','Solo interno','checkbox'],
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
  if(type==='extra_services') return data.extra_services.map(item=>[item.id,item.name])
  return []
}

function normalizeValue(field, value) {
  if (value === undefined || value === null) return ''
  if (field === 'included_services') return Array.isArray(value) ? value.join('\n') : ''
  if (field === 'scheduled_at') return `${value}`.slice(0,16)
  return value
}

const integerFields = new Set(['graphic_pieces','reels','stories','carousels','meetings','package_usage'])
const decimalFields = new Set(['monthly_price','amount','price_from'])
const nonNegativeFields = new Set([...integerFields, ...decimalFields])

const createDefaults = {
  clients: { status:'active', package_usage:0 },
  packages: { monthly_price:0, graphic_pieces:0, reels:0, stories:0, carousels:0, meetings:0, includes_monthly_report:true, is_active:true },
  invoices: { amount:0, currency:'USD', status:'pending' },
  deliverables: { status:'pending', priority:'medium' },
  requests: { status:'new', priority:'medium' },
  internal_tasks: { status:'pending', priority:'medium', visible_to_account_manager:true, internal_only:true },
  client_team_assignments: { is_active:true },
  client_resources: { status:'draft', visible_to_account_manager:true, internal_only:true },
  extra_services: { price_from:0, is_active:true },
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
  const booleans=new Set(['includes_monthly_report','is_active','visible_to_client','visible_to_admin','visible_to_account_manager','visible_to_designer','visible_to_social_media','visible_to_video_editor','internal_only'])
  for(const [name,,type] of config.fields){
    if(booleans.has(name)){ payload[name]=formData.get(name)==='on'; continue }
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
    if(name==='scheduled_at'&&value) payload[name]=new Date(value).toISOString()
  }
  if(resource==='invoices'&&!payload.currency) payload.currency='USD'
  return payload
}

function CrudModal({ resource, record, data, onClose, onSave, error, saving }) {
  const config=formConfigs[resource]
  const editing=Boolean(record?.id)
  const submit=async event=>{
    event.preventDefault()
    try { await onSave(payloadFromForm(resource,event.currentTarget)) }
    catch (validationError) { console.error('[BIEM form validation]', validationError); data.setFormError(validationError.message) }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="crud-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><header><div><span className="admin-eyebrow">{editing?'EDITAR':'CREAR'}</span><h2>{editing?'Editar':'Nuevo'} {config.title}</h2><p>Los cambios se guardarán directamente en Supabase.</p></div><button type="button" onClick={onClose}><X size={19}/></button></header><div className="crud-form-grid">{config.fields.map(([name,label,type,required,values])=>{
    const value=normalizeValue(name,initialFieldValue(resource,record,name))
    if(type==='textarea'||type==='lines') return <label className="span-two" key={name}>{label}<textarea name={name} value={value}/></label>
    if(type==='checkbox') return <label className="crud-checkbox span-two" key={name}><input type="checkbox" name={name} checked={record ? Boolean(record[name]) : !['visible_to_client','visible_to_designer','visible_to_social_media','visible_to_video_editor'].includes(name)}/><span><strong>{label}</strong><small>Activa o desactiva esta opción.</small></span></label>
    if(type==='select') return <label key={name}>{label}<select name={name} required={required}>{values.map(option=><option value={option} selected={value===option} key={option}>{categoryLabels[option]||labels[option]||option}</option>)}</select></label>
    if(['clients','packages','profiles','staff_profiles','extra_services'].includes(type)) return <label key={name}>{label}<select name={name} required={required}><option value="">Sin asignar</option>{relationOptions(type,data).map(([id,text])=><option value={id} selected={value===id} key={id}>{text}</option>)}</select></label>
    return <label key={name}>{label}<input name={name} type={type} value={value} required={required} min={nonNegativeFields.has(name)?'0':undefined} step={integerFields.has(name)?'1':type==='number'?'0.01':undefined} inputMode={type==='number'?'decimal':undefined}/></label>
  })}</div>{error&&<div className="data-feedback error modal-error"><AlertTriangle size={16}/>{error}</div>}<footer><button type="button" className="admin-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="submit" className="admin-primary" disabled={saving}>{saving?'Guardando en Supabase...':editing?'Guardar cambios':'Crear registro'}</button></footer></form></div>
}

function RowActions({ canWrite, onEdit, onDelete }) {
  if(!canWrite) return <span className="read-only-cell"><Eye size={14}/>Solo lectura</span>
  return <div className="table-actions"><button onClick={onEdit}><Edit size={14}/>Editar</button><button className="delete-row" onClick={onDelete}><X size={14}/>Eliminar</button></div>
}

function EntityTablePage({ resource, workspace, title, eyebrow, copy, columns, filters=[] }) {
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
  return <div className="admin-page"><AdminHeading eyebrow={eyebrow} title={title} copy={copy} action={canWrite?<button className="admin-primary" onClick={()=>{setFormError('');setEditing({})}}><Plus size={16}/>Crear {formConfigs[resource].title}</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><Toolbar placeholder={`Buscar ${title.toLowerCase()}...`} filters={filters}/><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(column=><th key={column.key}>{column.label}</th>)}<th></th></tr></thead><tbody>{records.map(record=><tr key={record.id}>{columns.map(column=><td key={column.key}>{column.render?column.render(record):record[column.key]||'—'}</td>)}<td><RowActions canWrite={canWrite} onEdit={()=>{setFormError('');setEditing(record)}} onDelete={()=>setDeleting(record)}/></td></tr>)}{!workspace.loading&&records.length===0&&<tr><td colSpan={columns.length+1}><div className="empty-table"><FileText size={24}/><strong>No hay registros todavía</strong><span>Crea el primero para comenzar.</span></div></td></tr>}</tbody></table></div>{editing&&<CrudModal resource={resource} record={editing} data={{...data,setFormError}} onClose={()=>setEditing(null)} onSave={save} error={formError||workspace.error} saving={workspace.mutating}/>} {deleting&&<ConfirmDelete label={deleting.brand_name||deleting.name||deleting.invoice_number||deleting.request_type} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>
}

function Dashboard({ workspace, setActive, profile }) {
  const {data}=workspace
  const activeClients=data.clients.filter(item=>item.status==='active').length
  const pending=data.deliverables.filter(item=>['pending','in_progress'].includes(item.status)).length
  const review=data.deliverables.filter(item=>['internal_review','client_review'].includes(item.status)).length
  const approved=data.deliverables.filter(item=>item.status==='approved').length
  const pendingInvoices=data.invoices.filter(item=>item.status==='pending').length
  const newRequests=data.requests.filter(item=>item.status==='new').length
  const activeAgreement=data.confidentiality_agreements.find(item=>item.is_active)
  const acceptedClients=new Set(data.client_confidentiality_acceptances.filter(item=>item.agreement_id===activeAgreement?.id&&item.agreement_version===activeAgreement?.version).map(item=>item.client_id))
  const confidentialityPending=activeAgreement?data.clients.filter(item=>!acceptedClients.has(item.id)).length:0
  const onboardingPending=data.clients.filter(item=>!item.onboarding_completed).length
  const cards=[
    ['Clientes activos',activeClients,'Cuentas en servicio',Users,'green'],['Entregables pendientes',pending,'Pendiente o en proceso',Clock3,'amber'],['Por revisar',review,'Interno o cliente',Eye,'lilac'],['Tareas abiertas',data.internal_tasks.filter(item=>!['completed','paused'].includes(item.status)).length,'Trabajo del equipo',CheckCircle2,'blue'],
    ['Facturas pendientes',pendingInvoices,'Por cobrar',Receipt,'coral'],['Solicitudes nuevas',newRequests,'Requieren respuesta',MessageCircle,'lilac'],['Confidencialidad pendiente',confidentialityPending,'Versión activa',Shield,'green'],['Onboarding pendiente',onboardingPending,'Nuevos o actualización',AlertTriangle,'coral'],
  ]
  const activity=[
    ...data.requests.slice(0,3).map(item=>({id:`r-${item.id}`,title:item.clients?.brand_name||'Cliente',text:`solicitó ${item.request_type}`,time:formatDate(item.created_at),icon:MessageCircle})),
    ...data.deliverables.slice(0,3).map(item=>({id:`d-${item.id}`,title:item.clients?.brand_name||'Cliente',text:`actualizó ${item.name}`,time:formatDate(item.updated_at),icon:Image})),
    ...data.invoices.slice(0,2).map(item=>({id:`i-${item.id}`,title:item.clients?.brand_name||'Cliente',text:`factura ${labels[item.status]}`,time:formatDate(item.updated_at),icon:Receipt})),
  ].sort((a,b)=>`${b.time}`.localeCompare(`${a.time}`)).slice(0,6)
  return <div className="admin-page"><AdminHeading eyebrow="DATOS EN TIEMPO REAL" title={`Hola, ${profile.full_name?.split(' ')[0]||'equipo'}`} copy="Resumen operativo cargado directamente desde Supabase." action={workspace.canWrite?<button className="admin-primary" onClick={()=>setActive('deliverables')}><Plus size={16}/>Gestionar entregables</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><section className="admin-kpi-grid">{cards.map(([label,value,note,Icon,tone])=><article key={label}><div className={`admin-kpi-icon ${tone}`}><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><p>{note}</p></article>)}</section><section className="admin-dashboard-grid"><div className="admin-panel activity-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SUPABASE</span><h2>Actividad reciente</h2></div></div><div className="activity-list">{activity.map(item=>{const Icon=item.icon;return <div className="activity-item" key={item.id}><div className="activity-icon"><Icon size={15}/></div><div><p><strong>{item.title}</strong> {item.text}</p><span>{item.time}</span></div></div>})}{!activity.length&&<div className="empty-table"><Sparkles size={22}/><strong>Sin actividad reciente</strong></div>}</div></div><div className="admin-panel attention-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">PRIORIDADES</span><h2>Necesita atención</h2></div></div><button className="attention-row" onClick={()=>setActive('billing')}><div className="attention-date overdue">{data.invoices.filter(i=>i.status==='overdue').length}<span>VENCIDAS</span></div><div><strong>Facturas vencidas</strong><span>Revisar seguimiento de cobro</span></div><ArrowRight size={15}/></button><button className="attention-row" onClick={()=>setActive('requests')}><div className="attention-date request">{newRequests}<span>NUEVAS</span></div><div><strong>Solicitudes por revisar</strong><span>Asignar y responder</span></div><ArrowRight size={15}/></button><button className="attention-row" onClick={()=>setActive('deliverables')}><div className="attention-date renewal">{review}<span>REVISIÓN</span></div><div><strong>Piezas esperando revisión</strong><span>Interna o del cliente</span></div><ArrowRight size={15}/></button></div></section></div>
}

const clientColumns=[
  {key:'brand_name',label:'Cliente',render:item=><div className="client-cell"><div className="brand-avatar">{initials(item.brand_name)}</div><div><strong>{item.brand_name}</strong><span>{item.name}</span></div></div>},
  {key:'package',label:'Paquete',render:item=>item.packages?.name||'Sin paquete'}, {key:'status',label:'Estado',render:item=><Badge value={item.status}/>},
  {key:'renewal_date',label:'Renovación',render:item=>formatDate(item.renewal_date)}, {key:'assigned_to',label:'Responsable',render:item=>item.assignee?.full_name||item.assignee?.email||'Sin asignar'},
  {key:'package_usage',label:'Uso',render:item=><strong>{item.package_usage||0}</strong>},
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
  return <div className="admin-page"><AdminHeading eyebrow="USUARIOS REALES" title="Equipo" copy="Asigna el rol principal aquí y vincula colaboradores a clientes desde Asignaciones." action={<button className="admin-primary" onClick={invite}><Plus size={16}/>Invitar colaborador</button>}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="team-admin-grid">{workspace.data.profiles.map(member=><article key={member.id}><header><div className="team-avatar large">{initials(member.full_name||member.email)}</div><Badge value="active"/></header><h3>{member.full_name||'Sin nombre'}</h3><p>{member.email}</p><label className="team-role-editor">Rol<select value={member.role} onChange={event=>changeRole(member,event.target.value)}>{roles.map(role=><option value={role} key={role}>{labels[role]}</option>)}</select></label><footer><span className="muted-cell">Creado {formatDate(member.created_at)}</span></footer></article>)}</div><div className="admin-empty compact"><Shield size={20}/><p>Las invitaciones se procesan mediante una Edge Function segura. El navegador nunca utiliza una service role key.</p></div></div>
}

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

  return <div className="admin-page"><AdminHeading eyebrow="ACCESO PRIVADO" title="Confidencialidad" copy="Gestiona versiones del compromiso y revisa qué clientes aceptaron." action={<button className="admin-primary" onClick={()=>setEditing({})}><Plus size={16}/>Crear versión</button>}/><Feedback error={error} notice={notice} loading={loading}/><div className="acceptance-counts"><span><strong>{data.agreements.length}</strong>versiones</span><span><strong>{acceptedClients.size}</strong>clientes aceptaron la activa</span><span><strong>{pending}</strong>pendientes</span></div><div className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">VERSIONES</span><h2>Compromisos registrados</h2></div></div><div className="confidentiality-admin-list">{data.agreements.map(item=><article className="confidentiality-admin-card" key={item.id}><div><Badge value={item.is_active?'active':'paused'}/><h3>{item.title} · {item.version}</h3><p>{item.content.slice(0,180)}{item.content.length>180?'…':''}</p></div><div className="confidentiality-admin-actions">{!item.is_active&&<button className="admin-primary" onClick={()=>run(()=>activateConfidentialityAgreement(item.id),'Nueva versión activa. Los clientes deberán aceptarla.')}>Activar</button>}<button className="admin-secondary" onClick={()=>setEditing(item)}><Edit size={14}/>Editar</button>{!item.is_active&&<button className="danger-button" onClick={()=>setDeleting(item)}>Eliminar</button>}</div></article>)}{!loading&&!data.agreements.length&&<div className="empty-table"><Shield size={24}/><strong>No hay compromisos registrados</strong></div>}</div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Cliente</th><th>Versión</th><th>Nombre aceptante</th><th>Fecha</th><th>IP</th></tr></thead><tbody>{data.acceptances.map(item=><tr key={item.id}><td><strong>{item.clients?.brand_name||'Cliente'}</strong></td><td>{item.agreement_version}</td><td>{item.accepted_name}</td><td>{formatDate(item.accepted_at)}</td><td>{item.ip_address||'No disponible'}</td></tr>)}{!loading&&!data.acceptances.length&&<tr><td colSpan="5"><div className="empty-table"><FileText size={22}/><strong>Aún no hay aceptaciones</strong></div></td></tr>}</tbody></table></div>{editing&&<CrudModal resource="confidentiality_agreements" record={editing} data={{...workspace.data,setFormError:setError}} onClose={()=>setEditing(null)} onSave={save} error={error} saving={false}/>} {deleting&&<ConfirmDelete label={`${deleting.title} ${deleting.version}`} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>
}

function UnavailablePage({ title }) {
  return <div className="admin-page"><AdminHeading eyebrow="PRÓXIMA INTEGRACIÓN" title={title} copy="Este módulo no usa datos de ejemplo. Requiere su tabla y migración correspondiente antes de habilitarse."/><div className="admin-empty"><FileText size={30}/><h3>Sin fuente de datos configurada</h3><p>No se muestran mocks para evitar confundir información de prueba con datos reales.</p></div></div>
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
    clients:<EntityTablePage {...pageProps} resource="clients" title="Clientes" eyebrow="CARTERA REAL" copy="Crea, edita y elimina cuentas persistentes." columns={clientColumns} filters={['Estado','Paquete','Responsable']}/>,
    packages:<EntityTablePage {...pageProps} resource="packages" title="Paquetes" eyebrow="OFERTA REAL" copy="Gestiona los planes contratables de la agencia." columns={packageColumns}/>,
    deliverables:<EntityTablePage {...pageProps} resource="deliverables" title="Entregables" eyebrow="PRODUCCIÓN REAL" copy="Administra piezas, responsables, archivos y estados." columns={deliverableColumns} filters={['Cliente','Estado','Responsable']}/>,
    calendar:<CalendarPage {...pageProps}/>,
    billing:<EntityTablePage {...pageProps} resource="invoices" title="Facturación" eyebrow="CONTROL FINANCIERO" copy="Gestiona facturas persistentes y su estado de pago." columns={invoiceColumns} filters={['Estado','Cliente']}/>,
    requests:<EntityTablePage {...pageProps} resource="requests" title="Solicitudes" eyebrow="PETICIONES DEL PORTAL" copy="Revisa y administra solicitudes reales de clientes." columns={requestColumns} filters={['Estado','Prioridad']}/>,
    services:<EntityTablePage {...pageProps} resource="extra_services" title="Servicios adicionales" eyebrow="CATÁLOGO REAL" copy="Configura los servicios visibles en el portal cliente." columns={serviceColumns}/>,
    reports:<UnavailablePage title="Reportes"/>, team:<TeamPage {...pageProps}/>, assignments:<EntityTablePage {...pageProps} resource="client_team_assignments" title="Asignaciones" eyebrow="EQUIPO POR CLIENTE" copy="Asigna uno o varios colaboradores con un rol específico." columns={assignmentColumns}/>, tasks:<EntityTablePage {...pageProps} resource="internal_tasks" title="Tareas internas" eyebrow="OPERACIÓN" copy="Asigna y controla trabajo interno sin exponerlo al cliente." columns={taskColumns}/>, notes:<EntityTablePage {...pageProps} resource="internal_notes" title="Notas internas" eyebrow="CONTEXTO PRIVADO" copy="Notas con visibilidad por rol y equipo asignado." columns={noteColumns}/>, resources:<EntityTablePage {...pageProps} resource="client_resources" title="Estrategia y materiales" eyebrow="VISIBILIDAD CONTROLADA" copy="Diagnósticos, rutas, recomendaciones y materiales con permisos por rol." columns={resourceColumns}/>, confidentiality:<ConfidentialityAdminPage {...pageProps}/>, settings:<UnavailablePage title="Configuración"/>,
  }
  return <div className={`admin-shell ${workspace.canWrite?'':'read-only'}`}><AdminSidebar active={active} setActive={setActive} open={menuOpen} setOpen={setMenuOpen} profile={profile} onLogout={onSignOut}/>{menuOpen&&<div className="admin-overlay" onClick={()=>setMenuOpen(false)}/>}<main className="admin-main"><AdminTopbar active={active} setMenuOpen={setMenuOpen} profile={profile} onRefresh={workspace.refresh}/>{!workspace.canWrite&&<div className="read-only-banner"><Eye size={14}/>Modo de solo lectura: los cambios están deshabilitados</div>}{pages[active]}</main></div>
}
