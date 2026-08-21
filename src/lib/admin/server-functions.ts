import { createServerFn } from '@tanstack/react-start'

import { getSupabaseServerClient } from '#/lib/supabase/server'
import type { Airport, Leg } from '#/lib/rides/types'
import type {
  AdminRideRequestRow,
  AdminSummary,
  AdminTripRow,
} from '#/lib/admin/types'

interface RideRequestRow {
  id: string
  person_id: string
  airport: Airport | null
  arrival_flight: string | null
  arrival_time: string | null
  arrival_ride_confirmed: boolean
  departure_flight: string | null
  departure_time: string | null
  departure_ride_confirmed: boolean
  staying_at_hotel: boolean | null
  staying_full_duration: boolean | null
}

interface PersonRow {
  id: string
  name: string | null
}

interface DriverRow {
  id: string
  person_id: string
}

interface TripRow {
  id: string
  driver_id: string
  airport: Airport | null
  direction: Leg
  scheduled_time: string | null
}

interface RideCompanionRow {
  ride_request_id: string
}

interface TripRiderRow {
  trip_id: string
}

// Counts how many rows in `rows` map to each key - shared by the trips
// (rider counts per trip) and ride requests (companion counts per request)
// tables. Pure so it's directly testable.
function countByKey<T>(
  rows: T[],
  key: (row: T) => string,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

// A leg is "requested" once both its flight number and time are set (same
// rule RequestForm/getMyRideStatus use), and "needs attention" once it's
// requested but not yet confirmed by a driver.
export function legNeedsAttention(
  requested: boolean,
  confirmed: boolean,
): boolean {
  return requested && !confirmed
}

export function rowNeedsAttention(row: AdminRideRequestRow): boolean {
  return (
    legNeedsAttention(row.arrivalRequested, row.arrivalConfirmed) ||
    legNeedsAttention(row.departureRequested, row.departureConfirmed)
  )
}

// Pure mapper from the raw ride_requests/people/ride_companions rows to the
// admin table's shape. Kept separate so it's directly testable without a
// real Supabase/cookie context, same reasoning as the driver/rides mappers.
export function buildAdminRideRequestRows(
  rideRequests: RideRequestRow[],
  people: PersonRow[],
  companions: RideCompanionRow[],
): AdminRideRequestRow[] {
  const nameById = new Map(people.map((p) => [p.id, p.name]))
  const companionCounts = countByKey(companions, (c) => c.ride_request_id)

  return rideRequests.map((row) => ({
    id: row.id,
    personName: nameById.get(row.person_id) ?? null,
    airport: row.airport,
    arrivalTime: row.arrival_time,
    arrivalRequested: row.arrival_flight !== null && row.arrival_time !== null,
    arrivalConfirmed: row.arrival_ride_confirmed,
    departureTime: row.departure_time,
    departureRequested:
      row.departure_flight !== null && row.departure_time !== null,
    departureConfirmed: row.departure_ride_confirmed,
    partySize: 1 + (companionCounts.get(row.id) ?? 0),
    stayingAtHotel: row.staying_at_hotel,
    stayingFullDuration: row.staying_full_duration,
  }))
}

// Pure mapper from the raw trips/drivers/people/trip_riders rows to the
// admin trips table's shape.
export function buildAdminTripRows(
  trips: TripRow[],
  drivers: DriverRow[],
  people: PersonRow[],
  tripRiders: TripRiderRow[],
): AdminTripRow[] {
  const nameByPersonId = new Map(people.map((p) => [p.id, p.name]))
  const nameByDriverId = new Map(
    drivers.map((d) => [d.id, nameByPersonId.get(d.person_id) ?? null]),
  )
  const riderCounts = countByKey(tripRiders, (r) => r.trip_id)

  return trips.map((trip) => ({
    id: trip.id,
    driverName: nameByDriverId.get(trip.driver_id) ?? null,
    airport: trip.airport,
    direction: trip.direction,
    scheduledTime: trip.scheduled_time,
    riderCount: riderCounts.get(trip.id) ?? 0,
  }))
}

// The people-select policy lets anyone read their own row regardless of
// admin status, so this doubles as an authorization check: a non-admin
// caller gets rejected here rather than relying on RLS row-scoping alone
// (several existing policies - e.g. "drivers can select all ride_requests"
// - are broader than "admin-only", so RLS by itself isn't a strong enough
// gate for these admin-only server functions).
async function requireAdminUser(
  supabase: ReturnType<typeof getSupabaseServerClient>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')

  const { data: person, error } = await supabase
    .from('people')
    .select('is_admin')
    .eq('id', user.id)
    .single<{ is_admin: boolean }>()
  if (error) throw error
  if (!person.is_admin) throw new Error('Not authorized')
}

export const getAdminSummary = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminSummary> => {
    const supabase = getSupabaseServerClient()
    await requireAdminUser(supabase)

    const { data: rideRequests, error: rideRequestsError } = await supabase
      .from('ride_requests')
      .select(
        'id, person_id, airport, arrival_flight, arrival_time, arrival_ride_confirmed, departure_flight, departure_time, departure_ride_confirmed, staying_at_hotel, staying_full_duration',
      )
    if (rideRequestsError) throw rideRequestsError

    const rows = buildAdminRideRequestRows(rideRequests, [], [])

    const { count: totalDrivers, error: driversError } = await supabase
      .from('drivers')
      .select('*', { count: 'exact', head: true })
    if (driversError) throw driversError

    return {
      unconfirmedArrivals: rows.filter((r) =>
        legNeedsAttention(r.arrivalRequested, r.arrivalConfirmed),
      ).length,
      unconfirmedDepartures: rows.filter((r) =>
        legNeedsAttention(r.departureRequested, r.departureConfirmed),
      ).length,
      totalRiders: rows.length,
      totalDrivers: totalDrivers ?? 0,
    }
  },
)

export const getAdminRideRequests = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminRideRequestRow[]> => {
    const supabase = getSupabaseServerClient()
    await requireAdminUser(supabase)

    const { data: rideRequests, error: rideRequestsError } = await supabase
      .from('ride_requests')
      .select(
        'id, person_id, airport, arrival_flight, arrival_time, arrival_ride_confirmed, departure_flight, departure_time, departure_ride_confirmed, staying_at_hotel, staying_full_duration',
      )
    if (rideRequestsError) throw rideRequestsError

    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, name')
    if (peopleError) throw peopleError

    const { data: companions, error: companionsError } = await supabase
      .from('ride_companions')
      .select('ride_request_id')
    if (companionsError) throw companionsError

    return buildAdminRideRequestRows(rideRequests, people, companions)
  },
)

export const getAdminTrips = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminTripRow[]> => {
    const supabase = getSupabaseServerClient()
    await requireAdminUser(supabase)

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, driver_id, airport, direction, scheduled_time')
      .order('scheduled_time', { ascending: true })
    if (tripsError) throw tripsError

    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('id, person_id')
    if (driversError) throw driversError

    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('id, name')
    if (peopleError) throw peopleError

    const { data: tripRiders, error: tripRidersError } = await supabase
      .from('trip_riders')
      .select('trip_id')
    if (tripRidersError) throw tripRidersError

    return buildAdminTripRows(trips, drivers, people, tripRiders)
  },
)
