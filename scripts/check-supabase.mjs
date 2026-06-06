import { readFile } from 'node:fs/promises'

const migration = await readFile('supabase/migrations/202606060001_auth_roles_and_portal.sql', 'utf8')
const tables = ['profiles', 'clients', 'packages', 'invoices', 'deliverables', 'requests', 'extra_services']

for (const table of tables) {
  if (!migration.includes(`create table public.${table}`)) throw new Error(`Missing table: ${table}`)
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS is not enabled for: ${table}`)
}

for (const role of ['admin', 'client', 'team', 'viewer']) {
  if (!migration.includes(`'${role}'`)) throw new Error(`Missing role: ${role}`)
}

if (!migration.includes('references auth.users(id) on delete cascade')) throw new Error('profiles must reference auth.users')
if (!migration.includes('create or replace function public.get_current_user_role()')) throw new Error('Missing current-role function')
if (!migration.includes('create trigger on_auth_user_created')) throw new Error('Missing profile creation trigger')
if ((migration.match(/^create policy/gm) || []).length < 25) throw new Error('Expected comprehensive RLS policies')

console.log('Supabase schema and RLS structure validated')
