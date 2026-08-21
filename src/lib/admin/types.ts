import type { Airport, Leg } from '#/lib/rides/types'

export interface AdminSummary {
  unconfirmedArrivals: number
  unconfirmedDepartures: number
  totalRiders: number
  totalDrivers: number
}

export interface AdminRideRequestRow {
  id: string
  personName: string | null
  airport: Airport | null
  arrivalTime: string | null
  arrivalRequested: boolean
  arrivalConfirmed: boolean
  departureTime: string | null
  departureRequested: boolean
  departureConfirmed: boolean
  partySize: number
  stayingAtHotel: boolean | null
  stayingFullDuration: boolean | null
}

export interface AdminTripRow {
  id: string
  driverName: string | null
  airport: Airport | null
  direction: Leg
  scheduledTime: string | null
  riderCount: number
}
