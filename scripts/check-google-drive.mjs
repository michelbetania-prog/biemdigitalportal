import { access, readFile } from 'node:fs/promises'
const migrationPath='supabase/migrations/202606100001_google_drive_assets_mvp.sql'
await access(migrationPath)
const [sql,admin,team,teamApi,client]=await Promise.all([
  readFile(migrationPath,'utf8'),readFile('src/AdminApp.jsx','utf8'),readFile('src/TeamApp.jsx','utf8'),readFile('src/lib/team-api.js','utf8'),readFile('src/ClientPortalApp.jsx','utf8'),
])
for(const token of ['deliverable_drive_assets','drive_url','visible_to_client','drive_item_id','drive_assets_admin_all','drive_assets_team_select','client_deliverables','admin_client_preview',"notify pgrst,'reload schema'"])if(!sql.includes(token))throw new Error(`Google Drive migration contract missing: ${token}`)
if(/oauth|refresh_token|access_token/i.test(sql.replace('OAuth tokens are intentionally out of scope','')))throw new Error('MVP migration must not store Google OAuth tokens')
for(const token of ['Archivos Google Drive','deliverable_drive_assets','El enlace debe pertenecer a Google Drive'])if(!admin.includes(token))throw new Error(`Admin Drive management missing: ${token}`)
for(const token of ['Vincular Google Drive','team-drive-links'])if(!team.includes(token))throw new Error(`Team Drive workflow missing: ${token}`)
for(const token of ['createTeamDriveAsset','deleteTeamDriveAsset','deliverable_drive_assets'])if(!teamApi.includes(token))throw new Error(`Team Drive API missing: ${token}`)
if(!client.includes('ARCHIVOS EN GOOGLE DRIVE')||!client.includes('drive_assets'))throw new Error('Client-visible Drive links are missing')
console.log('Google Drive manual-link MVP, visibility and RLS contracts validated')
