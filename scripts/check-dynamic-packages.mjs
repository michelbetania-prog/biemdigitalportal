import { readFile } from 'node:fs/promises'
const [migration,repair,admin,adminApi,client,clientApi,portalApi,packageApi,styles,build]=await Promise.all([
  readFile('supabase/migrations/202606100005_dynamic_packages.sql','utf8'),
  readFile('supabase/migrations/202606110001_repair_packages_schema.sql','utf8'),
  readFile('src/AdminApp.jsx','utf8'),readFile('src/lib/admin-api.js','utf8'),readFile('src/ClientPortalApp.jsx','utf8'),
  readFile('src/lib/client-api.js','utf8'),readFile('src/lib/portal-api.js','utf8'),readFile('src/lib/package-api.js','utf8'),
  readFile('src/styles.css','utf8'),readFile('scripts/build.mjs','utf8'),
])
for(const token of ['add column if not exists subtitle','add column if not exists price','services_included','is_featured','display_order','sync_package_legacy_fields','active_packages','Paquete Esencial','Paquete Crecimiento','Paquete Estratégico','Paquete Dirección Digital','where not exists'])if(!migration.includes(token))throw new Error(`Dynamic packages migration missing: ${token}`)
for(const token of ['add column if not exists display_order integer default 0','add column if not exists updated_at','display_order=coalesce(display_order,0)',"order by coalesce(p.display_order,0) asc",'services_included type jsonb','notify pgrst'])if(!repair.includes(token))throw new Error(`Package repair migration missing: ${token}`)
for(const token of ["['price','Precio'","['services_included','Servicios incluidos","['is_featured','Paquete destacado'","['display_order','Orden de visualización'",'packageColumns','function PackagesPage','Desactivar','Quitar destacado'])if(!admin.includes(token))throw new Error(`Admin package CRUD missing: ${token}`)
if(!adminApi.includes("resource==='packages'")||!adminApi.includes("order('name'"))throw new Error('Admin package listing needs a legacy-schema fallback')
for(const token of ["['packages','Paquetes'",'function Packages','Más recomendado','package-catalog-grid','packageItem','services_included'])if(!client.includes(token))throw new Error(`Client package catalog missing: ${token}`)
if(!clientApi.includes('loadActivePackages()')||!portalApi.includes('loadActivePackages()'))throw new Error('Client and preview workspaces must use the resilient package loader')
for(const token of ["supabase.rpc('active_packages')","order('display_order'","order('created_at'",'display_order:Number(item.display_order??0)','services_included:services'])if(!packageApi.includes(token))throw new Error(`Resilient package API missing: ${token}`)
for(const token of ['.package-catalog-grid','.portal-package-card.featured','.package-services ul','@media(max-width:640px)'])if(!styles.includes(token))throw new Error(`Responsive package styles missing: ${token}`)
if(!build.includes("'lib/package-api.js'"))throw new Error('Build must include the package API')
console.log('Dynamic package schema, repair migration, resilient APIs, admin CRUD and client catalog validated')
