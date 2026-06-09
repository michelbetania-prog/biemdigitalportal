import { readFile } from 'node:fs/promises'

const migration = await readFile('supabase/migrations/202606090004_fix_profile_relationships.sql', 'utf8')
const baseRoles = await readFile('supabase/migrations/202606090003_team_roles_permissions.sql', 'utf8')
const api = await readFile('src/lib/admin-api.js', 'utf8')
const admin = await readFile('src/AdminApp.jsx', 'utf8')

for (const column of ['client_id','user_id','assigned_by']) {
  if (!migration.includes(`add column if not exists ${column} uuid`)) throw new Error(`Migration must verify/add ${column}`)
}
for (const [constraint, target] of [
  ['client_team_assignments_client_id_fkey','public.clients(id)'],
  ['client_team_assignments_user_id_fkey','public.profiles(id)'],
  ['client_team_assignments_assigned_by_fkey','public.profiles(id)'],
]) {
  if (!migration.includes(`constraint ${constraint}`) || !migration.includes(`references ${target}`)) throw new Error(`Missing stable relationship ${constraint}`)
}
if (!migration.includes("notify pgrst, 'reload schema'")) throw new Error('PostgREST schema cache reload is missing')
if (!baseRoles.includes('user_id uuid not null references public.profiles(id)')) throw new Error('Fresh installs must reference profiles from assignments')
for (const relationship of [
  'client:clients!client_team_assignments_client_id_fkey',
  'team_member:profiles!client_team_assignments_user_id_fkey',
  'assigned_by_profile:profiles!client_team_assignments_assigned_by_fkey',
]) {
  if (!api.includes(relationship)) throw new Error(`Explicit PostgREST relationship missing: ${relationship}`)
}
if (api.includes("client_team_assignments: '*, clients") || api.includes('client_team_assignments: `\n  *,\n  profiles')) throw new Error('Ambiguous assignment embed remains')
if (!admin.includes('item.team_member?.full_name') || !admin.includes('item.client?.brand_name')) throw new Error('Admin assignment UI must read aliased relationships')

console.log('Profile foreign keys, named PostgREST relationships and schema cache reload validated')
