import { execSync } from 'node:child_process'

// Pulls connection details for the locally running `supabase start` instance
// (API URL, anon key, service_role key) and populates process.env, so the
// RLS test suite doesn't need a checked-in .env with real credentials.
const output = execSync('supabase status -o env', { encoding: 'utf-8' })

for (const line of output.split('\n')) {
  const match = line.match(/^(?:export\s+)?([A-Z_]+)="(.*)"$/)
  if (!match) continue
  const [, key, value] = match
  if (!process.env[key]) process.env[key] = value
}

if (
  !process.env.API_URL ||
  !process.env.ANON_KEY ||
  !process.env.SERVICE_ROLE_KEY
) {
  throw new Error(
    'Could not read local Supabase connection details from `supabase status -o env`. Is `supabase start` running?',
  )
}
