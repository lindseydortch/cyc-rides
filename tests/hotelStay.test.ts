import { describe, expect, it } from 'vitest'

import { hotelStayBadge } from '#/lib/hotel-stay'

describe('hotelStayBadge', () => {
  it('returns null when not staying at the hotel', () => {
    expect(hotelStayBadge(false, null)).toBeNull()
    expect(hotelStayBadge(null, null)).toBeNull()
  })

  it('returns "Hotel" for a full-duration stay', () => {
    expect(hotelStayBadge(true, true)).toBe('Hotel')
  })

  it('returns "Hotel (partial)" for a partial stay', () => {
    expect(hotelStayBadge(true, false)).toBe('Hotel (partial)')
  })

  it('treats an unanswered nested field as partial, since staying-at-hotel alone is confirmed', () => {
    expect(hotelStayBadge(true, null)).toBe('Hotel (partial)')
  })
})
