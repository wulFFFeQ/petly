/**
 * Supabase browser client — anon/public key only.
 * Never import service_role here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from '../backend/config'

let client: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const config = getSupabasePublicConfig()
  if (!config) return null
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}

/** Test helper — reset singleton. */
export function resetSupabaseBrowserClientForTests(): void {
  client = null
}
