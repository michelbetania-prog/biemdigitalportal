import { readFile } from 'node:fs/promises'

const adminSource = await readFile('src/AdminApp.jsx', 'utf8')
const apiSource = await readFile('src/lib/admin-api.js', 'utf8')
const buildSource = await readFile('scripts/build.mjs', 'utf8')

if (adminSource.includes("./data/admin-data.js")) throw new Error('AdminApp must not import mock admin data')
if (buildSource.includes('data/admin-data.js')) throw new Error('Build must not ship admin mock data')

for (const fn of ['loadAdminWorkspace', 'createRecord', 'updateRecord', 'deleteRecord']) {
  if (!adminSource.includes(fn) && !apiSource.includes(fn)) throw new Error(`Missing Supabase CRUD function: ${fn}`)
}

for (const table of ['clients', 'packages', 'invoices', 'deliverables', 'requests', 'extra_services']) {
  if (!apiSource.includes(`${table}:`)) throw new Error(`Missing Supabase select config for ${table}`)
  if (!adminSource.includes(`resource=\"${table}\"`)) throw new Error(`Missing admin CRUD page for ${table}`)
}

if (!adminSource.includes('deleteRecord(resource')) throw new Error('Delete action must call Supabase')
if (!adminSource.includes('updateRecord(resource')) throw new Error('Edit action must call Supabase')
if (!adminSource.includes('createRecord(resource')) throw new Error('Create action must call Supabase')
if (!adminSource.includes('workspace.canWrite=profile.role')) throw new Error('Write access must depend on profiles.role')

console.log('Admin CRUD no longer depends on mock data and uses Supabase mutations')
