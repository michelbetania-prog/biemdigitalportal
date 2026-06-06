/**
 * Mock account data shaped as API-ready entities. Replace this module with
 * repository/API calls while keeping the same contracts consumed by the UI.
 */
export const accountOverview = {
  clientId: 'alma-studio',
  currency: 'USD',
  package: {
    id: 'growth-monthly',
    name: 'Biem Growth',
    status: 'active',
    startDate: '15 de enero, 2026',
    renewalDate: '15 de julio, 2026',
    billingCycle: 'Mensual',
    services: [
      'Estrategia mensual de contenido',
      '12 piezas de contenido',
      'Gestión de Instagram',
      'Reporte y reunión mensual',
      'Soporte directo con el equipo',
    ],
    usage: { used: 8, limit: 12, unit: 'piezas' },
  },
  invoice: {
    id: 'INV-2026-0715',
    dueDate: '15 de julio, 2026',
    amount: 850,
    status: 'pending',
    paymentMethod: 'Transferencia bancaria',
    concept: 'Biem Growth · Julio 2026',
  },
}

export const packageExtras = [
  { id: 'extra-post', name: 'Pieza adicional', description: 'Diseño estático alineado al plan del mes.', price: 45, icon: 'design' },
  { id: 'extra-carousel', name: 'Carrusel adicional', description: 'Hasta 8 slides con copy y diseño editorial.', price: 75, icon: 'carousel' },
  { id: 'extra-reel', name: 'Reel adicional', description: 'Edición, subtítulos, portada y copy de publicación.', price: 95, icon: 'video' },
  { id: 'extra-stories', name: 'Historias extra', description: 'Secuencia de 4 historias listas para publicar.', price: 55, icon: 'stories' },
  { id: 'meta-campaign', name: 'Campaña Meta Ads', description: 'Configuración y optimización de una campaña.', price: 180, icon: 'ads' },
  { id: 'event-coverage', name: 'Cobertura de evento', description: 'Cobertura ágil para capturar y compartir el momento.', price: 320, icon: 'event' },
]

export const agencyServiceCategories = [
  {
    id: 'strategy',
    name: 'Estrategia y crecimiento',
    description: 'Dirección para tomar mejores decisiones de marca.',
    services: [
      { id: 'brand-audit', name: 'Auditoría de marca digital', description: 'Diagnóstico de presencia, contenido y oportunidades.', priceFrom: 280 },
      { id: 'growth-plan', name: 'Plan de crecimiento 90 días', description: 'Ruta priorizada con objetivos, canales y métricas.', priceFrom: 420 },
      { id: 'consulting', name: 'Sesión estratégica', description: '90 minutos de consultoría con plan de acción.', priceFrom: 150 },
    ],
  },
  {
    id: 'content',
    name: 'Contenido y diseño',
    description: 'Recursos visuales para comunicar con consistencia.',
    services: [
      { id: 'brand-kit', name: 'Kit visual para redes', description: 'Sistema de plantillas y lineamientos de uso.', priceFrom: 350 },
      { id: 'production-day', name: 'Día de producción', description: 'Dirección y captura de foto y video para un mes.', priceFrom: 580 },
      { id: 'landing-design', name: 'Diseño de landing page', description: 'Página enfocada en presentar y convertir.', priceFrom: 650 },
    ],
  },
  {
    id: 'sales',
    name: 'Publicidad y ventas',
    description: 'Campañas enfocadas en atraer demanda de calidad.',
    services: [
      { id: 'ads-management', name: 'Gestión de Meta Ads', description: 'Estrategia, monitoreo y optimización mensual.', priceFrom: 390 },
      { id: 'launch-campaign', name: 'Campaña de lanzamiento', description: 'Concepto, piezas y pauta para una nueva oferta.', priceFrom: 750 },
      { id: 'sales-funnel', name: 'Embudo de conversión', description: 'Ruta digital para convertir interés en consultas.', priceFrom: 890 },
    ],
  },
  {
    id: 'operations',
    name: 'Organización y automatización',
    description: 'Sistemas simples para ordenar la operación comercial.',
    services: [
      { id: 'crm-setup', name: 'Configuración de CRM', description: 'Pipeline, campos y seguimiento de oportunidades.', priceFrom: 480 },
      { id: 'automation', name: 'Automatización de consultas', description: 'Flujos de respuesta y clasificación de leads.', priceFrom: 320 },
      { id: 'dashboard', name: 'Dashboard de indicadores', description: 'Panel práctico para visualizar ventas y marketing.', priceFrom: 420 },
    ],
  },
]
