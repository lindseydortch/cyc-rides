import { describe, expect, it } from 'vitest'

import { buildTripInsert, ridersForTrip } from '#/lib/driver/server-functions'
import type { DriverTripRiderRow } from '#/lib/driver/server-functions'

describe('buildTripInsert', () => {
  it('uses the given driver id, not anything from the form input', () => {
    const insert = buildTripInsert('driver-123', {
      airport: 'DFW',
      direction: 'arrival',
      scheduledTime: '2026-09-01T10:00:00.000Z',
    })

    expect(insert).toEqual({
      driver_id: 'driver-123',
      airport: 'DFW',
      direction: 'arrival',
      scheduled_time: '2026-09-01T10:00:00.000Z',
    })
  })
})

describe('ridersForTrip', () => {
  const rows: DriverTripRiderRow[] = [
    {
      trip_id: 'trip-1',
      ride_request_id: 'rr-1',
      person_name: 'Jordan Lee',
      companion_names: ['Sam Lee'],
      flight: 'AA100',
      flight_time: '2026-09-01T10:00:00.000Z',
      staying_at_hotel: true,
      staying_full_duration: false,
    },
    {
      trip_id: 'trip-2',
      ride_request_id: 'rr-2',
      person_name: 'Alex Rivera',
      companion_names: null,
      flight: 'AA200',
      flight_time: '2026-09-01T11:00:00.000Z',
      staying_at_hotel: null,
      staying_full_duration: null,
    },
  ]

  it('only returns rows for the given trip', () => {
    expect(ridersForTrip(rows, 'trip-1')).toEqual([
      {
        rideRequestId: 'rr-1',
        personName: 'Jordan Lee',
        companionNames: ['Sam Lee'],
        flightTime: '2026-09-01T10:00:00.000Z',
        stayingAtHotel: true,
        stayingFullDuration: false,
      },
    ])
  })

  it('defaults a null companion_names array to an empty array', () => {
    expect(ridersForTrip(rows, 'trip-2')).toEqual([
      {
        rideRequestId: 'rr-2',
        personName: 'Alex Rivera',
        companionNames: [],
        flightTime: '2026-09-01T11:00:00.000Z',
        stayingAtHotel: null,
        stayingFullDuration: null,
      },
    ])
  })
})
