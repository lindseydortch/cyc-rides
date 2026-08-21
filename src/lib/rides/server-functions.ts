import { createServerFn } from '@tanstack/react-start'

import { getSupabaseServerClient } from '#/lib/supabase/server'
import type {
  Airport,
  Leg,
  LegStatus,
  RideRequestStatus,
  TripMate,
} from '#/lib/rides/types'

export interface TripMateRow {
  ride_request_id: string
  person_name: string | null
  companion_names: string[] | null
}

interface RideRequestRow {
  id: string
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

// Pure mapper from the trip_mates_for_leg RPC result to the shape the UI
// wants, excluding the caller's own ride_requests row ("trip-mates" means
// *other* riders). Kept separate from loadLegStatus so it's testable
// without a real Supabase/cookie context - the RPC itself is what scopes
// the result to the caller's own confirmed trip+leg (see the migration), so
// this function's only job is shaping + self-exclusion, not further
// filtering for security.
export function mapTripMates(
  rows: TripMateRow[],
  ownRideRequestId: string,
): TripMate[] {
  return rows
    .filter((row) => row.ride_request_id !== ownRideRequestId)
    .map((row) => ({
      rideRequestId: row.ride_request_id,
      personName: row.person_name,
      companionNames: row.companion_names ?? [],
    }))
}

async function loadLegStatus(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  rideRequestId: string,
  leg: Leg,
  requested: boolean,
  confirmed: boolean,
): Promise<LegStatus> {
  if (!confirmed) {
    return { requested, confirmed: false, scheduledTime: null, tripMates: [] }
  }

  const { data: tripRider, error: tripRiderError } = await supabase
    .from('trip_riders')
    .select('trip_id')
    .eq('ride_request_id', rideRequestId)
    .eq('leg', leg)
    .maybeSingle()

  if (tripRiderError || !tripRider) {
    return { requested, confirmed: true, scheduledTime: null, tripMates: [] }
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('scheduled_time')
    .eq('id', tripRider.trip_id)
    .maybeSingle()

  const { data: matesData, error: matesError } = await supabase.rpc(
    'trip_mates_for_leg',
    { p_trip_id: tripRider.trip_id, p_leg: leg },
  )
  const mates = matesData as TripMateRow[] | null

  const tripMates: TripMate[] =
    matesError || !mates ? [] : mapTripMates(mates, rideRequestId)

  return {
    requested,
    confirmed: true,
    scheduledTime: trip?.scheduled_time ?? null,
    tripMates,
  }
}

// Returns the current user's ride_requests row (with companions and, for
// each confirmed leg, the assigned trip + trip-mates), or null if they
// haven't submitted a request yet.
export const getMyRideStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<RideRequestStatus | null> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: rideRequest } = await supabase
      .from('ride_requests')
      .select(
        'id, airport, arrival_flight, arrival_time, arrival_ride_confirmed, departure_flight, departure_time, departure_ride_confirmed, staying_at_hotel, staying_full_duration',
      )
      .eq('person_id', user.id)
      .maybeSingle<RideRequestRow>()

    if (!rideRequest) return null

    const { data: companions } = await supabase
      .from('ride_companions')
      .select('id, name')
      .eq('ride_request_id', rideRequest.id)

    // A leg is "requested" once both its flight number and time are set -
    // matches the pairing RequestForm's validation enforces on submit.
    const arrivalRequested =
      rideRequest.arrival_flight !== null && rideRequest.arrival_time !== null
    const departureRequested =
      rideRequest.departure_flight !== null &&
      rideRequest.departure_time !== null

    const [arrival, departure] = await Promise.all([
      loadLegStatus(
        supabase,
        rideRequest.id,
        'arrival',
        arrivalRequested,
        rideRequest.arrival_ride_confirmed,
      ),
      loadLegStatus(
        supabase,
        rideRequest.id,
        'departure',
        departureRequested,
        rideRequest.departure_ride_confirmed,
      ),
    ])

    return {
      id: rideRequest.id,
      airport: rideRequest.airport,
      arrivalFlight: rideRequest.arrival_flight,
      arrivalTime: rideRequest.arrival_time,
      departureFlight: rideRequest.departure_flight,
      departureTime: rideRequest.departure_time,
      companions: companions ?? [],
      arrival,
      departure,
      stayingAtHotel: rideRequest.staying_at_hotel,
      stayingFullDuration: rideRequest.staying_full_duration,
    }
  },
)

// Shared by both create and update: a leg is only present if both its
// flight number and time are filled in (RequestForm only submits a leg as
// non-null once both fields validate as a matched pair - see
// RequestForm.legFillState) - null/null means "not requesting this leg."
export interface RideRequestFormInput {
  airport: Airport
  arrivalFlight: string | null
  arrivalTime: string | null
  departureFlight: string | null
  departureTime: string | null
  companionNames: string[]
  stayingAtHotel: boolean | null
  stayingFullDuration: boolean | null
}

// Deletes all existing companions for the ride request and re-inserts the
// current (trimmed, de-blanked) list. A full replace rather than a diff
// because the UI only ever tracks companions as a flat name list (no ids),
// same repeatable-field component Prompt #4 built.
async function replaceCompanions(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  rideRequestId: string,
  companionNames: string[],
) {
  const { error: deleteError } = await supabase
    .from('ride_companions')
    .delete()
    .eq('ride_request_id', rideRequestId)
  if (deleteError) throw deleteError

  const names = companionNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0)

  if (names.length > 0) {
    const { error: insertError } = await supabase
      .from('ride_companions')
      .insert(names.map((name) => ({ ride_request_id: rideRequestId, name })))
    if (insertError) throw insertError
  }
}

export const createRideRequest = createServerFn({ method: 'POST' })
  .validator((data: RideRequestFormInput) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const { data: rideRequest, error: insertError } = await supabase
      .from('ride_requests')
      .insert({
        person_id: user.id,
        airport: data.airport,
        arrival_flight: data.arrivalFlight,
        arrival_time: data.arrivalTime,
        departure_flight: data.departureFlight,
        departure_time: data.departureTime,
        staying_at_hotel: data.stayingAtHotel,
        staying_full_duration: data.stayingFullDuration,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    await replaceCompanions(supabase, rideRequest.id, data.companionNames)
  })

// Updates the current user's existing ride_requests row. Deliberately does
// not touch trip_riders/trips even if a leg being edited is already
// confirmed (a driver assigned) - there's no notification system yet to
// safely unwind that, so the edit is allowed through and the UI shows a
// warning instead. See RequestForm's confirmedLegs prop.
export const updateRideRequest = createServerFn({ method: 'POST' })
  .validator((data: RideRequestFormInput) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not signed in')

    const { data: rideRequest, error: fetchError } = await supabase
      .from('ride_requests')
      .select('id')
      .eq('person_id', user.id)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!rideRequest) throw new Error('No ride request found to update')

    const { error: updateError } = await supabase
      .from('ride_requests')
      .update({
        airport: data.airport,
        arrival_flight: data.arrivalFlight,
        arrival_time: data.arrivalTime,
        departure_flight: data.departureFlight,
        departure_time: data.departureTime,
        staying_at_hotel: data.stayingAtHotel,
        staying_full_duration: data.stayingFullDuration,
      })
      .eq('id', rideRequest.id)
    if (updateError) throw updateError

    await replaceCompanions(supabase, rideRequest.id, data.companionNames)
  })
