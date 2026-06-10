import { access, readFile } from 'node:fs/promises'
const files=['src/ClientPortalApp.jsx','src/AdminClientPreview.jsx','src/lib/portal-api.js','supabase/migrations/202606090005_brand_notifications_calendar.sql','supabase/functions/send-email-notification/index.ts']
await Promise.all(files.map(file=>access(file)))
const [migration,auth,admin,clientApi,email]=await Promise.all([
  readFile(files[3],'utf8'),readFile('src/AuthApp.jsx','utf8'),readFile('src/AdminApp.jsx','utf8'),readFile('src/lib/client-api.js','utf8'),readFile(files[4],'utf8'),
])
for(const token of ['client_brand_profiles','email_notifications','client_notification_preferences','calendar_events','client-brand-assets','admin_client_preview','request_calendar_reschedule','notify pgrst'])if(!migration.includes(token))throw new Error(`Missing portal migration contract: ${token}`)
if(!auth.includes('preview-client'))throw new Error('Admin client preview route is missing')
for(const token of ['brand_profiles','meetings','notifications','Ver como cliente'])if(!admin.includes(token))throw new Error(`Admin expansion missing: ${token}`)
if(!clientApi.includes('send-email-notification'))throw new Error('Client request email hook is missing')
for(const token of ['RESEND_API_KEY','SUPABASE_SERVICE_ROLE_KEY','email_notifications'])if(!email.includes(token))throw new Error(`Email Edge Function missing: ${token}`)
console.log('Brand profile, preview, notification and calendar contracts are present')
