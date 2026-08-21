export type Airport = 'DFW' | 'DAL'
export type Leg = 'arrival' | 'departure'

export interface Companion {
  id: string
  name: string | null
}

export interface TripMate {
  rideRequestId: string
  personName: string | null
  companionNames: string[]
}

export interface LegStatus {
  // Whether the requester has filled in flight/time for this leg at all -
  // distinct from `confirmed` (a driver assigned). A leg can be requested
  // but not yet confirmed ("Still needs a ride") or not requested at all
  // ("Not requested").
  requested: boolean
  confirmed: boolean
  scheduledTime: string | null
  tripMates: TripMate[]
}

export interface RideRequestStatus {
  id: string
  airport: Airport | null
  arrivalFlight: string | null
  arrivalTime: string | null
  departureFlight: string | null
  departureTime: string | null
  companions: Companion[]
  arrival: LegStatus
  departure: LegStatus
  stayingAtHotel: boolean | null
  stayingFullDuration: boolean | null
}
