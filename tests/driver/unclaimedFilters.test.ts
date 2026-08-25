import { describe, expect, it } from 'vitest'

import { matchesUnclaimedFilters } from '#/lib/driver/server-functions'
import type { UnclaimedCandidate } from '#/lib/driver/types'

function candidate(
  overrides: Partial<UnclaimedCandidate> = {},
): UnclaimedCandidate {
  return {
    rideRequestId: 'rr-1',
    airport: 'DFW',
    direction: 'arrival',
    personName: 'Jordan Lee',
    flight: 'AA100',
    flightTime: '2026-09-01T10:00:00.000Z',
    partySize: 1,
    stayingAtHotel: true,
    stayingFullDuration: true,
    ...overrides,
  }
}

describe('matchesUnclaimedFilters', () => {
  it('passes everything when no filters are set', () => {
    expect(matchesUnclaimedFilters(candidate(), {})).toBe(true)
  })

  it('narrows by airport', () => {
    expect(
      matchesUnclaimedFilters(candidate({ airport: 'DAL' }), {
        airport: 'DFW',
      }),
    ).toBe(false)
    expect(
      matchesUnclaimedFilters(candidate({ airport: 'DFW' }), {
        airport: 'DFW',
      }),
    ).toBe(true)
  })

  it('narrows by staying at the conference hotel', () => {
    expect(
      matchesUnclaimedFilters(candidate({ stayingAtHotel: false }), {
        stayingAtHotel: true,
      }),
    ).toBe(false)
    expect(
      matchesUnclaimedFilters(candidate({ stayingAtHotel: null }), {
        stayingAtHotel: true,
      }),
    ).toBe(false)
    expect(
      matchesUnclaimedFilters(candidate({ stayingAtHotel: true }), {
        stayingAtHotel: true,
      }),
    ).toBe(true)
  })

  it('does not filter on stayingAtHotel when the filter is unset', () => {
    expect(
      matchesUnclaimedFilters(candidate({ stayingAtHotel: false }), {}),
    ).toBe(true)
  })

  it('narrows by a date/time range', () => {
    const c = candidate({ flightTime: '2026-09-01T10:00:00.000Z' })
    expect(
      matchesUnclaimedFilters(c, { startTime: '2026-09-01T11:00:00.000Z' }),
    ).toBe(false)
    expect(
      matchesUnclaimedFilters(c, { endTime: '2026-09-01T09:00:00.000Z' }),
    ).toBe(false)
    expect(
      matchesUnclaimedFilters(c, {
        startTime: '2026-09-01T09:00:00.000Z',
        endTime: '2026-09-01T11:00:00.000Z',
      }),
    ).toBe(true)
  })
})
