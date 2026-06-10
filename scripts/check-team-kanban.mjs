import { access, readFile } from 'node:fs/promises'
const migration='supabase/migrations/202606100002_team_kanban_workspace.sql'
await access(migration)
const [sql,app,api,auth,admin]=await Promise.all([readFile(migration,'utf8'),readFile('src/TeamApp.jsx','utf8'),readFile('src/lib/team-api.js','utf8'),readFile('src/lib/auth.js','utf8'),readFile('src/AdminApp.jsx','utf8')])
for(const token of ['task_comments','task_attachments','todo','in_progress','in_review','completed','urgent','team_brand_context','team_client_members','internal_tasks_select'])if(!sql.includes(token))throw new Error(`Kanban migration missing: ${token}`)
for(const token of ['KanbanBoard','TaskDetail','TaskFilters','TaskList','TaskCalendar','BrandsLibrary','BrandWorkspace','No tienes tareas asignadas por ahora.','No tienes clientes asignados todavía.'])if(!app.includes(token))throw new Error(`Team workspace missing: ${token}`)
for(const token of ['addTaskComment','addTaskAttachment','createTeamTask','task_comments','task_attachments'])if(!api.includes(token))throw new Error(`Team API missing: ${token}`)
if(!auth.includes("'/team/dashboard'"))throw new Error('Team roles must redirect to /team/dashboard')
for(const token of ["['todo','in_progress','in_review','completed']","'urgent'"])if(!admin.includes(token))throw new Error(`Admin task form is not Kanban-compatible: ${token}`)
if(/invoices|billing|payment/i.test(app))throw new Error('Team workspace must not expose financial sections')
console.log('Team Kanban, task detail, assigned brands and RLS contracts validated')
