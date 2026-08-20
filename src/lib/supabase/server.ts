import { createClient } from '@supabase/supabase-js'

// Basic server-side client. Cookie/session-aware auth wiring comes with the
// login flow in a later prompt — this just gives server functions/loaders a
// Supabase client to call.
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.',
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
