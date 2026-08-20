import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.SUPABASE_URL
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

// @supabase/ssr's browser client stores the session in cookies (not
// localStorage) so the server client below can read the same session from
// the request for SSR route guards.
export const supabaseBrowserClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey,
)
