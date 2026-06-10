import { readFile } from 'node:fs/promises'
const migration=await readFile('supabase/migrations/202606090003_team_roles_permissions.sql','utf8')
const auth=await readFile('src/lib/auth.js','utf8')
const router=await readFile('src/AuthApp.jsx','utf8')
const app=await readFile('src/TeamApp.jsx','utf8')
const api=await readFile('src/lib/team-api.js','utf8')
const clientApi=await readFile('src/lib/client-api.js','utf8')
const inviteFunction=await readFile('supabase/functions/invite-team-member/index.ts','utf8')
const roles=['account_manager','designer','social_media','video_editor']
for(const role of roles){
  if(!migration.includes(`'${role}'`))throw new Error(`Missing database role ${role}`)
  if(!auth.includes(`${role}: '/team/`))throw new Error(`Missing route for ${role}`)
}
for(const table of ['client_team_assignments','internal_tasks','internal_notes','client_resources']){
  if(!migration.includes(`create table if not exists public.${table}`))throw new Error(`Missing table ${table}`)
  if(!migration.includes(`alter table public.${table} enable row level security`))throw new Error(`RLS missing on ${table}`)
}
for(const rpc of ['public.team_client_overview()','public.client_account_overview()','public.client_deliverables()','public.client_invoices()','public.client_requests()','public.client_visible_tasks()','public.client_visible_resources()']){if(!migration.includes(rpc))throw new Error(`Safe data RPC missing: ${rpc}`)}
if(migration.includes("client_id = (select public.current_client_id())\n);"))throw new Error('Clients must not receive full base-table rows with internal columns')
if(!migration.includes("create policy invoices_select")||migration.includes("current_user_role()) = 'account_manager'\n  or client_id"))throw new Error('Financial policy must not expose invoices to staff')
if(!router.includes("if (path.startsWith('/team'))"))throw new Error('Dedicated team route guard missing')
if(!router.includes('return <TeamApp'))throw new Error('Team roles must not render the client app')
if(!api.includes("supabase.rpc('team_brand_directory')"))throw new Error('Team API must use safe assigned-brand RPC')
if(api.includes("from('invoices')")||api.includes("from('packages')"))throw new Error('Team API must not query financial tables')
for(const rpc of ['client_account_overview','client_deliverables','client_invoices','client_requests','client_visible_tasks','client_visible_resources']){if(!clientApi.includes(`rpc('${rpc}')`))throw new Error(`Client API must use safe RPC ${rpc}`)}
if(!inviteFunction.includes("profile?.role !== 'admin'")||!inviteFunction.includes('SUPABASE_SERVICE_ROLE_KEY'))throw new Error('Secure admin-only invitation function missing')
if(!app.includes('Mis tareas')||!app.includes('Mis marcas'))throw new Error('Team workspace views missing')
console.log('Team roles, dedicated routes, assignment-scoped RLS and non-financial workspace validated')
