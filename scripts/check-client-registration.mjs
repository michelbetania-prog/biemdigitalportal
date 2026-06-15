import { access, readFile } from 'node:fs/promises'
const functionPath='supabase/functions/create-client-with-auth-user/index.ts'
await access(functionPath)
const [edge,admin,api]=await Promise.all([readFile(functionPath,'utf8'),readFile('src/AdminApp.jsx','utf8'),readFile('src/lib/admin-api.js','utf8')])
for(const token of ['auth.admin.createUser','email_confirm:true',"role:'client'",'client_id:clientId','client_brand_profiles','auth.admin.deleteUser','RESEND_API_KEY'])if(!edge.includes(token))throw new Error(`Client registration Edge Function missing: ${token}`)
if(/password[^\n]*(insert|upsert)/i.test(edge))throw new Error('Password must never be persisted in a public table')
for(const token of ['ClientRegistrationModal','Generar contraseña segura','Copiar contraseña','Enviar acceso por correo','createClientWithAuthUser'])if(!admin.includes(token))throw new Error(`Admin client registration UI missing: ${token}`)
if(!api.includes("functions.invoke('create-client-with-auth-user'"))throw new Error('Frontend must invoke the secure Edge Function')
if(api.includes('SUPABASE_SERVICE_ROLE_KEY'))throw new Error('Frontend must not reference the service role key')
console.log('Controlled admin client registration, password safety and rollback contracts validated')
