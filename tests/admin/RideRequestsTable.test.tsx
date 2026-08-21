import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RideRequestsTable } from '#/components/admin/RideRequestsTable'
import type { AdminRideRequestRow } from '#/lib/admin/types'

const rows: AdminRideRequestRow[] = [
  {
    id: 'rr-1',
    personName: 'Jordan Lee',
    airport: 'DFW',
    arrivalTime: '2026-09-01T10:00:00.000Z',
    arrivalRequested: true,
    arrivalConfirmed: false,
    departureTime: null,
    departureRequested: false,
    departureConfirmed: false,
    partySize: 1,
    stayingAtHotel: null,
    stayingFullDuration: null,
  },
  {
    id: 'rr-2',
    personName: 'Alex Rivera',
    airport: 'DAL',
    arrivalTime: '2026-09-02T10:00:00.000Z',
    arrivalRequested: true,
    arrivalConfirmed: true,
    departureTime: '2026-09-05T10:00:00.000Z',
    departureRequested: true,
    departureConfirmed: true,
    partySize: 2,
    stayingAtHotel: true,
    stayingFullDuration: false,
  },
]

describe('RideRequestsTable', () => {
  it('defaults to only showing rows with at least one unconfirmed leg', () => {
    render(<RideRequestsTable rows={rows} />)

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument()
    expect(screen.queryByText('Alex Rivera')).not.toBeInTheDocument()
  })

  it('reveals every row once "Show everyone" is toggled on', async () => {
    const user = userEvent.setup()
    render(<RideRequestsTable rows={rows} />)

    await user.click(screen.getByRole('checkbox', { name: /show everyone/i }))

    expect(screen.getByText('Jordan Lee')).toBeInTheDocument()
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
  })

  it('shows an empty-state message when nothing needs attention', () => {
    const allConfirmed = rows.filter((r) => r.id === 'rr-2')
    render(<RideRequestsTable rows={allConfirmed} />)

    expect(screen.getByText(/nothing needs attention/i)).toBeInTheDocument()
  })

  it('shows the hotel-stay column, including a dash for an unanswered row', async () => {
    const user = userEvent.setup()
    render(<RideRequestsTable rows={rows} />)
    await user.click(screen.getByRole('checkbox', { name: /show everyone/i }))

    expect(screen.getByText('Hotel (partial)')).toBeInTheDocument()

    const jordanRow = screen.getByText('Jordan Lee').closest('tr')!
    expect(jordanRow).toHaveTextContent('—')
  })
})
