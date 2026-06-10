import { supabase } from './supabase.js'

export const defaultPortalSettings = Object.freeze({
  id:true,
  agency_name:'Biem Digital', portal_name:'Portal Biem', commercial_name:'Biem Digital',
  main_logo_url:'', icon_logo_url:'', favicon_url:'',
  welcome_message:'Tu trabajo. Tu equipo. En un solo lugar.',
  support_email:'', support_whatsapp:'', website_url:'', instagram_url:'', facebook_url:'', tiktok_url:'',
  primary_color:'#4B0082', soft_color:'#E6E6FA', accent_color:'#C46A2D', background_color:'#F6F3FB',
  text_color:'#1F1A24', muted_text_color:'#6B6472', border_color:'#D8D2E6', card_color:'#FFFFFF',
  border_radius:12, card_style:'outlined', theme_mode:'light',
})

let current={...defaultPortalSettings}
const colorPattern=/^#[0-9A-Fa-f]{6}$/

export function normalizePortalSettings(value={}){
  const merged={...defaultPortalSettings,...value}
  for(const key of ['primary_color','soft_color','accent_color','background_color','text_color','muted_text_color','border_color','card_color']){
    if(!colorPattern.test(merged[key]||''))merged[key]=defaultPortalSettings[key]
  }
  merged.border_radius=Math.min(32,Math.max(0,Number(merged.border_radius)||defaultPortalSettings.border_radius))
  if(!['outlined','elevated','flat'].includes(merged.card_style))merged.card_style=defaultPortalSettings.card_style
  if(!['light','dark'].includes(merged.theme_mode))merged.theme_mode=defaultPortalSettings.theme_mode
  return merged
}

export function getPortalSettings(){return current}

export function portalInitials(settings=current){
  return (settings.agency_name||settings.portal_name||'BIEM').split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,4).toUpperCase()||'BIEM'
}

export function applyPortalSettings(value){
  current=normalizePortalSettings(value)
  if(typeof document==='undefined')return current
  const root=document.documentElement
  const variables={
    '--portal-primary':current.primary_color,'--portal-soft':current.soft_color,'--portal-accent':current.accent_color,
    '--portal-background':current.background_color,'--portal-text':current.text_color,'--portal-muted':current.muted_text_color,
    '--portal-border':current.border_color,'--portal-card':current.card_color,'--portal-radius':`${current.border_radius}px`,
    '--ink':current.text_color,'--muted':current.muted_text_color,'--line':current.border_color,'--coral':current.accent_color,
    '--coral-dark':current.accent_color,'--cream':current.background_color,'--green':current.primary_color,
    '--admin-bg':current.background_color,'--admin-ink':current.text_color,'--admin-green':current.primary_color,
    '--admin-coral':current.accent_color,'--admin-line':current.border_color,'--admin-muted':current.muted_text_color,
  }
  Object.entries(variables).forEach(([name,value])=>root.style.setProperty(name,value))
  root.dataset.portalTheme=current.theme_mode
  root.dataset.cardStyle=current.card_style
  const favicon=current.favicon_url||current.icon_logo_url
  let link=document.querySelector('link[rel="icon"]')
  if(favicon){if(!link){link=document.createElement('link');link.rel='icon';document.head.appendChild(link)}link.href=favicon}
  const themeMeta=document.querySelector('meta[name="theme-color"]')
  if(themeMeta)themeMeta.content=current.primary_color
  document.title=`${current.portal_name} — ${current.agency_name}`
  return current
}

export async function loadPortalSettings(){
  if(!supabase)return applyPortalSettings(defaultPortalSettings)
  const {data,error}=await supabase.from('portal_settings').select('*').eq('id',true).maybeSingle()
  if(error){console.warn('[BIEM portal settings]',error.message);return applyPortalSettings(defaultPortalSettings)}
  return applyPortalSettings(data||defaultPortalSettings)
}

export async function savePortalSettings(payload){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const normalized=normalizePortalSettings(payload)
  const {data:{user}}=await supabase.auth.getUser()
  const record={...normalized,id:true,updated_by:user?.id||null,updated_at:new Date().toISOString()}
  delete record.created_at
  const {data,error}=await supabase.from('portal_settings').upsert(record,{onConflict:'id'}).select().single()
  if(error)throw new Error(error.message)
  return applyPortalSettings(data)
}

export async function uploadPortalAsset(file,kind){
  if(!supabase)throw new Error('Supabase no está configurado.')
  if(!file?.size)throw new Error('Selecciona un archivo válido.')
  if(file.size>5*1024*1024)throw new Error('El archivo no puede superar 5 MB.')
  const extension=(file.name.split('.').pop()||'png').toLowerCase()
  const path=`branding/${kind}-${Date.now()}.${extension}`
  const {error}=await supabase.storage.from('portal-brand-assets').upload(path,file,{upsert:true,contentType:file.type})
  if(error)throw new Error(error.message)
  return supabase.storage.from('portal-brand-assets').getPublicUrl(path).data.publicUrl
}
