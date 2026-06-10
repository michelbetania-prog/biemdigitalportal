import { access, readFile } from 'node:fs/promises'
const migration='supabase/migrations/202606100003_team_brand_workspace.sql'
await access(migration)
const [sql,app,api,styles]=await Promise.all([readFile(migration,'utf8'),readFile('src/TeamApp.jsx','utf8'),readFile('src/lib/team-api.js','utf8'),readFile('src/admin-styles.css','utf8')])
for(const token of ['team_brand_directory','role_on_client','contact_email','contact_phone','calendar_events_team_select','is_assigned_to_client'])if(!sql.includes(token))throw new Error(`Assigned-brand migration missing: ${token}`)
for(const token of ['BrandsLibrary','BrandCard','BrandWorkspace','Mis marcas','Entrar al espacio','Abrir Drive','INFORMACIÓN GENERAL','/team/brands/'])if(!app.includes(token))throw new Error(`Assigned-brand UI missing: ${token}`)
for(const token of ["supabase.rpc('team_brand_directory')","from('calendar_events')",'events:events.data'])if(!api.includes(token))throw new Error(`Assigned-brand API missing: ${token}`)
for(const token of ['brand-library-grid','brand-library-list','brand-workspace-hero','brand-link-library'])if(!styles.includes(token))throw new Error(`Assigned-brand styles missing: ${token}`)
if(/from\('invoices'\)|from\('packages'\)/.test(api))throw new Error('Brand workspace must not load financial data')
console.log('Assigned brand library, brand workspace, meetings, Drive links and scoped access validated')
