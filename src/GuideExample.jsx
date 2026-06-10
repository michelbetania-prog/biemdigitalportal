import { createElement, Fragment, useState } from './mini-react.js'
import { Sparkles, X } from './icons.jsx'

const examples={
  'client.summary':{title:'Así se verá tu próximo paso',description:'No hay pendientes visibles por ahora. Ejemplo: Revisar y aprobar el carrusel de lanzamiento antes del viernes.',meta:['Responsable: Cliente','Estado: Pendiente','Vence: 14 jun']},
  'client.brand':{title:'Ejemplo de perfil de marca',description:'Biem Natural ofrece productos de bienestar para mujeres que buscan hábitos simples y sostenibles.',meta:['Industria: Bienestar','Tono: Cercano y educativo','Propuesta: Bienestar sin complicaciones']},
  'client.deliverables':{title:'Ejemplo de entregable',description:'Carrusel educativo — 5 hábitos para comenzar la semana con más energía.',meta:['Tipo: Carrusel','Estado: Por revisar','Entrega: 14 jun']},
  'client.requests':{title:'Ejemplo de solicitud',description:'Actualizar el enlace de WhatsApp en las piezas de la campaña de junio.',meta:['Prioridad: Media','Estado: Nueva','Respuesta visible en el portal']},
  'client.calendar':{title:'Ejemplo de reunión',description:'Revisión mensual de resultados y definición del enfoque de contenido.',meta:['Martes, 18 jun · 10:00 a. m.','Google Meet','Duración: 45 minutos']},
  'client.billing':{title:'Ejemplo de factura',description:'Factura BIEM-2026-006 correspondiente al servicio mensual contratado.',meta:['Monto: $850.00','Estado: Pendiente','Vence: 25 jun']},
  'client.strategy':{title:'Ejemplo de recomendación estratégica',description:'Priorizar contenido educativo en formato carrusel para aumentar guardados y reforzar autoridad.',meta:['Área: Contenido','Impacto esperado: Alto','Visible para cliente']},
  'client.notifications':{title:'Ejemplo de notificación',description:'Recibirás un correo cuando un entregable esté listo para revisión.',meta:['Canal: Correo','Evento: Entregable listo','Puedes cambiar esta preferencia']},
  'team.overview':{title:'Ejemplo de próximo pendiente',description:'Preparar propuesta visual para el carrusel educativo de Biem Natural.',meta:['Prioridad: Alta','Vence: 14 jun','Responsable: Diseñador']},
  'team.kanban':{title:'Ejemplo de tarjeta Kanban',description:'Diseñar carrusel “5 hábitos para comenzar la semana”.',meta:['Cliente: Biem Natural','Estado: Tareas por hacer','Prioridad: Alta']},
  'team.list':{title:'Ejemplo de tarea en lista',description:'Editar reel testimonial y subir versión final a Google Drive.',meta:['Responsable: Editor de video','Estado: En curso','Vence: 16 jun']},
  'team.calendar':{title:'Ejemplo de fecha de entrega',description:'Publicación del carrusel educativo aprobado.',meta:['18 jun','Tipo: Publicación','Cliente: Biem Natural']},
  'team.clients':{title:'Ejemplo de marca asignada',description:'Biem Natural · Bienestar y productos naturales.',meta:['4 tareas abiertas','Próxima entrega: 14 jun','Tono: Cercano y educativo']},
  'team.documents':{title:'Ejemplo de material de trabajo',description:'Manual de marca y carpeta principal de recursos en Google Drive.',meta:['Tipo: Material de marca','Acceso: Equipo asignado','Proveedor: Google Drive']},
  'admin.dashboard':{title:'Ejemplo de actividad reciente',description:'Biem Natural aprobó el carrusel educativo y dejó un comentario.',meta:['Módulo: Entregables','Hace 20 minutos','Acción registrada en Supabase']},
  'admin.reports':{title:'Ejemplo de reporte mensual',description:'Reporte de junio con resumen ejecutivo, métricas, aprendizajes y próximos pasos.',meta:['Cliente: Biem Natural','Estado: Borrador','Periodo: Junio 2026']},
  'admin.settings':{title:'Ejemplo de configuración',description:'Nombre de agencia, logo, colores, contacto, datos de pago y mensaje de bienvenida.',meta:['Identidad visual','Información de contacto','Marca del portal']},
  'admin.confidentiality':{title:'Ejemplo de compromiso',description:'Compromiso de Confidencialidad del Portal Privado de Biem Digital.',meta:['Versión: 1.0','Estado: Activo','Aceptación obligatoria']},
  'admin.notifications':{title:'Ejemplo de notificación enviada',description:'“Tienes un entregable listo para revisar” enviado a cliente@ejemplo.com.',meta:['Tipo: Entregable listo','Estado: Enviado','Proveedor: Resend']},
}

const adminExamples={
  clients:['Ejemplo de cliente','Biem Natural · Paquete Growth',['Estado: Activo','Renovación: 30 jun','Responsable: Ana']],
  packages:['Ejemplo de paquete','Growth — estrategia, contenido y seguimiento mensual.',['12 piezas','4 reels','Reporte mensual incluido']],
  invoices:['Ejemplo de factura','BIEM-2026-006 · Biem Natural',['Monto: $850.00','Estado: Pendiente','Vence: 25 jun']],
  deliverables:['Ejemplo de entregable','Carrusel educativo — 5 hábitos saludables.',['Cliente: Biem Natural','Estado: Por revisar','Prioridad: Alta']],
  deliverable_drive_assets:['Ejemplo de archivo Drive','Carrusel junio — versión para revisión.',['Tipo: Diseño','Visible para cliente','Enlace de Google Drive']],
  requests:['Ejemplo de solicitud','Actualizar el enlace de WhatsApp en la campaña.',['Cliente: Biem Natural','Estado: Nueva','Prioridad: Media']],
  extra_services:['Ejemplo de servicio adicional','Cobertura de evento con contenido en tiempo real.',['Desde $350','Entrega: 3 días','Estado: Activo']],
  profiles:['Ejemplo de colaborador','Andrea Morales · Diseñadora gráfica.',['Estado: Activo','2 clientes asignados','5 tareas abiertas']],
  client_team_assignments:['Ejemplo de asignación','Andrea Morales asignada a Biem Natural.',['Rol: Diseñadora','Asignación activa','Creado por admin']],
  internal_tasks:['Ejemplo de tarea interna','Diseñar carrusel educativo de junio.',['Responsable: Andrea','Estado: En curso','Prioridad: Alta']],
  internal_notes:['Ejemplo de nota interna','La marca prefiere fotografías cálidas y composiciones limpias.',['Visibilidad: Equipo asignado','Cliente: Biem Natural','Solo uso interno']],
  client_brand_profiles:['Ejemplo de perfil de marca','Biem Natural · Bienestar y productos naturales.',['Tono: Cercano','Público: Mujeres 25–45','Logo y colores cargados']],
  calendar_events:['Ejemplo de reunión','Revisión mensual de estrategia y resultados.',['18 jun · 10:00','Google Meet','Visible para cliente']],
  client_resources:['Ejemplo de recomendación','Priorizar carruseles educativos para aumentar guardados.',['Estado: Borrador','Visible para cliente','Área: Contenido']],
}

export function guideFor(key){
  if(examples[key])return examples[key]
  if(key.startsWith('admin.')){
    const value=adminExamples[key.slice(6)]
    if(value)return {title:value[0],description:value[1],meta:value[2]}
  }
  return {title:'Ejemplo guía',description:'Aquí aparecerá la información real cuando el módulo tenga registros.',meta:['Contenido demostrativo','No corresponde a datos reales']}
}

export default function GuideExample({guideKey,canDismiss=false,className=''}){
  const storageKey=`biem-guide-dismissed:${guideKey}`
  const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem(storageKey)==='1'}catch{return false}})
  if(dismissed)return null
  const guide=guideFor(guideKey)
  const dismiss=()=>{try{localStorage.setItem(storageKey,'1')}catch{}setDismissed(true)}
  return <aside className={`guide-example-card ${className}`} aria-label="Ejemplo guía"><div className="guide-example-icon"><Sparkles size={18}/></div><div className="guide-example-content"><div className="guide-example-label">EJEMPLO · GUÍA VISUAL</div><h3>{guide.title}</h3><p>{guide.description}</p><div className="guide-example-meta">{guide.meta.map(item=><span key={item}>{item}</span>)}</div><small>Este contenido es demostrativo y desaparecerá cuando existan datos reales.</small></div>{canDismiss&&<button className="guide-example-dismiss" onClick={dismiss} title="Eliminar ejemplo"><X size={14}/>Eliminar guía</button>}</aside>
}
