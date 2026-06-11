import { readFile } from 'node:fs/promises'

const [migration,settings,brand,admin,auth,client,team,confidentiality,email,styles,build,main]=await Promise.all([
  readFile('supabase/migrations/202606100004_portal_settings.sql','utf8'),
  readFile('src/lib/portal-settings.js','utf8'),
  readFile('src/PortalBrand.jsx','utf8'),
  readFile('src/AdminApp.jsx','utf8'),
  readFile('src/AuthApp.jsx','utf8'),
  readFile('src/ClientPortalApp.jsx','utf8'),
  readFile('src/TeamApp.jsx','utf8'),
  readFile('src/FirstLoginConfidentialityScreen.jsx','utf8'),
  readFile('supabase/functions/send-email-notification/index.ts','utf8'),
  readFile('src/admin-styles.css','utf8'),
  readFile('scripts/build.mjs','utf8'),
  readFile('src/main.jsx','utf8'),
])
for(const token of ['create table if not exists public.portal_settings','portal_settings_public_read','portal_settings_admin_update','portal-brand-assets'])if(!migration.includes(token))throw new Error(`Portal settings migration missing: ${token}`)
for(const token of ['defaultPortalSettings','loadPortalSettings','savePortalSettings','uploadPortalAsset','--portal-primary','favicon'])if(!settings.includes(token))throw new Error(`Portal settings API missing: ${token}`)
if(!admin.includes('function PortalSettingsPage')||!admin.includes('settings:<PortalSettingsPage/>'))throw new Error('Admin Configuración must render the functional settings page')
if(admin.includes('const update=(key,value)=>{const next={...draft,[key]:value};setDraft(next);applyPortalSettings(next)}'))throw new Error('Unsaved preview changes must not mutate the global portal theme')
if(!admin.includes("style={{'--portal-primary':draft.primary_color"))throw new Error('Theme preview must scope draft CSS variables locally')
for(const [name,source] of [['login',auth],['client',client],['team',team],['confidentiality',confidentiality]])if(!source.includes('PortalBrand'))throw new Error(`Portal brand missing from ${name}`)
for(const token of ['portalConfig?.main_logo_url','portalConfig?.accent_color','commercialName'])if(!email.includes(token))throw new Error(`Email branding missing: ${token}`)
for(const token of ['.portal-settings-page','--portal-background','data-card-style','data-portal-theme','.kanban-team-shell>aside','.preview-elevated'])if(!styles.includes(token))throw new Error(`Dynamic theme styles missing: ${token}`)
if(!build.includes("'PortalBrand.js'")||!build.includes("'lib/portal-settings.js'"))throw new Error('Build must include portal settings assets')
if(!main.includes('await loadPortalSettings()'))throw new Error('Portal settings must load before rendering')
console.log('Portal branding, configurable theme, admin settings, email integration and RLS contracts validated')
