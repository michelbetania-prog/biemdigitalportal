/**
 * API-ready mock records for the BIEM admin workspace.
 * Each collection can later be replaced by a repository without changing UI contracts.
 */
export const adminClients = [
  { id:'alma', name:'María Santos', brand:'Alma Studio', initials:'AL', package:'Growth', status:'active', renewal:'15 Jul 2026', owner:'Camila Ríos', deliverables:'8 / 12', payment:'pending', email:'maria@almastudio.co', usage:67, risk:false },
  { id:'nativa', name:'Sofía Herrera', brand:'Nativa Wellness', initials:'NW', package:'Premium Boost', status:'active', renewal:'28 Jun 2026', owner:'Andrea León', deliverables:'14 / 18', payment:'paid', email:'sofia@nativa.co', usage:78, risk:false },
  { id:'norte', name:'Daniel Robles', brand:'Norte Arquitectura', initials:'NA', package:'Starter', status:'paused', renewal:'03 Jul 2026', owner:'Camila Ríos', deliverables:'4 / 8', payment:'overdue', email:'daniel@norte.arq', usage:50, risk:true },
  { id:'luma', name:'Lucía Méndez', brand:'Luma Skin', initials:'LS', package:'Growth', status:'active', renewal:'22 Jul 2026', owner:'Valentina Cruz', deliverables:'10 / 12', payment:'paid', email:'lucia@lumaskin.co', usage:83, risk:false },
  { id:'mesa', name:'Andrés Pinto', brand:'Mesa Once', initials:'MO', package:'Personalizado', status:'expired', renewal:'10 Jun 2026', owner:'Andrea León', deliverables:'6 / 10', payment:'overdue', email:'andres@mesaonce.co', usage:60, risk:true },
]

export const adminPackages = [
  { id:'starter', name:'Starter', price:490, description:'Presencia consistente para marcas que están comenzando.', active:true, clients:1, graphics:4, reels:2, stories:8, carousels:2, meetings:1, report:true, support:'Email', services:['Estrategia base','Gestión de Instagram','Calendario mensual'], notes:'Ideal para operación ligera.' },
  { id:'growth', name:'Growth', price:850, description:'Estrategia y contenido para crecer con claridad.', active:true, clients:2, graphics:4, reels:4, stories:12, carousels:4, meetings:1, report:true, support:'Directo', services:['Estrategia mensual','Gestión integral','Optimización continua'], notes:'Paquete principal de la agencia.' },
  { id:'premium', name:'Premium Boost', price:1350, description:'Acompañamiento intensivo con pauta y producción.', active:true, clients:1, graphics:6, reels:6, stories:20, carousels:6, meetings:2, report:true, support:'Prioritario', services:['Estrategia avanzada','Meta Ads','Producción mensual'], notes:'Requiere capacidad de producción.' },
  { id:'custom', name:'Personalizado', price:0, description:'Alcance diseñado según las prioridades del cliente.', active:false, clients:1, graphics:0, reels:0, stories:0, carousels:0, meetings:2, report:true, support:'Personalizado', services:['Alcance flexible','Equipo dedicado','SLA acordado'], notes:'Precio definido por propuesta.' },
]

export const adminDeliverables = [
  { id:'d01', name:'Reel · Rutina de mañana', client:'Alma Studio', owner:'Diego Luna', type:'Reel', due:'08 Jun', status:'client_review', priority:'high', updated:'Hace 12 min' },
  { id:'d02', name:'Carrusel · 5 mitos', client:'Alma Studio', owner:'Paula Díaz', type:'Carrusel', due:'10 Jun', status:'internal_review', priority:'medium', updated:'Hace 35 min' },
  { id:'d03', name:'Historias · BTS', client:'Alma Studio', owner:'Valentina Cruz', type:'Historias', due:'12 Jun', status:'changes', priority:'high', updated:'Hace 1 h' },
  { id:'d04', name:'Manifiesto de marca', client:'Alma Studio', owner:'Paula Díaz', type:'Post', due:'02 Jun', status:'published', priority:'low', updated:'Ayer' },
  { id:'d05', name:'Ritual de noche', client:'Luma Skin', owner:'Diego Luna', type:'Reel', due:'09 Jun', status:'in_progress', priority:'medium', updated:'Hace 2 h' },
  { id:'d06', name:'Guía de ingredientes', client:'Luma Skin', owner:'Paula Díaz', type:'Carrusel', due:'13 Jun', status:'approved', priority:'medium', updated:'Ayer' },
  { id:'d07', name:'Tour de proyecto', client:'Norte Arquitectura', owner:'Diego Luna', type:'Reel', due:'11 Jun', status:'pending', priority:'high', updated:'Hoy' },
  { id:'d08', name:'Proyecto Casa Río', client:'Norte Arquitectura', owner:'Paula Díaz', type:'Post', due:'16 Jun', status:'in_progress', priority:'low', updated:'Ayer' },
  { id:'d09', name:'Meditación guiada', client:'Nativa Wellness', owner:'Diego Luna', type:'Reel', due:'07 Jun', status:'approved', priority:'high', updated:'Hace 3 h' },
  { id:'d10', name:'Hábitos de descanso', client:'Nativa Wellness', owner:'Valentina Cruz', type:'Historias', due:'14 Jun', status:'client_review', priority:'medium', updated:'Hoy' },
  { id:'d11', name:'Menú de temporada', client:'Mesa Once', owner:'Paula Díaz', type:'Carrusel', due:'06 Jun', status:'cancelled', priority:'low', updated:'02 Jun' },
  { id:'d12', name:'Chef en acción', client:'Mesa Once', owner:'Diego Luna', type:'Reel', due:'18 Jun', status:'pending', priority:'medium', updated:'30 May' },
]

export const adminRequests = [
  { id:'r01', client:'Alma Studio', type:'Reel adicional', description:'Video para el lanzamiento del nuevo sérum.', requested:'Hoy, 9:18', deadline:'18 Jun', files:2, priority:'high', status:'new', owner:'Sin asignar' },
  { id:'r02', client:'Nativa Wellness', type:'Campaña Meta Ads', description:'Promover el retiro de bienestar de agosto.', requested:'Hoy, 8:42', deadline:'25 Jun', files:1, priority:'high', status:'review', owner:'Camila Ríos' },
  { id:'r03', client:'Luma Skin', type:'Carrusel adicional', description:'Comparativa de activos para piel sensible.', requested:'Ayer', deadline:'20 Jun', files:0, priority:'medium', status:'approved', owner:'Paula Díaz' },
  { id:'r04', client:'Norte Arquitectura', type:'Cobertura de evento', description:'Apertura de showroom y networking.', requested:'Ayer', deadline:'29 Jun', files:3, priority:'medium', status:'review', owner:'Andrea León' },
  { id:'r05', client:'Alma Studio', type:'Historias extra', description:'Secuencia de preguntas frecuentes.', requested:'03 Jun', deadline:'12 Jun', files:0, priority:'low', status:'converted', owner:'Valentina Cruz' },
  { id:'r06', client:'Mesa Once', type:'Sesión estratégica', description:'Revisar propuesta de renovación de marca.', requested:'02 Jun', deadline:'15 Jun', files:1, priority:'high', status:'rejected', owner:'Camila Ríos' },
  { id:'r07', client:'Nativa Wellness', type:'Pieza adicional', description:'Anuncio de alianza con nueva instructora.', requested:'01 Jun', deadline:'08 Jun', files:2, priority:'medium', status:'completed', owner:'Paula Díaz' },
  { id:'r08', client:'Luma Skin', type:'Automatización', description:'Respuesta automática para consultas de rutina.', requested:'30 May', deadline:'30 Jun', files:0, priority:'low', status:'new', owner:'Sin asignar' },
]

export const adminInvoices = [
  { id:'INV-0715', client:'Alma Studio', package:'Growth', amount:850, due:'15 Jul 2026', status:'pending', method:'Transferencia', history:6 },
  { id:'INV-0628', client:'Nativa Wellness', package:'Premium Boost', amount:1350, due:'28 Jun 2026', status:'paid', method:'Tarjeta', history:11 },
  { id:'INV-0603', client:'Norte Arquitectura', package:'Starter', amount:490, due:'03 Jun 2026', status:'overdue', method:'Transferencia', history:3 },
  { id:'INV-0722', client:'Luma Skin', package:'Growth', amount:850, due:'22 Jul 2026', status:'paid', method:'Débito automático', history:8 },
  { id:'INV-0610', client:'Mesa Once', package:'Personalizado', amount:1100, due:'10 Jun 2026', status:'overdue', method:'Transferencia', history:5 },
  { id:'INV-0728', client:'Nativa Wellness', package:'Meta Ads extra', amount:180, due:'28 Jul 2026', status:'pending', method:'Tarjeta', history:1 },
]

export const adminServices = [
  { id:'s01', name:'Auditoría de marca digital', category:'Estrategia y crecimiento', description:'Diagnóstico de presencia y oportunidades.', price:280, active:true, eta:'5 días hábiles' },
  { id:'s02', name:'Día de producción', category:'Contenido y diseño', description:'Captura de foto y video para un mes.', price:580, active:true, eta:'10 días hábiles' },
  { id:'s03', name:'Gestión de Meta Ads', category:'Publicidad y ventas', description:'Estrategia y optimización mensual.', price:390, active:true, eta:'7 días hábiles' },
  { id:'s04', name:'Configuración de CRM', category:'Organización y automatización', description:'Pipeline y seguimiento de oportunidades.', price:480, active:true, eta:'12 días hábiles' },
  { id:'s05', name:'Embudo de conversión', category:'Publicidad y ventas', description:'Ruta digital para convertir interés.', price:890, active:false, eta:'15 días hábiles' },
]

export const adminReports = [
  { id:'rep01', client:'Alma Studio', month:'Mayo 2026', summary:'Crecimiento sostenido gracias al contenido educativo.', worked:'12 contenidos y optimización editorial.', workedWell:'Carruseles guardables y presencia humana.', failed:'Stories promocionales con baja retención.', metrics:'48.6K alcance · 7.9% engagement', recommendations:'Profundizar video y llamadas a consulta.', next:'Serie educativa semanal.', status:'approved' },
  { id:'rep02', client:'Nativa Wellness', month:'Mayo 2026', summary:'La comunidad respondió al contenido práctico.', worked:'Campaña de respiración y hábitos.', workedWell:'Reels cortos con ejercicios.', failed:'Publicaciones de venta directa.', metrics:'72.1K alcance · 8.4% engagement', recommendations:'Construir lista de espera.', next:'Campaña del retiro.', status:'sent' },
  { id:'rep03', client:'Luma Skin', month:'Mayo 2026', summary:'Mayor autoridad en conversación de skincare.', worked:'Contenido técnico y testimonios.', workedWell:'Comparativas de ingredientes.', failed:'Contenido sin rostro.', metrics:'36.8K alcance · 6.8% engagement', recommendations:'Integrar a la fundadora.', next:'Serie sobre piel sensible.', status:'draft' },
]

export const adminTeam = [
  { id:'u01', name:'Camila Ríos', initials:'CR', email:'camila@biemdigital.com', role:'Admin', clients:5, deliverables:3, active:true },
  { id:'u02', name:'Andrea León', initials:'AL', email:'andrea@biemdigital.com', role:'Estratega', clients:2, deliverables:4, active:true },
  { id:'u03', name:'Paula Díaz', initials:'PD', email:'paula@biemdigital.com', role:'Diseñador', clients:3, deliverables:7, active:true },
  { id:'u04', name:'Diego Luna', initials:'DL', email:'diego@biemdigital.com', role:'Editor de video', clients:4, deliverables:6, active:false },
]

export const adminActivity = [
  { id:1, type:'request', client:'Alma Studio', text:'creó una solicitud de Reel adicional', time:'Hace 12 min' },
  { id:2, type:'approved', client:'Nativa Wellness', text:'aprobó “Meditación guiada”', time:'Hace 28 min' },
  { id:3, type:'changes', client:'Alma Studio', text:'solicitó cambios en Historias BTS', time:'Hace 1 h' },
  { id:4, type:'paid', client:'Luma Skin', text:'factura INV-0722 marcada como pagada', time:'Hace 2 h' },
  { id:5, type:'deliverable', client:'Norte Arquitectura', text:'nuevo entregable “Tour de proyecto”', time:'Hace 3 h' },
  { id:6, type:'report', client:'Nativa Wellness', text:'reporte mensual actualizado', time:'Ayer' },
]

export const rolePermissions = {
  Admin:['dashboard','clients','packages','deliverables','calendar','billing','requests','services','reports','team','settings'],
  Estratega:['dashboard','clients','deliverables','calendar','requests','reports'],
  Diseñador:['dashboard','deliverables','calendar'],
  'Community manager':['dashboard','deliverables','calendar','requests'],
  'Editor de video':['dashboard','deliverables','calendar'],
  Finanzas:['dashboard','billing'],
}
