import { createElement, Fragment, useEffect, useMemo, useState } from './mini-react.js'
import {
  AlertTriangle, ArrowRight, BarChart3, Bell, Briefcase, CalendarDays, Check,
  CheckCircle2, ChevronDown, Clock3, CreditCard, DollarSign, Edit, Eye,
  FileBarChart, FileText, Filter, Grid2X2, Image, LayoutDashboard, LogOut,
  Menu, MessageCircle, MoreHorizontal, Package, Palette, Plus, Receipt, Search,
  Send, Settings, Shield, Sparkles, UserRound, Users, X
} from './icons.jsx'
import { createRecord, deleteRecord, loadAdminWorkspace, updateRecord } from './lib/admin-api.js'

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
  { id:'settings', label:'Configuración', icon:Settings },
]

const rolePermissions = {
  admin: adminNav.map(item => item.id),
  team: ['dashboard','clients','deliverables','calendar','requests'],
  viewer: adminNav.map(item => item.id).filter(id => id !== 'settings'),
  client: [],
}

const labels = {
  active:'Activo', paused:'Pausado', expired:'Vencido', paid:'Pagado', pending:'Pendiente', overdue:'Vencido',
  in_progress:'En proceso', internal_review:'Revisión interna', client_review:'Enviado al cliente',
  changes_requested:'Cambios solicitados', approved:'Aprobado', published:'Publicado', cancelled:'Cancelado',
  new:'Nueva', in_review:'En revisión', rejected:'Rechazada', converted:'Convertida', completed:'Completada',
  high:'Alta', medium:'Media', low:'Baja', admin:'Admin', client:'Cliente', team:'Equipo', viewer:'Viewer',
}

const emptyWorkspace = {
  clients:[], packages:[], invoices:[], deliverables:[], requests:[], extra_services:[], profiles:[],
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
    try {
      await operation()
      setNotice(successMessage)
      refresh()
      return true
    } catch (mutationError) {
      setError(mutationError.message)
      return false
    }
  }

  return { data, loading, error, notice, setError, setNotice, refresh, mutate }
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
      ['file_url','Archivo o enlace','url'],['internal_comments','Comentarios internos','textarea'],['client_comments','Comentarios para cliente','textarea'],
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
}

const categoryLabels = { strategy_growth:'Estrategia y crecimiento', content_design:'Contenido y diseño', advertising_sales:'Publicidad y ventas', organization_automation:'Organización y automatización' }

function relationOptions(type, data) {
  if(type==='clients') return data.clients.map(item=>[item.id,item.brand_name])
  if(type==='packages') return data.packages.map(item=>[item.id,item.name])
  if(type==='profiles') return data.profiles.filter(item=>['admin','team'].includes(item.role)).map(item=>[item.id,item.full_name||item.email])
  if(type==='extra_services') return data.extra_services.map(item=>[item.id,item.name])
  return []
}

function normalizeValue(field, value) {
  if (value === undefined || value === null) return ''
  if (field === 'included_services') return Array.isArray(value) ? value.join('\n') : ''
  if (field === 'scheduled_at') return `${value}`.slice(0,16)
  return value
}

function payloadFromForm(resource, form) {
  const config=formConfigs[resource]
  const formData=new FormData(form)
  const payload={}
  const numeric=new Set(['monthly_price','graphic_pieces','reels','stories','carousels','meetings','package_usage','amount','price_from'])
  const booleans=new Set(['includes_monthly_report','is_active'])
  for(const [name,,type] of config.fields){
    if(booleans.has(name)){ payload[name]=formData.get(name)==='on'; continue }
    let value=formData.get(name)
    if(type==='lines'){ payload[name]=`${value||''}`.split('\n').map(item=>item.trim()).filter(Boolean); continue }
    if(value===''||value===null){ payload[name]=null; continue }
    payload[name]=numeric.has(name)?Number(value):value
    if(name==='scheduled_at'&&value) payload[name]=new Date(value).toISOString()
  }
  if(resource==='invoices'&&!payload.currency) payload.currency='USD'
  return payload
}

function CrudModal({ resource, record, data, onClose, onSave }) {
  const config=formConfigs[resource]
  const editing=Boolean(record?.id)
  const submit=event=>{event.preventDefault();onSave(payloadFromForm(resource,event.currentTarget))}
  return <div className="modal-backdrop" onMouseDown={onClose}><form className="crud-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><header><div><span className="admin-eyebrow">{editing?'EDITAR':'CREAR'}</span><h2>{editing?'Editar':'Nuevo'} {config.title}</h2><p>Los cambios se guardarán directamente en Supabase.</p></div><button type="button" onClick={onClose}><X size={19}/></button></header><div className="crud-form-grid">{config.fields.map(([name,label,type,required,values])=>{
    const value=normalizeValue(name,record?.[name] ?? (name==='status' ? (resource==='requests'?'new':'active') : name==='priority'?'medium':name==='currency'?'USD':undefined))
    if(type==='textarea'||type==='lines') return <label className="span-two" key={name}>{label}<textarea name={name} value={value}/></label>
    if(type==='checkbox') return <label className="crud-checkbox span-two" key={name}><input type="checkbox" name={name} checked={record ? Boolean(record[name]) : true}/><span><strong>{label}</strong><small>Activa o desactiva esta opción.</small></span></label>
    if(type==='select') return <label key={name}>{label}<select name={name} required={required}>{values.map(option=><option value={option} selected={value===option} key={option}>{categoryLabels[option]||labels[option]||option}</option>)}</select></label>
    if(['clients','packages','profiles','extra_services'].includes(type)) return <label key={name}>{label}<select name={name} required={required}><option value="">Sin asignar</option>{relationOptions(type,data).map(([id,text])=><option value={id} selected={value===id} key={id}>{text}</option>)}</select></label>
    return <label key={name}>{label}<input name={name} type={type} value={value} required={required} step={type==='number'?'0.01':undefined}/></label>
  })}</div><footer><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="admin-primary">{editing?'Guardar cambios':'Crear registro'}</button></footer></form></div>
}

function RowActions({ canWrite, onEdit, onDelete }) {
  if(!canWrite) return <span className="read-only-cell"><Eye size={14}/>Solo lectura</span>
  return <div className="table-actions"><button onClick={onEdit}><Edit size={14}/>Editar</button><button className="delete-row" onClick={onDelete}><X size={14}/>Eliminar</button></div>
}

function EntityTablePage({ resource, workspace, title, eyebrow, copy, columns, filters=[] }) {
  const { data, mutate }=workspace
  const [editing,setEditing]=useState(null)
  const [deleting,setDeleting]=useState(null)
  const records=data[resource]||[]
  const canWrite=workspace.canWrite
  const save=async payload=>{
    const ok=await mutate(
      ()=>editing?.id?updateRecord(resource,editing.id,payload):createRecord(resource,payload),
      `${formConfigs[resource].title[0].toUpperCase()+formConfigs[resource].title.slice(1)} ${editing?.id?'actualizado':'creado'} correctamente.`,
    )
    if(ok)setEditing(null)
  }
  const remove=async()=>{
    const ok=await mutate(()=>deleteRecord(resource,deleting.id),`${formConfigs[resource].title} eliminado correctamente.`)
    if(ok)setDeleting(null)
  }
  return <div className="admin-page"><AdminHeading eyebrow={eyebrow} title={title} copy={copy} action={canWrite?<button className="admin-primary" onClick={()=>setEditing({})}><Plus size={16}/>Crear {formConfigs[resource].title}</button>:null}/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><Toolbar placeholder={`Buscar ${title.toLowerCase()}...`} filters={filters}/><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map(column=><th key={column.key}>{column.label}</th>)}<th></th></tr></thead><tbody>{records.map(record=><tr key={record.id}>{columns.map(column=><td key={column.key}>{column.render?column.render(record):record[column.key]||'—'}</td>)}<td><RowActions canWrite={canWrite} onEdit={()=>setEditing(record)} onDelete={()=>setDeleting(record)}/></td></tr>)}{!workspace.loading&&records.length===0&&<tr><td colSpan={columns.length+1}><div className="empty-table"><FileText size={24}/><strong>No hay registros todavía</strong><span>Crea el primero para comenzar.</span></div></td></tr>}</tbody></table></div>{editing&&<CrudModal resource={resource} record={editing} data={data} onClose={()=>setEditing(null)} onSave={save}/>} {deleting&&<ConfirmDelete label={deleting.brand_name||deleting.name||deleting.invoice_number||deleting.request_type} onClose={()=>setDeleting(null)} onConfirm={remove}/>}</div>
}

function Dashboard({ workspace, setActive, profile }) {
  const {data}=workspace
  const activeClients=data.clients.filter(item=>item.status==='active').length
  const pending=data.deliverables.filter(item=>['pending','in_progress'].includes(item.status)).length
  const review=data.deliverables.filter(item=>['internal_review','client_review'].includes(item.status)).length
  const approved=data.deliverables.filter(item=>item.status==='approved').length
  const pendingInvoices=data.invoices.filter(item=>item.status==='pending').length
  const newRequests=data.requests.filter(item=>item.status==='new').length
  const now=Date.now(), inThirty=now+30*86400000
  const renewals=data.clients.filter(item=>{const time=new Date(item.renewal_date).getTime();return time>=now&&time<=inThirty}).length
  const overdueClients=new Set(data.invoices.filter(item=>item.status==='overdue').map(item=>item.client_id)).size
  const cards=[
    ['Clientes activos',activeClients,'Cuentas en servicio',Users,'green'],['Entregables pendientes',pending,'Pendiente o en proceso',Clock3,'amber'],['Por revisar',review,'Interno o cliente',Eye,'lilac'],['Aprobados',approved,'Listos para publicar',CheckCircle2,'blue'],
    ['Facturas pendientes',pendingInvoices,'Por cobrar',Receipt,'coral'],['Solicitudes nuevas',newRequests,'Requieren respuesta',MessageCircle,'lilac'],['Próximas renovaciones',renewals,'En 30 días',CalendarDays,'green'],['Clientes en riesgo',overdueClients,'Con facturas vencidas',AlertTriangle,'coral'],
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

function CalendarPage({ workspace }) {
  const grouped=useMemo(()=>workspace.data.deliverables.reduce((acc,item)=>{const key=item.scheduled_at?.slice(0,10)||item.due_date||'Sin fecha';(acc[key]||=[]).push(item);return acc},{}),[workspace.data.deliverables])
  return <div className="admin-page"><AdminHeading eyebrow="PROGRAMACIÓN REAL" title="Calendario" copy="Entregables agrupados por la fecha almacenada en Supabase."/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="real-calendar-list">{Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=><section key={date}><div className="real-calendar-date"><CalendarDays size={17}/><strong>{formatDate(date)}</strong><span>{items.length} pieza{items.length!==1?'s':''}</span></div><div>{items.map(item=><article key={item.id}><div><span>{item.clients?.brand_name}</span><strong>{item.name}</strong><small>{item.content_type} · {item.assignee?.full_name||'Sin asignar'}</small></div><Badge value={item.status}/></article>)}</div></section>)}{!workspace.loading&&!Object.keys(grouped).length&&<div className="empty-table"><CalendarDays size={28}/><strong>No hay entregables programados</strong></div>}</div></div>
}

function TeamPage({ workspace }) {
  return <div className="admin-page"><AdminHeading eyebrow="USUARIOS REALES" title="Equipo" copy="Perfiles registrados en Supabase Auth y public.profiles."/><Feedback error={workspace.error} notice={workspace.notice} loading={workspace.loading}/><div className="team-admin-grid">{workspace.data.profiles.map(member=><article key={member.id}><header><div className="team-avatar large">{initials(member.full_name||member.email)}</div><Badge value="active"/></header><h3>{member.full_name||'Sin nombre'}</h3><p>{member.email}</p><span className="role-label">{labels[member.role]}</span><footer><span className="muted-cell">Creado {formatDate(member.created_at)}</span></footer></article>)}</div></div>
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
    reports:<UnavailablePage title="Reportes"/>, team:<TeamPage {...pageProps}/>, settings:<UnavailablePage title="Configuración"/>,
  }
  return <div className={`admin-shell ${workspace.canWrite?'':'read-only'}`}><AdminSidebar active={active} setActive={setActive} open={menuOpen} setOpen={setMenuOpen} profile={profile} onLogout={onSignOut}/>{menuOpen&&<div className="admin-overlay" onClick={()=>setMenuOpen(false)}/>}<main className="admin-main"><AdminTopbar active={active} setMenuOpen={setMenuOpen} profile={profile} onRefresh={workspace.refresh}/>{!workspace.canWrite&&<div className="read-only-banner"><Eye size={14}/>Modo de solo lectura: los cambios están deshabilitados</div>}{pages[active]}</main></div>
}
