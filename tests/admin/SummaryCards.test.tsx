import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { SummaryCards } from '#/components/admin/SummaryCards'

describe('SummaryCards', () => {
  it('renders the given counts against the underlying summary data', () => {
    render(
      <SummaryCards
        summary={{
          unconfirmedArrivals: 3,
          unconfirmedDepartures: 5,
          totalRiders: 12,
          totalDrivers: 4,
        }}
      />,
    )

    expect(screen.getByText('Unconfirmed arrivals')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Unconfirmed departures')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Total riders')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Total drivers')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})
