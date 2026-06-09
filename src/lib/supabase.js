import { createClient } from '@supabase/supabase-js'

const config = globalThis.__BIEM_CONFIG__ || {}

export const supabaseConfigured = Boolean(config.supabaseUrl && config.supabasePublishableKey)

export const supabase = supabaseConfigured
  ? createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

