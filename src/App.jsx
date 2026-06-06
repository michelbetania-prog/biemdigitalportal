import { createElement, Fragment, useMemo, useState } from './mini-react.js'
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, CalendarDays, Check, CheckCircle2,
  ChevronDown, Circle, Clock3, Download, FileBarChart, FileText, Grid2X2,
  Image, Instagram, LayoutDashboard, Menu, MessageCircle, MoreHorizontal,
  Paperclip, PencilLine, Play, Plus, Send, Sparkles, Target, TrendingUp,
  UserRound, Users, Video, X, Zap
} from './icons.jsx'

const navItems = [
  { id: 'summary', label: 'Resumen del mes', icon: LayoutDashboard },
  { id: 'deliverables', label: 'Entregables', icon: Grid2X2, badge: 3 },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'report', label: 'Reporte mensual', icon: FileBarChart },
  { id: 'messages', label: 'Mensajes', icon: MessageCircle, dot: true },
]

const statusMap = {
  review: { label: 'Por revisar', className: 'review' },
  approved: { label: 'Aprobado', className: 'approved' },
  published: { label: 'Publicado', className: 'published' },
  changes: { label: 'Cambios solicitados', className: 'changes' },
  scheduled: { label: 'Programado', className: 'scheduled' },
}

const initialDeliverables = [
  { id: 1, title: 'Reel · Rutina de mañana', type: 'Reel', date: '08 Jun', status: 'review', color: 'peach', icon: Video, caption: 'Una rutina simple para empezar el día con intención.', tag: 'EDUCATIVO' },
  { id: 2, title: 'Carrusel · 5 mitos del skincare', type: 'Carrusel', date: '10 Jun', status: 'review', color: 'green', icon: Image, caption: 'Desmitificamos lo que tu piel realmente necesita.', tag: 'VALOR' },
  { id: 3, title: 'Historias · Behind the scenes', type: 'Historias', date: '12 Jun', status: 'review', color: 'lilac', icon: Instagram, caption: 'El proceso detrás de cada fórmula.', tag: 'MARCA' },
  { id: 4, title: 'Reel · Ingrediente del mes', type: 'Reel', date: '04 Jun', status: 'approved', color: 'yellow', icon: Play, caption: 'El ingrediente que transforma tu rutina.', tag: 'PRODUCTO' },
  { id: 5, title: 'Post · Manifiesto de marca', type: 'Post', date: '02 Jun', status: 'published', color: 'coral', icon: Image, caption: 'Creemos en una belleza más consciente.', tag: 'MARCA' },
  { id: 6, title: 'Carrusel · Guía de hidratación', type: 'Carrusel', date: '15 Jun', status: 'scheduled', color: 'blue', icon: Image, caption: 'Tu guía definitiva para una piel hidratada.', tag: 'EDUCATIVO' },
]

const calendarEvents = {
  2: [{ title: 'Manifiesto de marca', type: 'Post', status: 'published' }],
  4: [{ title: 'Ingrediente del mes', type: 'Reel', status: 'approved' }],
  6: [{ title: 'Tips rápidos', type: 'Historias', status: 'scheduled' }],
  8: [{ title: 'Rutina de mañana', type: 'Reel', status: 'review', need: 'Necesitamos tu video' }],
  10: [{ title: '5 mitos del skincare', type: 'Carrusel', status: 'review' }],
  12: [{ title: 'Behind the scenes', type: 'Historias', status: 'review', need: 'Necesitamos 3 fotos' }],
  15: [{ title: 'Guía de hidratación', type: 'Carrusel', status: 'scheduled' }],
  18: [{ title: 'Testimonio Ana', type: 'Reel', status: 'scheduled' }],
  20: [{ title: 'Encuesta de piel', type: 'Historias', status: 'scheduled' }],
  23: [{ title: 'Ritual de noche', type: 'Reel', status: 'scheduled', need: 'Necesitamos tu voz' }],
  26: [{ title: 'Producto favorito', type: 'Post', status: 'scheduled' }],
  29: [{ title: 'Cierre del mes', type: 'Carrusel', status: 'scheduled' }],
}

function Logo({ compact = false }) {
  return <div className={`logo ${compact ? 'compact' : ''}`}><span className="logo-mark"><i /><i /><i /></span>{!compact && <span>biem<span className="logo-dot">.</span></span>}</div>
}

function StatusPill({ status }) {
  const data = statusMap[status]
  return <span className={`status-pill ${data.className}`}><span />{data.label}</span>
}

function Sidebar({ active, setActive, open, setOpen }) {
  return <aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="sidebar-head"><Logo /><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></div>
    <div className="client-switcher">
      <div className="client-avatar">AL</div>
      <div><small>CUENTA ACTIVA</small><strong>Alma Studio</strong></div>
      <ChevronDown size={16} />
    </div>
    <nav>
      <span className="nav-label">ESPACIO DE TRABAJO</span>
      {navItems.map(item => {
        const Icon = item.icon
        return <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => { setActive(item.id); setOpen(false) }}>
          <Icon size={19} strokeWidth={1.8} /><span>{item.label}</span>
          {item.badge && <b>{item.badge}</b>}{item.dot && <i className="unread-dot" />}
        </button>
      })}
    </nav>
    <div className="sidebar-insight">
      <div className="insight-icon"><Sparkles size={17} /></div>
      <span>FOCO DEL MES</span>
      <strong>Construir autoridad de marca</strong>
      <p>Contenido educativo + presencia humana.</p>
      <div className="progress"><i style={{ width: '68%' }} /></div>
      <small>68% del plan completado</small>
    </div>
    <div className="sidebar-user">
      <div className="user-avatar">MS</div><div><strong>María Santos</strong><span>Cliente</span></div><MoreHorizontal size={19} />
    </div>
  </aside>
}

function Topbar({ active, setMenuOpen }) {
  const titles = { summary: 'Resumen del mes', deliverables: 'Entregables', calendar: 'Calendario de contenido', report: 'Reporte mensual', messages: 'Mensajes' }
  return <header className="topbar">
    <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
    <div><span>ALMA STUDIO <i>/</i></span><strong>{titles[active]}</strong></div>
    <div className="top-actions"><button className="icon-button notification" aria-label="Notificaciones"><Bell size={19} /><i /></button><div className="top-avatar">MS</div></div>
  </header>
}

function SectionHeading({ eyebrow, title, copy, actions }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>
}

function Summary({ deliverables, onNavigate, approveReport, reportApproved }) {
  const pending = deliverables.filter(x => x.status === 'review').length
  return <div className="page-content summary-page">
    <SectionHeading eyebrow="JUNIO 2026" title={<>Buenos días, María <span className="wave">✦</span></>} copy="Todo lo que estamos construyendo para Alma, en un solo lugar." />
    <section className="hero-report">
      <div className="hero-copy">
        <span className="hero-kicker"><Sparkles size={14} /> REPORTE DE MAYO LISTO</span>
        <h2>Un mes de crecimiento<br />que merece verse.</h2>
        <p>Tu comunidad creció y el contenido educativo fue el gran protagonista.</p>
        <div className="hero-actions">
          <button className={`primary-button light ${reportApproved ? 'approved-btn' : ''}`} onClick={approveReport}>{reportApproved ? <><Check size={17} /> Reporte aprobado</> : <>Revisar y aprobar <ArrowRight size={17} /></>}</button>
          <button className="text-button light" onClick={() => onNavigate('report')}>Ver reporte completo</button>
        </div>
      </div>
      <div className="hero-visual">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="metric-float reach"><TrendingUp size={15} /><div><strong>+28%</strong><span>alcance</span></div></div>
        <div className="metric-float community"><Users size={15} /><div><strong>+184</strong><span>comunidad</span></div></div>
        <div className="hero-phone"><div className="phone-notch" /><div className="phone-art"><span>alma</span><strong>Tu piel.<br />Tu ritual.</strong><i /></div></div>
      </div>
    </section>

    <section className="stats-grid">
      <article><div className="stat-icon coral"><FileText size={20} /></div><div><span>PIEZAS DEL MES</span><strong>12 <small>/ 16</small></strong><p><b>75%</b> del plan completado</p></div><div className="mini-progress"><i style={{ width: '75%' }} /></div></article>
      <article><div className="stat-icon amber"><Clock3 size={20} /></div><div><span>POR TU APROBACIÓN</span><strong>{pending}</strong><p>Requieren de tu atención</p></div><button className="round-arrow" onClick={() => onNavigate('deliverables')}><ArrowRight size={17} /></button></article>
      <article><div className="stat-icon mint"><BarChart3 size={20} /></div><div><span>ALCANCE TOTAL</span><strong>48.6K</strong><p className="positive"><TrendingUp size={13} /> 28% vs. abril</p></div><div className="sparkline"><svg viewBox="0 0 100 35"><path d="M0 30 C12 28, 15 18, 25 22 S40 30, 50 18 S64 18, 72 10 S88 14, 100 2" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg></div></article>
      <article><div className="stat-icon lavender"><Users size={20} /></div><div><span>COMUNIDAD</span><strong>3,248</strong><p className="positive"><TrendingUp size={13} /> +184 este mes</p></div><div className="avatar-stack"><i>LA</i><i>MC</i><i>+</i></div></article>
    </section>

    <section className="two-column">
      <div className="panel pending-panel">
        <div className="panel-title"><div><span className="eyebrow">TU ATENCIÓN</span><h3>Esperando tu aprobación</h3></div><button className="text-button" onClick={() => onNavigate('deliverables')}>Ver todos <ArrowRight size={15} /></button></div>
        <div className="approval-list">
          {deliverables.filter(x => x.status === 'review').slice(0, 3).map(item => <button key={item.id} onClick={() => onNavigate('deliverables')} className="approval-item">
            <div className={`thumb ${item.color}`}><item.icon size={18} /></div><div><strong>{item.title}</strong><span>{item.type} · Programado {item.date}</span></div><StatusPill status={item.status} /><ArrowRight size={16} />
          </button>)}
        </div>
      </div>
      <div className="panel meeting-panel">
        <div className="panel-title"><div><span className="eyebrow">PRÓXIMO EN AGENDA</span><h3>Nuestra próxima reunión</h3></div><CalendarDays size={21} /></div>
        <div className="meeting-body"><div className="date-card"><strong>18</strong><span>JUN</span></div><div><h4>Revisión mensual + estrategia</h4><p><Clock3 size={14} /> 10:00 AM · 45 min</p><p><Video size={14} /> Google Meet</p></div></div>
        <div className="meeting-footer"><div className="attendees"><i>BI</i><i>MS</i><span>Tú + equipo BIEM</span></div><button className="secondary-button">Ver agenda</button></div>
      </div>
    </section>
    <section className="focus-strip"><div className="focus-icon"><Target size={24} /></div><div><span className="eyebrow">ENFOQUE DE JUNIO</span><h3>Convertir conocimiento en confianza.</h3><p>Este mes posicionamos a Alma como referente a través de contenido educativo, historias reales y una presencia más humana.</p></div><div className="focus-tags"><span>01 · EDUCAR</span><span>02 · HUMANIZAR</span><span>03 · CONVERTIR</span></div></section>
  </div>
}

function DeliverableModal({ item, onClose, onApprove, onChanges }) {
  const [comment, setComment] = useState('')
  const [mode, setMode] = useState('view')
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="deliverable-modal" onMouseDown={e => e.stopPropagation()}>
    <button className="modal-close" onClick={onClose}><X size={20} /></button>
    <div className={`modal-preview ${item.color}`}><div className="preview-brand">alma</div><span>{item.tag}</span><h2>{item.caption}</h2><div className="preview-product"><i /><i /><i /></div><small>@almastudio</small></div>
    <div className="modal-details">
      <div><StatusPill status={item.status} /><span className="modal-date">Programado · {item.date}</span></div>
      <h2>{item.title}</h2>
      <p className="caption-label">COPY PROPUESTO</p><p className="caption-copy">{item.caption} Descubre una manera más consciente de cuidar de ti, un paso a la vez. ✨</p>
      <div className="meta-row"><span><Instagram size={15} /> Instagram</span><span><item.icon size={15} /> {item.type}</span></div>
      {mode === 'changes' ? <div className="comment-box"><label>¿Qué te gustaría ajustar?</label><textarea autoFocus value={comment} onChange={e => setComment(e.target.value)} placeholder="Escribe tu comentario para el equipo..." /><div><button className="text-button" onClick={() => setMode('view')}>Cancelar</button><button className="primary-button" disabled={!comment.trim()} onClick={() => onChanges(item.id, comment)}>Enviar cambios <Send size={15} /></button></div></div> : <div className="modal-actions"><button className="secondary-button" onClick={() => setMode('changes')}><PencilLine size={16} /> Solicitar cambios</button><button className="primary-button" onClick={() => onApprove(item.id)}><Check size={17} /> Aprobar pieza</button></div>}
    </div>
  </div></div>
}

function Deliverables({ deliverables, setDeliverables }) {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const visible = filter === 'all' ? deliverables : deliverables.filter(x => x.status === filter)
  const approve = id => { setDeliverables(items => items.map(x => x.id === id ? { ...x, status: 'approved' } : x)); setSelected(null) }
  const changes = (id) => { setDeliverables(items => items.map(x => x.id === id ? { ...x, status: 'changes' } : x)); setSelected(null) }
  return <div className="page-content">
    <SectionHeading eyebrow="CONTENIDO DE JUNIO" title="Entregables" copy="Revisa cada pieza, deja tus comentarios y aprueba sin salir del portal." actions={<button className="primary-button"><Plus size={17} /> Solicitar pieza</button>} />
    <div className="filter-row">{[['all','Todos'],['review','Por revisar'],['approved','Aprobados'],['published','Publicados']].map(([id,label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}<span>{id === 'all' ? deliverables.length : deliverables.filter(x => x.status === id).length}</span></button>)}</div>
    <div className="deliverable-grid">{visible.map(item => <article className="deliverable-card" key={item.id} onClick={() => setSelected(item)}>
      <div className={`deliverable-art ${item.color}`}><span className="art-tag">{item.tag}</span><strong>{item.caption}</strong><div className="art-shapes"><i /><i /><i /></div><span className="art-brand">alma</span><div className="card-hover"><ArrowRight size={21} /></div></div>
      <div className="deliverable-info"><div><StatusPill status={item.status} /><button onClick={e => e.stopPropagation()}><MoreHorizontal size={18} /></button></div><h3>{item.title}</h3><p><item.icon size={14} /> {item.type}<span />{item.date}</p></div>
    </article>)}</div>
    {visible.length === 0 && <div className="empty-state"><CheckCircle2 size={36} /><h3>Todo al día</h3><p>No hay entregables en este estado.</p></div>}
    {selected && <DeliverableModal item={deliverables.find(x => x.id === selected.id)} onClose={() => setSelected(null)} onApprove={approve} onChanges={changes} />}
  </div>
}

function CalendarPage() {
  const [view, setView] = useState('month')
  const days = useMemo(() => Array.from({ length: 35 }, (_, i) => i < 1 || i > 30 ? null : i), [])
  return <div className="page-content calendar-page">
    <SectionHeading eyebrow="PLAN DE CONTENIDO" title="Calendario de junio" copy="Qué publicamos, cuándo sale y qué necesitamos de tu parte." actions={<div className="calendar-controls"><button><ArrowLeft size={17} /></button><button>Hoy</button><button><ArrowRight size={17} /></button></div>} />
    <div className="calendar-toolbar"><div className="legend"><span><i className="published" />Publicado</span><span><i className="approved" />Aprobado</span><span><i className="review" />Por revisar</span><span><i className="scheduled" />Programado</span></div><div className="view-toggle"><button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>Mes</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Lista</button></div></div>
    {view === 'month' ? <div className="calendar-shell"><div className="weekdays">{['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(x => <span key={x}>{x}</span>)}</div><div className="calendar-grid">{days.map((day,i) => <div className={`calendar-day ${!day ? 'muted' : ''}`} key={i}>{day && <><span className={day === 6 ? 'today' : ''}>{day}</span>{calendarEvents[day]?.map((event, j) => <div className={`calendar-event ${event.status}`} key={j}><strong>{event.title}</strong><small>{event.type}</small>{event.need && <em><Zap size={10} /> {event.need}</em>}</div>)}</>}</div>)}</div></div> : <div className="calendar-list">{Object.entries(calendarEvents).map(([day, events]) => events.map(event => <article key={`${day}-${event.title}`}><div className="list-date"><strong>{day}</strong><span>JUN</span></div><div><StatusPill status={event.status} /><h3>{event.title}</h3><p>{event.type}{event.need && ` · ${event.need}`}</p></div><button className="round-arrow"><ArrowRight size={16} /></button></article>))}</div>}
  </div>
}

function Report({ approved, onApprove }) {
  return <div className="page-content report-page">
    <SectionHeading eyebrow="RESULTADOS · MAYO 2026" title="Reporte mensual" copy="El impacto del trabajo, explicado con claridad." actions={<button className="secondary-button"><Download size={17} /> Descargar PDF</button>} />
    <section className="report-hero"><div><span className="eyebrow light-text">LA HISTORIA DEL MES</span><h2>Más alcance.<br />Más conversación.<br /><i>Más Alma.</i></h2><p>El contenido educativo acercó la marca a una comunidad que no solo mira: guarda, comparte y participa.</p></div><div className="big-number"><span>ALCANCE TOTAL</span><strong>48,624</strong><p><TrendingUp size={16} /> +28% frente a abril</p><svg viewBox="0 0 300 90"><path d="M0 76 C30 72 38 58 70 63 S115 78 143 43 S182 52 211 29 S257 34 300 5" fill="none" stroke="currentColor" strokeWidth="3" /></svg></div></section>
    <section className="report-metrics"><article><span>IMPRESIONES</span><strong>72.4K</strong><p>+18.2% <small>vs. abril</small></p></article><article><span>INTERACCIONES</span><strong>3,842</strong><p>+34.5% <small>vs. abril</small></p></article><article><span>ENGAGEMENT</span><strong>7.9%</strong><p>+1.8 pts <small>vs. abril</small></p></article><article><span>NUEVOS SEGUIDORES</span><strong>+184</strong><p>+22.6% <small>vs. abril</small></p></article></section>
    <section className="report-columns"><div className="panel top-content"><div className="panel-title"><div><span className="eyebrow">LO QUE FUNCIONÓ</span><h3>Contenido con mayor impacto</h3></div></div><div className="winner"><div className="winner-art"><span>3 pasos</span><strong>para una piel<br />más luminosa</strong><i>alma</i></div><div><span className="winner-badge">#1 DEL MES</span><h4>Carrusel educativo</h4><p>“3 pasos para una piel más luminosa”</p><div className="winner-stats"><span><strong>12.8K</strong> alcance</span><span><strong>684</strong> guardados</span><span><strong>9.2%</strong> engagement</span></div></div></div></div><div className="panel learnings"><span className="eyebrow">APRENDIZAJES</span><h3>Qué nos dicen los datos</h3><ul><li><div><Sparkles size={17} /></div><p><strong>Educar genera confianza.</strong> Los carruseles educativos obtuvieron 2.4× más guardados.</p></li><li><div><UserRound size={17} /></div><p><strong>Queremos verte más.</strong> El contenido con presencia humana aumentó 41% la interacción.</p></li><li><div><MessageCircle size={17} /></div><p><strong>La comunidad pregunta.</strong> Recibimos 32 consultas sobre rutinas personalizadas.</p></li></ul></div></section>
    <section className="next-month"><div><span className="eyebrow">PRÓXIMO MES</span><h2>De la atención a la <i>conversión.</i></h2><p>En junio vamos a profundizar la autoridad de Alma e introducir llamadas a la acción más claras.</p></div><div className="strategy-steps"><span><b>01</b>Más videos con María</span><span><b>02</b>Serie educativa semanal</span><span><b>03</b>Activar consultas por DM</span></div></section>
    <section className={`approval-banner ${approved ? 'done' : ''}`}><div className="approval-check">{approved ? <Check size={23} /> : <FileBarChart size={23} />}</div><div><h3>{approved ? 'Reporte aprobado' : '¿Todo claro con el reporte?'}</h3><p>{approved ? 'Gracias. Tu aprobación quedó registrada para el equipo BIEM.' : 'Tu aprobación nos permite avanzar con el enfoque de junio.'}</p></div><button className="primary-button" onClick={onApprove}>{approved ? <><CheckCircle2 size={17} /> Aprobado</> : <>Aprobar reporte <ArrowRight size={17} /></>}</button></section>
  </div>
}

function Messages() {
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([
    { from: 'biem', text: '¡Hola, María! Te compartimos las primeras piezas de junio. Hay 3 listas para tu revisión ✨', time: '9:42 AM' },
    { from: 'client', text: '¡Perfecto! Las revisaré esta mañana. Me encanta cómo viene tomando forma la campaña.', time: '10:08 AM' },
    { from: 'biem', text: 'Nos alegra mucho. Para el reel del día 8 solo nos faltaría tu video; te dejamos la guía aquí.', time: '10:12 AM', file: 'Guía_video_reel.pdf · 1.2 MB' },
  ])
  const send = () => { if (!text.trim()) return; setMessages([...messages, { from: 'client', text: text.trim(), time: 'Ahora' }]); setText('') }
  return <div className="page-content messages-page">
    <SectionHeading eyebrow="CANAL DIRECTO" title="Mensajes" copy="Todas las conversaciones del proyecto, ordenadas y en contexto." />
    <div className="message-layout"><aside className="conversation-list"><div className="conversation-search">Conversaciones <button><Plus size={16} /></button></div><button className="conversation active"><div className="conversation-avatar">BI</div><div><strong>Equipo BIEM</strong><p>Nos alegra mucho. Para el reel...</p></div><span>10:12</span><i>2</i></button><button className="conversation"><div className="conversation-avatar strategy"><Target size={18} /></div><div><strong>Estrategia junio</strong><p>Camila: Actualicé el enfoque...</p></div><span>Ayer</span></button></aside>
      <section className="chat"><header><div className="conversation-avatar">BI</div><div><strong>Equipo BIEM</strong><span><i /> 3 miembros · En línea</span></div><button className="icon-button"><MoreHorizontal size={19} /></button></header><div className="chat-body"><div className="date-divider"><span>HOY, 6 DE JUNIO</span></div>{messages.map((message, index) => <div key={index} className={`message ${message.from}`}><div className="message-avatar">{message.from === 'biem' ? 'BI' : 'MS'}</div><div><small>{message.from === 'biem' ? 'Equipo BIEM' : 'Tú'} · {message.time}</small><p>{message.text}</p>{message.file && <button className="file-attachment"><FileText size={21} /><span><strong>Guía para grabar tu reel</strong><small>{message.file}</small></span><Download size={16} /></button>}</div></div>)}</div><div className="message-compose"><button><Paperclip size={20} /></button><textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder="Escribe un mensaje al equipo..." rows="1" /><button className="send-button" onClick={send} disabled={!text.trim()}><Send size={18} /></button></div></section>
    </div>
  </div>
}

export default function App() {
  const [active, setActive] = useState('summary')
  const [menuOpen, setMenuOpen] = useState(false)
  const [deliverables, setDeliverables] = useState(initialDeliverables)
  const [reportApproved, setReportApproved] = useState(false)
  const content = {
    summary: <Summary deliverables={deliverables} onNavigate={setActive} approveReport={() => setReportApproved(true)} reportApproved={reportApproved} />,
    deliverables: <Deliverables deliverables={deliverables} setDeliverables={setDeliverables} />,
    calendar: <CalendarPage />,
    report: <Report approved={reportApproved} onApprove={() => setReportApproved(true)} />,
    messages: <Messages />,
  }
  return <div className="app-shell"><Sidebar active={active} setActive={setActive} open={menuOpen} setOpen={setMenuOpen} />{menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}<main><Topbar active={active} setMenuOpen={setMenuOpen} />{content[active]}</main></div>
}
