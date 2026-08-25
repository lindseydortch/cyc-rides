import type { Airport, Leg } from '#/lib/rides/types'

export interface TripRider {
  rideRequestId: string
  personName: string | null
  companionNames: string[]
  flightTime: string | null
  stayingAtHotel: boolean | null
  stayingFullDuration: boolean | null
}

export interface Trip {
  id: string
  airport: Airport | null
  direction: Leg
  scheduledTime: string | null
  riders: TripRider[]
}

export interface DriverCapacity {
  passengerCapacity: number | null
  luggageCapacity: number | null
}

export interface DriverTripsOverview {
  driverId: string
  capacity: DriverCapacity
  trips: Trip[]
}

export interface RideCandidate {
  rideRequestId: string
  personName: string | null
  flight: string | null
  flightTime: string | null
  partySize: number
  stayingAtHotel: boolean | null
  stayingFullDuration: boolean | null
}

export interface TripDetail {
  trip: Trip
  capacity: DriverCapacity
  candidates: RideCandidate[]
}

// A candidate row from the global "riders needing a pickup" list - unlike
// RideCandidate (scoped to one trip's airport+direction), each row carries
// its own airport/direction since the list spans all of them.
export interface UnclaimedCandidate {
  rideRequestId: string
  airport: Airport | null
  direction: Leg
  personName: string | null
  flight: string | null
  flightTime: string | null
  partySize: number
  stayingAtHotel: boolean | null
  stayingFullDuration: boolean | null
}

export interface UnclaimedFilters {
  airport?: Airport
  stayingAtHotel?: boolean
  startTime?: string
  endTime?: string
}
