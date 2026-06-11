import { readFile } from 'node:fs/promises'
const [migration,admin,client,clientApi,portalApi,styles]=await Promise.all([
  readFile('supabase/migrations/202606100005_dynamic_packages.sql','utf8'),
  readFile('src/AdminApp.jsx','utf8'),readFile('src/ClientPortalApp.jsx','utf8'),
  readFile('src/lib/client-api.js','utf8'),readFile('src/lib/portal-api.js','utf8'),readFile('src/styles.css','utf8'),
])
for(const token of ['add column if not exists subtitle','add column if not exists price','services_included','is_featured','display_order','sync_package_legacy_fields','active_packages','Paquete Esencial','Paquete Crecimiento','Paquete Estratégico','Paquete Dirección Digital','where not exists'])if(!migration.includes(token))throw new Error(`Dynamic packages migration missing: ${token}`)
for(const token of ["['price','Precio'","['services_included','Servicios incluidos","['is_featured','Paquete destacado'","['display_order','Orden de visualización'",'packageColumns','function PackagesPage','Desactivar','Quitar destacado'])if(!admin.includes(token))throw new Error(`Admin package CRUD missing: ${token}`)
for(const token of ["['packages','Paquetes'",'function Packages','Más recomendado','package-catalog-grid','packageItem','services_included'])if(!client.includes(token))throw new Error(`Client package catalog missing: ${token}`)
if(!clientApi.includes("supabase.rpc('active_packages')"))throw new Error('Client workspace must load active packages from Supabase')
if(!portalApi.includes("supabase.rpc('active_packages')"))throw new Error('Admin client preview must load active packages from Supabase')
for(const token of ['.package-catalog-grid','.portal-package-card.featured','.package-services ul','@media(max-width:640px)'])if(!styles.includes(token))throw new Error(`Responsive package styles missing: ${token}`)
console.log('Dynamic package schema, seed data, admin CRUD, client catalog and responsive styles validated')
