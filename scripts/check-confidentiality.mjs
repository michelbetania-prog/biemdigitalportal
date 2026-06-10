import { readFile } from 'node:fs/promises'

const migration = await readFile('supabase/migrations/202606090002_client_confidentiality_gate.sql', 'utf8')
const auth = await readFile('src/AuthApp.jsx', 'utf8')
const screen = await readFile('src/FirstLoginConfidentialityScreen.jsx', 'utf8')
const api = await readFile('src/lib/confidentiality.js', 'utf8')
const admin = await readFile('src/AdminApp.jsx', 'utf8')

for (const table of ['confidentiality_agreements', 'client_confidentiality_acceptances']) {
  if (!migration.includes(`create table if not exists public.${table}`)) throw new Error(`Missing confidentiality table: ${table}`)
  if (!migration.includes(`alter table public.${table} enable row level security`)) throw new Error(`RLS missing for: ${table}`)
}
for (const route of ['/client/first-access', '/client/onboarding', '/client/update-info']) {
  if (!auth.includes(route)) throw new Error(`Missing guarded client route: ${route}`)
}
if (!auth.includes('FirstLoginConfidentialityScreen')) throw new Error('Client routes must use the confidentiality guard')
if (!screen.includes('disabled={!accepted||saving}')) throw new Error('Acceptance button must require the checkbox')
if (!api.includes("supabase.rpc('accept_active_confidentiality'")) throw new Error('Acceptance must persist through the secure database function')
if (!migration.includes('confidentiality_agreements_one_active_idx')) throw new Error('Only one agreement may be active')
if (!migration.includes('security definer') || !migration.includes('revoke insert, update on public.client_confidentiality_acceptances')) throw new Error('Acceptance writes must only be exposed through the validated RPC')
if (!migration.includes('agreement_version = excluded.agreement_version')) throw new Error('Reacceptance after a version update must refresh the stored version')
if (!admin.includes('ConfidentialityAdminPage')) throw new Error('Admin confidentiality management is missing')
if (/service_role/i.test(migration)) throw new Error('Confidentiality migration must not use service_role')

console.log('Private first-access confidentiality guard, persistence, admin management and RLS validated')
