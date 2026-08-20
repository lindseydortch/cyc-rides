import type { Airport, Leg } from '#/lib/rides/types'

export type TripStatus = 'open' | 'completed'

export interface TripRider {
  rideRequestId: string
  personName: string | null
  companionNames: string[]
  flightTime: string | null
}

export interface Trip {
  id: string
  airport: Airport | null
  direction: Leg
  scheduledTime: string | null
  status: TripStatus
  riders: TripRider[]
}

export interface DriverCapacity {
  passengerCapacity: number | null
  luggageCapacity: number | null
}

export interface DriverTripsOverview {
  driverId: string
  capacity: DriverCapacity
  upcoming: Trip[]
  completed: Trip[]
}

export interface RideCandidate {
  rideRequestId: string
  personName: string | null
  flight: string | null
  flightTime: string | null
  partySize: number
}

export interface TripDetail {
  trip: Trip
  capacity: DriverCapacity
  candidates: RideCandidate[]
}
