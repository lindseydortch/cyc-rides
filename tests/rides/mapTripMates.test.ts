import { describe, expect, it } from 'vitest'

import { mapTripMates } from '#/lib/rides/server-functions'
import type { TripMateRow } from '#/lib/rides/server-functions'

describe('mapTripMates', () => {
  it('maps rows from the single scoped trip_mates_for_leg RPC into TripMate shape', () => {
    const rows: TripMateRow[] = [
      { ride_request_id: 'self', person_name: 'Me', companion_names: null },
      {
        ride_request_id: 'other-1',
        person_name: 'Jordan Lee',
        companion_names: ['Sam Lee'],
      },
    ]

    const result = mapTripMates(rows, 'self')

    expect(result).toEqual([
      {
        rideRequestId: 'other-1',
        personName: 'Jordan Lee',
        companionNames: ['Sam Lee'],
      },
    ])
  })

  it('excludes the caller\'s own ride_request_id ("trip-mates" means others, not you)', () => {
    const rows: TripMateRow[] = [
      { ride_request_id: 'self', person_name: 'Me', companion_names: null },
    ]

    expect(mapTripMates(rows, 'self')).toEqual([])
  })

  it('defaults a null companion_names array to an empty array', () => {
    const rows: TripMateRow[] = [
      {
        ride_request_id: 'other-1',
        person_name: 'Jordan Lee',
        companion_names: null,
      },
    ]

    expect(mapTripMates(rows, 'self')).toEqual([
      {
        rideRequestId: 'other-1',
        personName: 'Jordan Lee',
        companionNames: [],
      },
    ])
  })
})
