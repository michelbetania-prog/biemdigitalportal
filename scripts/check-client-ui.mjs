import { readFile } from 'node:fs/promises'
const [app,preview,styles]=await Promise.all([readFile('src/ClientPortalApp.jsx','utf8'),readFile('src/AdminClientPreview.jsx','utf8'),readFile('src/styles.css','utf8')])
for(const component of ['ClientPortalLayout','ClientPortalHeader','ClientAlertCard','ClientSummaryCard','ClientEmptyState','ClientBrandPreviewCard','AdminPreviewBar'])if(!app.includes(`function ${component}`)&&!app.includes(`function ${component}`.replace('function ','export function ')))throw new Error(`Missing reusable client component: ${component}`)
for(const phrase of ['Resumen de tu cuenta','Lo que sigue','Entregables para revisión','Solicitudes recientes','Sobre tu marca','No hay pendientes visibles por ahora'])if(!app.includes(phrase))throw new Error(`Missing redesigned client copy: ${phrase}`)
if(!preview.includes('AdminPreviewBar'))throw new Error('Admin preview must reuse the client preview bar')
for(const token of ['max-width','client-summary-grid','client-alert-card','client-welcome-card','@media(max-width:640px)'])if(!styles.includes(token))throw new Error(`Missing responsive client style: ${token}`)
if(/Entregables\{.*\}.*por revisar|Solicitudes\{.*\}.*abiertas/.test(app))throw new Error('Dashboard values must be rendered in separate visual elements')
console.log('Premium client layout, reusable components and responsive states validated')
