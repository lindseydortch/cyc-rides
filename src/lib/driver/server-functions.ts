import { createServerFn } from '@tanstack/react-start'

import { getSupabaseServerClient } from '#/lib/supabase/server'
import type { Airport, Leg } from '#/lib/rides/types'
import type {
  DriverCapacity,
  DriverTripsOverview,
  RideCandidate,
  Trip,
  TripDetail,
  TripRider,
} from '#/lib/driver/types'

interface DriverRow {
  id: string
  passenger_capacity: number | null
  luggage_capacity: number | null
}

interface TripRow {
  id: string
  airport: Airport | null
  direction: Leg
  scheduled_time: string | null
}

export interface DriverTripRiderRow {
  trip_id: string
  ride_request_id: string
  person_name: string | null
  companion_names: string[] | null
  flight: string | null
  flight_time: string | null
}

interface UnclaimedRideRequestRow {
  ride_request_id: string
  person_name: string | null
  flight: string | null
  flight_time: string | null
  party_size: number
}

// Pure mapper from the driver_trip_riders RPC's flat rows to the shape one
// trip's rider list wants. Kept separate so it's directly testable, same
// reasoning as rides/server-functions.ts's mapTripMates.
export function ridersForTrip(
  rows: DriverTripRiderRow[],
  tripId: string,
): TripRider[] {
  return rows
    .filter((row) => row.trip_id === tripId)
    .map((row) => ({
      rideRequestId: row.ride_request_id,
      personName: row.person_name,
      companionNames: row.companion_names ?? [],
      flightTime: row.flight_time,
    }))
}

export interface CreateTripInput {
  airport: Airport
  direction: Leg
  scheduledTime: string
}

// Builds the trips insert payload from the caller's own drivers.id - pulled
// out so "trip creation uses the correct driver_id" is directly testable
// without a real Supabase/cookie context.
export function buildTripInsert(driverId: string, input: CreateTripInput) {
  return {
    driver_id: driverId,
    airport: input.airport,
    direction: input.direction,
    scheduled_time: input.scheduledTime,
  }
}

async function getOwnDriverRow(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  userId: string,
): Promise<DriverRow> {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, passenger_capacity, luggage_capacity')
    .eq('person_id', userId)
    .maybeSingle<DriverRow>()
  if (error) throw error
  if (!data) throw new Error('No drivers row for this user')
  return data
}

function toCapacity(driver: DriverRow): DriverCapacity {
  return {
    passengerCapacity: driver.passenger_capacity,
    luggageCapacity: driver.luggage_capacity,
  }
}

// Returns the current driver's trips, soonest-scheduled first, and each
// trip's currently attached riders, plus their vehicle capacity.
export const getMyDriverTrips = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DriverTripsOverview> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const driver = await getOwnDriverRow(supabase, user.id)

    const { data: tripRows, error: tripsError } = await supabase
      .from('trips')
      .select('id, airport, direction, scheduled_time')
      .eq('driver_id', driver.id)
      .order('scheduled_time', { ascending: true })
    if (tripsError) throw tripsError

    const { data: riderRows, error: ridersError } =
      await supabase.rpc('driver_trip_riders')
    if (ridersError) throw ridersError
    const riders = (riderRows ?? []) as DriverTripRiderRow[]

    const trips: Trip[] = (tripRows as TripRow[]).map((row) => ({
      id: row.id,
      airport: row.airport,
      direction: row.direction,
      scheduledTime: row.scheduled_time,
      riders: ridersForTrip(riders, row.id),
    }))

    return {
      driverId: driver.id,
      capacity: toCapacity(driver),
      trips,
    }
  },
)

export const createTrip = createServerFn({ method: 'POST' })
  .validator((data: CreateTripInput) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const driver = await getOwnDriverRow(supabase, user.id)

    const { data: trip, error } = await supabase
      .from('trips')
      .insert(buildTripInsert(driver.id, data))
      .select('id')
      .single()
    if (error) throw error

    return { id: trip.id as string }
  })

export const getTripDetail = createServerFn({ method: 'GET' })
  .validator((data: { tripId: string }) => data)
  .handler(async ({ data }): Promise<TripDetail> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const driver = await getOwnDriverRow(supabase, user.id)

    const { data: tripRow, error: tripError } = await supabase
      .from('trips')
      .select('id, airport, direction, scheduled_time')
      .eq('id', data.tripId)
      .single<TripRow>()
    if (tripError) throw tripError

    const { data: riderRows, error: ridersError } =
      await supabase.rpc('driver_trip_riders')
    if (ridersError) throw ridersError
    const riders = ridersForTrip(
      (riderRows ?? []) as DriverTripRiderRow[],
      tripRow.id,
    )

    const { data: candidateData, error: candidatesError } = await supabase.rpc(
      'unclaimed_ride_requests',
      {
        p_airport: tripRow.airport,
        p_direction: tripRow.direction,
        p_reference_time: tripRow.scheduled_time,
      },
    )
    if (candidatesError) throw candidatesError
    const candidateRows = (candidateData ?? []) as UnclaimedRideRequestRow[]

    const candidates: RideCandidate[] = candidateRows.map((row) => ({
      rideRequestId: row.ride_request_id,
      personName: row.person_name,
      flight: row.flight,
      flightTime: row.flight_time,
      partySize: row.party_size,
    }))

    return {
      trip: {
        id: tripRow.id,
        airport: tripRow.airport,
        direction: tripRow.direction,
        scheduledTime: tripRow.scheduled_time,
        riders,
      },
      capacity: toCapacity(driver),
      candidates,
    }
  })

// Claiming riders is a driver write to ride_requests (flipping the confirmed
// flag), so it goes through the claim_trip_riders() RPC rather than a direct
// insert+update - see the "tighten driver write access" migration for why.
export const addTripRiders = createServerFn({ method: 'POST' })
  .validator((data: { tripId: string; rideRequestIds: string[] }) => data)
  .handler(async ({ data }) => {
    if (data.rideRequestIds.length === 0) return

    const supabase = getSupabaseServerClient()
    const { error } = await supabase.rpc('claim_trip_riders', {
      trip_id: data.tripId,
      ride_request_ids: data.rideRequestIds,
    })
    if (error) throw error
  })

export const removeTripRider = createServerFn({ method: 'POST' })
  .validator((data: { tripId: string; rideRequestId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.rpc('unclaim_trip_rider', {
      trip_id: data.tripId,
      ride_request_id: data.rideRequestId,
    })
    if (error) throw error
  })
