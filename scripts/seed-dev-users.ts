// One-off dev fixture: seeds three test accounts (requester, driver, admin)
// against a running local Supabase instance, for use with the /login dev
// sign-in bypass (Prompt #3.5). NOT run automatically — invoke by hand:
//
//   supabase start   # if not already running
//   npm run seed:dev
//
// Uses the local instance's service_role key (pulled from `supabase status`,
// never a checked-in secret) to bypass RLS for fixture setup. Safe to
// re-run: existing accounts are detected and left in place (password reset
// to the known dev password, role/driver row upserted).
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

import { DEV_ACCOUNTS, DEV_PASSWORD } from '../src/lib/auth/dev-accounts.ts'
import type { DevAccountSpec } from '../src/lib/auth/dev-accounts.ts'

const output = execSync('supabase status -o env', { encoding: 'utf-8' })
const env: Record<string, string> = {}
for (const line of output.split('\n')) {
  const match = line.match(/^(?:export\s+)?([A-Z_]+)="(.*)"$/)
  if (!match) continue
  const [, key, value] = match
  env[key] = value
}

const API_URL = env.API_URL
const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY

if (!API_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    'Could not read local Supabase connection details from `supabase status -o env`. Is `supabase start` running?',
  )
}

const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email: string) {
  // Admin API has no get-by-email; page through listUsers. Fine at dev-seed
  // scale (a handful of accounts in a local instance).
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    })
    if (error) throw error
    const found = data.users.find((u) => u.email === email)
    if (found) return found
    if (data.users.length < 200) return null
    page += 1
  }
}

async function seedUser(spec: DevAccountSpec) {
  let user = await findUserByEmail(spec.email)

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: DEV_PASSWORD,
      email_confirm: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard against the admin API's real (wider-than-inferred) error shape
    if (error || !data.user) {
      throw error ?? new Error(`failed to create user ${spec.email}`)
    }
    user = data.user
    console.log(`created ${spec.email}`)
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: DEV_PASSWORD,
    })
    if (error) throw error
    console.log(
      `already existed: ${spec.email} (password reset to dev default)`,
    )
  }

  const { error: peopleError } = await admin
    .from('people')
    .update({ name: spec.name, role: spec.role, is_admin: spec.isAdmin })
    .eq('id', user.id)
  if (peopleError) throw peopleError

  if (spec.driver) {
    const { error: driverError } = await admin.from('drivers').upsert(
      {
        person_id: user.id,
        vehicle_make_model: spec.driver.vehicleMakeModel,
        license_plate: spec.driver.licensePlate,
        passenger_capacity: spec.driver.passengerCapacity,
        luggage_capacity: spec.driver.luggageCapacity,
      },
      { onConflict: 'person_id' },
    )
    if (driverError) throw driverError
  }
}

async function main() {
  for (const spec of DEV_ACCOUNTS) {
    await seedUser(spec)
  }
  console.log(`\nDone. All dev accounts use password: ${DEV_PASSWORD}`)
}

await main()
