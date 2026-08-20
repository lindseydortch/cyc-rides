import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { StatusCards } from '#/components/rides/StatusCards'
import type { RideRequestStatus } from '#/lib/rides/types'

function baseStatus(
  overrides: Partial<RideRequestStatus> = {},
): RideRequestStatus {
  return {
    id: 'rr-1',
    airport: 'DFW',
    arrivalFlight: null,
    arrivalTime: null,
    departureFlight: null,
    departureTime: null,
    companions: [],
    arrival: {
      requested: false,
      confirmed: false,
      scheduledTime: null,
      tripMates: [],
    },
    departure: {
      requested: false,
      confirmed: false,
      scheduledTime: null,
      tripMates: [],
    },
    ...overrides,
  }
}

function renderCards(
  status: RideRequestStatus,
  overrides: {
    onEditRequest?: () => void
    onAddLeg?: (leg: 'arrival' | 'departure') => void
  } = {},
) {
  const onEditRequest = overrides.onEditRequest ?? vi.fn()
  const onAddLeg = overrides.onAddLeg ?? vi.fn()
  render(
    <StatusCards
      status={status}
      onEditRequest={onEditRequest}
      onAddLeg={onAddLeg}
    />,
  )
  return { onEditRequest, onAddLeg }
}

describe('StatusCards', () => {
  it('shows "Not requested" with an add-leg action for legs with no flight info at all', () => {
    const { onAddLeg } = renderCards(baseStatus())
    expect(onAddLeg).not.toHaveBeenCalled()

    const notRequested = screen.getAllByText(/not requested/i)
    expect(notRequested).toHaveLength(2)
    expect(screen.queryByText(/still needs a ride/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ride confirmed/i)).not.toBeInTheDocument()

    const addButtons = screen.getAllByRole('button', {
      name: /add this leg/i,
    })
    expect(addButtons).toHaveLength(2)
  })

  it('calls onAddLeg with the correct leg when "+ Add this leg" is clicked', async () => {
    const user = userEvent.setup()
    const { onAddLeg } = renderCards(baseStatus())

    const addButtons = screen.getAllByRole('button', {
      name: /add this leg/i,
    })
    // Arrival card renders first.
    await user.click(addButtons[0])
    expect(onAddLeg).toHaveBeenCalledWith('arrival')

    await user.click(addButtons[1])
    expect(onAddLeg).toHaveBeenCalledWith('departure')
  })

  it('shows "Still needs a ride" for a requested-but-unconfirmed leg, distinct from "Not requested"', () => {
    const { onAddLeg } = renderCards(
      baseStatus({
        arrival: {
          requested: true,
          confirmed: false,
          scheduledTime: null,
          tripMates: [],
        },
      }),
    )
    expect(onAddLeg).not.toHaveBeenCalled()

    expect(screen.getByText(/still needs a ride/i)).toBeInTheDocument()
    expect(screen.getByText(/not requested/i)).toBeInTheDocument()
  })

  it('shows "Ride confirmed" with scheduled time and trip-mates for a confirmed leg', () => {
    renderCards(
      baseStatus({
        arrival: {
          requested: true,
          confirmed: true,
          scheduledTime: '2026-09-01T09:30:00Z',
          tripMates: [
            {
              rideRequestId: 'rr-2',
              personName: 'Jordan Lee',
              companionNames: ['Sam Lee'],
            },
          ],
        },
      }),
    )

    expect(screen.getByText(/ride confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(/not requested/i)).toBeInTheDocument()
    expect(screen.getByText(/jordan lee/i)).toBeInTheDocument()
    expect(screen.getByText(/sam lee/i)).toBeInTheDocument()
  })

  it('does not render a trip-mates list for a confirmed leg with no trip-mates', () => {
    renderCards(
      baseStatus({
        departure: {
          requested: true,
          confirmed: true,
          scheduledTime: '2026-09-03T13:00:00Z',
          tripMates: [],
        },
      }),
    )

    expect(screen.queryByText(/riding with/i)).not.toBeInTheDocument()
  })

  it('calls onEditRequest when "Edit request" is clicked', async () => {
    const user = userEvent.setup()
    const { onEditRequest } = renderCards(baseStatus())

    await user.click(screen.getByRole('button', { name: /edit request/i }))
    expect(onEditRequest).toHaveBeenCalled()
  })
})
