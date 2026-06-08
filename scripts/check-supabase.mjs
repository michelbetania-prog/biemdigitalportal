import { readFile } from 'node:fs/promises'

const base = await readFile('supabase/migrations/202606060001_auth_roles_and_portal.sql', 'utf8')
const adminCrud = await readFile('supabase/migrations/202606080001_admin_crud_policies.sql', 'utf8')
const tables = ['profiles', 'clients', 'packages', 'invoices', 'deliverables', 'requests', 'extra_services']
const crudTables = ['clients', 'packages', 'invoices', 'deliverables', 'requests', 'extra_services']

for (const table of tables) {
  if (!base.includes(`create table public.${table}`)) throw new Error(`Missing table: ${table}`)
  if (!base.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS is not enabled for: ${table}`)
}

for (const role of ['admin', 'client', 'team', 'viewer']) {
  if (!base.includes(`'${role}'`)) throw new Error(`Missing role: ${role}`)
}

if (!base.includes('references auth.users(id) on delete cascade')) throw new Error('profiles must reference auth.users')
if (!base.includes('create trigger on_auth_user_created')) throw new Error('Missing profile creation trigger')

for (const table of crudTables) {
  for (const action of ['insert', 'update', 'delete']) {
    const policy = `create policy ${table}_admin_${action}`
    if (!adminCrud.includes(policy)) throw new Error(`Missing admin ${action} policy for ${table}`)
  }
}

if (!adminCrud.includes('create or replace function public.current_user_role()')) throw new Error('Missing secure current_user_role function')
if (!adminCrud.includes("(select public.current_user_role()) = 'admin'")) throw new Error('Admin policies must read profiles.role')
if (adminCrud.includes('service_role')) throw new Error('Admin CRUD migration must not rely on service_role')

console.log('Supabase schema and admin CRUD RLS policies validated')
