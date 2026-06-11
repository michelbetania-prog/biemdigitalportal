import { supabase } from './supabase.js'

function normalizePackage(item){
  const services=Array.isArray(item.services_included)?item.services_included:Array.isArray(item.included_services)?item.included_services:typeof item.services_included==='string'?item.services_included.split(/\r?\n/).map(value=>value.trim()).filter(Boolean):[]
  return {...item,price:Number(item.price??item.monthly_price??0),currency:item.currency||'DOP',billing_period:item.billing_period||'Mensual',services_included:services,is_featured:Boolean(item.is_featured),display_order:Number(item.display_order??0),button_text:item.button_text||'Solicitar este paquete'}
}

function missingSchema(error){return ['42703','42883','PGRST202','PGRST204'].includes(error?.code)||/display_order|active_packages|schema cache/i.test(error?.message||'')}

export async function loadActivePackages(){
  if(!supabase)throw new Error('Supabase no está configurado.')
  const rpc=await supabase.rpc('active_packages')
  if(!rpc.error)return (rpc.data||[]).map(normalizePackage)
  if(!missingSchema(rpc.error))throw new Error(rpc.error.message)

  console.warn('[BIEM packages] El esquema nuevo aún no está disponible; usando compatibilidad temporal.')
  let query=await supabase.from('packages').select('*').eq('is_active',true).order('display_order',{ascending:true,nullsFirst:false})
  if(query.error&&missingSchema(query.error))query=await supabase.from('packages').select('*').eq('is_active',true).order('created_at',{ascending:true,nullsFirst:false})
  if(query.error)throw new Error(query.error.message)
  return (query.data||[]).map(normalizePackage).sort((a,b)=>a.display_order-b.display_order||`${a.created_at||''}`.localeCompare(`${b.created_at||''}`)||a.name.localeCompare(b.name))
}
