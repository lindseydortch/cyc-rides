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
