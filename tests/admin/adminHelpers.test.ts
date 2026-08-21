import { describe, expect, it } from 'vitest'

import {
  buildAdminRideRequestRows,
  buildAdminTripRows,
  legNeedsAttention,
  rowNeedsAttention,
} from '#/lib/admin/server-functions'

describe('legNeedsAttention', () => {
  it('is false when the leg was never requested', () => {
    expect(legNeedsAttention(false, false)).toBe(false)
  })

  it('is true when requested but not confirmed', () => {
    expect(legNeedsAttention(true, false)).toBe(true)
  })

  it('is false once confirmed', () => {
    expect(legNeedsAttention(true, true)).toBe(false)
  })
})

describe('buildAdminRideRequestRows', () => {
  const rideRequests = [
    {
      id: 'rr-1',
      person_id: 'p-1',
      airport: 'DFW' as const,
      arrival_flight: 'AA100',
      arrival_time: '2026-09-01T10:00:00.000Z',
      arrival_ride_confirmed: false,
      departure_flight: null,
      departure_time: null,
      departure_ride_confirmed: false,
      staying_at_hotel: true,
      staying_full_duration: false,
    },
    {
      id: 'rr-2',
      person_id: 'p-2',
      airport: 'DAL' as const,
      arrival_flight: 'UA200',
      arrival_time: '2026-09-02T10:00:00.000Z',
      arrival_ride_confirmed: true,
      departure_flight: 'UA300',
      departure_time: '2026-09-05T10:00:00.000Z',
      departure_ride_confirmed: true,
      staying_at_hotel: null,
      staying_full_duration: null,
    },
  ]
  const people = [
    { id: 'p-1', name: 'Jordan Lee' },
    { id: 'p-2', name: 'Alex Rivera' },
  ]
  const companions = [{ ride_request_id: 'rr-1' }, { ride_request_id: 'rr-1' }]

  it('shapes each row, marking a leg requested only once both flight and time are set', () => {
    const rows = buildAdminRideRequestRows(rideRequests, people, companions)

    expect(rows[0]).toEqual({
      id: 'rr-1',
      personName: 'Jordan Lee',
      airport: 'DFW',
      arrivalTime: '2026-09-01T10:00:00.000Z',
      arrivalRequested: true,
      arrivalConfirmed: false,
      departureTime: null,
      departureRequested: false,
      departureConfirmed: false,
      partySize: 3,
      stayingAtHotel: true,
      stayingFullDuration: false,
    })
  })

  it('defaults to an unnamed rider with party size 1 when there are no companions', () => {
    const rows = buildAdminRideRequestRows(rideRequests, people, companions)
    expect(rows[1].partySize).toBe(1)
    expect(rows[1].personName).toBe('Alex Rivera')
  })

  it('falls back to null for a person not found in the people list', () => {
    const rows = buildAdminRideRequestRows(rideRequests, [], [])
    expect(rows[0].personName).toBeNull()
  })
})

describe('rowNeedsAttention', () => {
  const base = {
    id: 'rr-1',
    personName: 'Jordan Lee',
    airport: 'DFW' as const,
    arrivalTime: null,
    arrivalRequested: false,
    arrivalConfirmed: false,
    departureTime: null,
    departureRequested: false,
    departureConfirmed: false,
    partySize: 1,
    stayingAtHotel: null,
    stayingFullDuration: null,
  }

  it('is false when neither leg was requested', () => {
    expect(rowNeedsAttention(base)).toBe(false)
  })

  it('is true when the arrival leg is requested but unconfirmed', () => {
    expect(
      rowNeedsAttention({
        ...base,
        arrivalRequested: true,
        arrivalConfirmed: false,
      }),
    ).toBe(true)
  })

  it('is true when the departure leg is requested but unconfirmed', () => {
    expect(
      rowNeedsAttention({
        ...base,
        departureRequested: true,
        departureConfirmed: false,
      }),
    ).toBe(true)
  })

  it('is false once both requested legs are confirmed', () => {
    expect(
      rowNeedsAttention({
        ...base,
        arrivalRequested: true,
        arrivalConfirmed: true,
        departureRequested: true,
        departureConfirmed: true,
      }),
    ).toBe(false)
  })
})

describe('buildAdminTripRows', () => {
  const trips = [
    {
      id: 't-1',
      driver_id: 'd-1',
      airport: 'DFW' as const,
      direction: 'arrival' as const,
      scheduled_time: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 't-2',
      driver_id: 'd-2',
      airport: 'DAL' as const,
      direction: 'departure' as const,
      scheduled_time: '2026-09-02T10:00:00.000Z',
    },
  ]
  const drivers = [
    { id: 'd-1', person_id: 'p-1' },
    { id: 'd-2', person_id: 'p-2' },
  ]
  const people = [
    { id: 'p-1', name: 'Driver One' },
    { id: 'p-2', name: 'Driver Two' },
  ]
  const tripRiders = [
    { trip_id: 't-1' },
    { trip_id: 't-1' },
    { trip_id: 't-2' },
  ]

  it('joins driver name through drivers -> people and counts riders per trip', () => {
    const rows = buildAdminTripRows(trips, drivers, people, tripRiders)

    expect(rows).toEqual([
      {
        id: 't-1',
        driverName: 'Driver One',
        airport: 'DFW',
        direction: 'arrival',
        scheduledTime: '2026-09-01T10:00:00.000Z',
        riderCount: 2,
      },
      {
        id: 't-2',
        driverName: 'Driver Two',
        airport: 'DAL',
        direction: 'departure',
        scheduledTime: '2026-09-02T10:00:00.000Z',
        riderCount: 1,
      },
    ])
  })

  it('reports zero riders for a trip with none', () => {
    const rows = buildAdminTripRows([trips[0]], drivers, people, [])
    expect(rows[0].riderCount).toBe(0)
  })

  it('falls back to null driverName when the trip driver has no matching people row', () => {
    const rows = buildAdminTripRows([trips[0]], drivers, [], tripRiders)
    expect(rows[0].driverName).toBeNull()
  })
})
