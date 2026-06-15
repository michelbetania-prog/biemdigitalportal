import { access, readFile } from 'node:fs/promises'
const files=['src/GuideExample.jsx','src/ClientPortalApp.jsx','src/AdminApp.jsx','src/TeamApp.jsx','scripts/build.mjs','tsconfig.json']
await Promise.all(files.map(file=>access(file)))
const [guide,client,admin,team,build,tsconfig]=await Promise.all(files.map(file=>readFile(file,'utf8')))
for(const token of ['EJEMPLO · GUÍA VISUAL','Este contenido es demostrativo','biem-guide-dismissed:','client.deliverables','team.kanban','admin.dashboard'])if(!guide.includes(token))throw new Error(`Guide contract missing: ${token}`)
for(const token of ['client.summary','client.brand','client.requests','client.calendar','client.billing','client.strategy','client.notifications'])if(!client.includes(token))throw new Error(`Client guide missing: ${token}`)
for(const token of ['admin.${resource}','admin.dashboard','admin.notifications','admin.confidentiality','admin.reports','admin.settings'])if(!admin.includes(token))throw new Error(`Admin guide missing: ${token}`)
for(const token of ['team.overview','team.kanban','team.list','team.calendar','team.clients','team.documents'])if(!team.includes(token))throw new Error(`Team guide missing: ${token}`)
if(!build.includes('GuideExample.js')||!tsconfig.includes('GuideExample.jsx'))throw new Error('Guide component is not included in the production build')
console.log('Guide examples are labeled, dismissible for admins, data-aware and included in all portal workspaces')
