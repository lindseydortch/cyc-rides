import { describe, expect, it } from 'vitest'

import {
  buildTripInsert,
  buildTripRiderInserts,
  confirmedColumnForLeg,
  ridersForTrip,
} from '#/lib/driver/server-functions'
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

describe('confirmedColumnForLeg', () => {
  it('maps arrival to arrival_ride_confirmed, not departure', () => {
    expect(confirmedColumnForLeg('arrival')).toBe('arrival_ride_confirmed')
  })

  it('maps departure to departure_ride_confirmed, not arrival', () => {
    expect(confirmedColumnForLeg('departure')).toBe('departure_ride_confirmed')
  })
})

describe('buildTripRiderInserts', () => {
  it('builds one trip_riders row per selected ride request, tagged with the trip leg', () => {
    const rows = buildTripRiderInserts('trip-1', 'departure', ['rr-1', 'rr-2'])

    expect(rows).toEqual([
      { trip_id: 'trip-1', ride_request_id: 'rr-1', leg: 'departure' },
      { trip_id: 'trip-1', ride_request_id: 'rr-2', leg: 'departure' },
    ])
  })

  it('returns an empty array for no selections', () => {
    expect(buildTripRiderInserts('trip-1', 'arrival', [])).toEqual([])
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
    },
    {
      trip_id: 'trip-2',
      ride_request_id: 'rr-2',
      person_name: 'Alex Rivera',
      companion_names: null,
      flight: 'AA200',
      flight_time: '2026-09-01T11:00:00.000Z',
    },
  ]

  it('only returns rows for the given trip', () => {
    expect(ridersForTrip(rows, 'trip-1')).toEqual([
      {
        rideRequestId: 'rr-1',
        personName: 'Jordan Lee',
        companionNames: ['Sam Lee'],
        flightTime: '2026-09-01T10:00:00.000Z',
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
      },
    ])
  })
})
