// One-off dev fixture: seeds a batch of sample riders and drivers (with ride
// requests, companions, trips, and some already-claimed trip_riders) against
// a running local Supabase instance, so the requester/driver/admin screens
// have realistic-looking data to develop against. Invoke by hand, after
// `npm run seed:dev` (this script assumes dev-driver@example.com already
// exists and uses it as the owner of one trip):
//
//   supabase start   # if not already running
//   npm run seed:dev        # base dev-requester/dev-driver/dev-admin accounts
//   npm run seed:dev-data   # this script
//
// Uses the local instance's service_role key (pulled from `supabase status`,
// never a checked-in secret) to bypass RLS for fixture setup. Safe to
// re-run: people/ride_requests/drivers are upserted by email/person_id, but
// trips and trip_riders are only created the first time (re-running won't
// duplicate claims).
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

import { DEV_PASSWORD } from '../src/lib/auth/dev-accounts.ts'

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

// Timestamps anchored to "tomorrow" relative to whenever this is run, so
// the data stays plausible no matter when someone seeds it.
const tomorrow = (hours: number, minutes = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}
const inDays = (days: number, hours: number, minutes = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

interface RiderSpec {
  email: string
  name: string
  airport: 'DFW' | 'DAL'
  arrivalFlight?: string
  arrivalTime?: string
  departureFlight?: string
  departureTime?: string
  stayingAtHotel?: boolean
  stayingFullDuration?: boolean
  companions?: string[]
}

const RIDERS: RiderSpec[] = [
  {
    email: 'aisha.bello@example.com',
    name: 'Aisha Bello',
    airport: 'DFW',
    arrivalFlight: 'AA123',
    arrivalTime: tomorrow(14, 0),
    departureFlight: 'DL456',
    departureTime: inDays(3, 9, 0),
    stayingAtHotel: true,
    stayingFullDuration: true,
    companions: ['Femi Bello'],
  },
  {
    email: 'carlos.mendoza@example.com',
    name: 'Carlos Mendoza',
    airport: 'DAL',
    arrivalFlight: 'WN200',
    arrivalTime: tomorrow(10, 30),
    stayingAtHotel: true,
    stayingFullDuration: false,
  },
  {
    email: 'priya.natarajan@example.com',
    name: 'Priya Natarajan',
    airport: 'DFW',
    arrivalFlight: 'UA789',
    arrivalTime: tomorrow(16, 45),
    departureFlight: 'UA790',
    departureTime: inDays(3, 9, 15),
    stayingAtHotel: false,
  },
  {
    email: 'jordan.lee@example.com',
    name: 'Jordan Lee',
    airport: 'DAL',
    arrivalFlight: 'WN455',
    arrivalTime: tomorrow(8, 0),
    departureFlight: 'WN999',
    departureTime: inDays(3, 18, 0),
  },
  {
    email: 'maria.garcia@example.com',
    name: 'Maria Garcia',
    airport: 'DFW',
    departureFlight: 'AA321',
    departureTime: inDays(3, 11, 0),
  },
  {
    email: 'tom.obrien@example.com',
    name: "Tom O'Brien",
    airport: 'DAL',
    arrivalFlight: 'WN101',
    arrivalTime: tomorrow(12, 15),
    companions: ["Sarah O'Brien", "Liam O'Brien"],
  },
  {
    email: 'wei.zhang@example.com',
    name: 'Wei Zhang',
    airport: 'DFW',
    arrivalFlight: 'CA987',
    arrivalTime: tomorrow(20, 0),
    stayingAtHotel: true,
    stayingFullDuration: true,
  },
  {
    email: 'fatima.alsayed@example.com',
    name: 'Fatima Al-Sayed',
    airport: 'DFW',
    arrivalFlight: 'EK212',
    arrivalTime: tomorrow(6, 30),
    departureFlight: 'EK213',
    departureTime: inDays(3, 23, 0),
  },
  {
    email: 'noah.kim@example.com',
    name: 'Noah Kim',
    airport: 'DAL',
    departureFlight: 'WN777',
    departureTime: inDays(3, 15, 30),
  },
  {
    email: 'grace.okafor@example.com',
    name: 'Grace Okafor',
    airport: 'DFW',
    arrivalFlight: 'DL654',
    arrivalTime: tomorrow(13, 0),
    stayingAtHotel: true,
    stayingFullDuration: false,
  },
]

interface DriverSpec {
  email: string
  name: string
  vehicleMakeModel: string
  licensePlate: string
  passengerCapacity: number
  luggageCapacity: number
}

const DRIVERS: DriverSpec[] = [
  {
    email: 'ben.carter@example.com',
    name: 'Ben Carter',
    vehicleMakeModel: 'Ford Explorer',
    licensePlate: 'FIX-4821',
    passengerCapacity: 6,
    luggageCapacity: 5,
  },
  {
    email: 'dana.whitfield@example.com',
    name: 'Dana Whitfield',
    vehicleMakeModel: 'Chrysler Pacifica',
    licensePlate: 'PAC-7730',
    passengerCapacity: 7,
    luggageCapacity: 6,
  },
]

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

async function ensureAuthUser(email: string) {
  let user = await findUserByEmail(email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
    })
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard against the admin API's real (wider-than-inferred) error shape
    if (error || !data.user) {
      throw error ?? new Error(`failed to create user ${email}`)
    }
    user = data.user
  }
  return user
}

async function seedRider(spec: RiderSpec) {
  const user = await ensureAuthUser(spec.email)

  const { error: peopleError } = await admin
    .from('people')
    .update({ name: spec.name, role: 'requester', is_admin: false })
    .eq('id', user.id)
  if (peopleError) throw peopleError

  const { data: rideRequest, error: rideRequestError } = await admin
    .from('ride_requests')
    .upsert(
      {
        person_id: user.id,
        airport: spec.airport,
        arrival_flight: spec.arrivalFlight ?? null,
        arrival_time: spec.arrivalTime ?? null,
        departure_flight: spec.departureFlight ?? null,
        departure_time: spec.departureTime ?? null,
        staying_at_hotel: spec.stayingAtHotel ?? null,
        staying_full_duration: spec.stayingFullDuration ?? null,
      },
      { onConflict: 'person_id' },
    )
    .select('id')
    .single()
  if (rideRequestError) throw rideRequestError

  // Re-running would otherwise duplicate companions since there's no
  // natural unique key on (ride_request_id, name) - clear and re-insert.
  const { error: deleteCompanionsError } = await admin
    .from('ride_companions')
    .delete()
    .eq('ride_request_id', rideRequest.id)
  if (deleteCompanionsError) throw deleteCompanionsError

  if (spec.companions && spec.companions.length > 0) {
    const { error: companionsError } = await admin
      .from('ride_companions')
      .insert(
        spec.companions.map((name) => ({
          ride_request_id: rideRequest.id,
          name,
        })),
      )
    if (companionsError) throw companionsError
  }

  console.log(`rider: ${spec.name} <${spec.email}>`)
  return { personId: user.id, rideRequestId: rideRequest.id as string }
}

async function seedDriver(spec: DriverSpec) {
  const user = await ensureAuthUser(spec.email)

  const { error: peopleError } = await admin
    .from('people')
    .update({ name: spec.name, role: 'driver', is_admin: false })
    .eq('id', user.id)
  if (peopleError) throw peopleError

  const { data: driver, error: driverError } = await admin
    .from('drivers')
    .upsert(
      {
        person_id: user.id,
        vehicle_make_model: spec.vehicleMakeModel,
        license_plate: spec.licensePlate,
        passenger_capacity: spec.passengerCapacity,
        luggage_capacity: spec.luggageCapacity,
      },
      { onConflict: 'person_id' },
    )
    .select('id')
    .single()
  if (driverError) throw driverError

  console.log(`driver: ${spec.name} <${spec.email}>`)
  return { personId: user.id, driverId: driver.id as string }
}

async function ensureTripWithRiders(
  driverId: string,
  airport: 'DFW' | 'DAL',
  direction: 'arrival' | 'departure',
  scheduledTime: string,
  riderIds: { rideRequestId: string }[],
) {
  const { data: existing, error: existingError } = await admin
    .from('trips')
    .select('id')
    .eq('driver_id', driverId)
    .eq('airport', airport)
    .eq('direction', direction)
    .eq('scheduled_time', scheduledTime)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    console.log(`trip already exists for driver ${driverId} at ${scheduledTime}, skipping claim`)
    return
  }

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .insert({ driver_id: driverId, airport, direction, scheduled_time: scheduledTime })
    .select('id')
    .single()
  if (tripError) throw tripError

  const { error: ridersError } = await admin.from('trip_riders').insert(
    riderIds.map((r) => ({
      trip_id: trip.id,
      ride_request_id: r.rideRequestId,
      leg: direction,
    })),
  )
  if (ridersError) throw ridersError

  const confirmedColumn =
    direction === 'arrival' ? 'arrival_ride_confirmed' : 'departure_ride_confirmed'
  for (const r of riderIds) {
    const { error: confirmError } = await admin
      .from('ride_requests')
      .update({ [confirmedColumn]: true })
      .eq('id', r.rideRequestId)
    if (confirmError) throw confirmError
  }

  console.log(`trip: ${airport} ${direction} @ ${scheduledTime} (driver ${driverId})`)
}

async function main() {
  const riders: Record<string, { personId: string; rideRequestId: string }> = {}
  for (const spec of RIDERS) {
    riders[spec.email] = await seedRider(spec)
  }

  const drivers: Record<string, { personId: string; driverId: string }> = {}
  for (const spec of DRIVERS) {
    drivers[spec.email] = await seedDriver(spec)
  }

  const devDriver = await findUserByEmail('dev-driver@example.com')
  if (!devDriver) {
    console.log(
      '\ndev-driver@example.com not found - run `npm run seed:dev` first to also create sample trips/claims. Riders and standalone drivers were still seeded.',
    )
  } else {
    const { data: devDriverRow, error: devDriverRowError } = await admin
      .from('drivers')
      .select('id')
      .eq('person_id', devDriver.id)
      .single()
    if (devDriverRowError) throw devDriverRowError

    // Claim Jordan Lee onto a DAL arrival trip driven by dev-driver.
    await ensureTripWithRiders(
      devDriverRow.id as string,
      'DAL',
      'arrival',
      tomorrow(8, 0),
      [riders['jordan.lee@example.com']],
    )

    // Claim Tom O'Brien onto a DAL arrival trip driven by Ben Carter.
    await ensureTripWithRiders(
      drivers['ben.carter@example.com'].driverId,
      'DAL',
      'arrival',
      tomorrow(12, 15),
      [riders['tom.obrien@example.com']],
    )

    // Aisha Bello and Wei Zhang left unclaimed at DFW so the driver
    // "unclaimed riders" list and admin dashboard both have entries to show.
  }

  console.log(
    `\nDone. ${RIDERS.length} riders, ${DRIVERS.length} extra drivers. All fixture accounts use password: ${DEV_PASSWORD}`,
  )
}

await main()
