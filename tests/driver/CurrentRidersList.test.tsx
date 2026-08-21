import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { CurrentRidersList } from '#/components/driver/CurrentRidersList'
import { removeTripRider } from '#/lib/driver/server-functions'
import type { TripRider } from '#/lib/driver/types'

vi.mock('#/lib/driver/server-functions', () => ({
  removeTripRider: vi.fn(),
}))

const mockedRemoveTripRider = vi.mocked(removeTripRider)

const riders: TripRider[] = [
  {
    rideRequestId: 'rr-1',
    personName: 'Jordan Lee',
    companionNames: ['Sam Lee'],
    flightTime: '2026-09-01T10:00:00.000Z',
    stayingAtHotel: true,
    stayingFullDuration: true,
  },
  {
    rideRequestId: 'rr-2',
    personName: 'Alex Rivera',
    companionNames: [],
    flightTime: '2026-09-01T11:00:00.000Z',
    stayingAtHotel: true,
    stayingFullDuration: false,
  },
  {
    rideRequestId: 'rr-3',
    personName: 'Sam Patel',
    companionNames: [],
    flightTime: '2026-09-01T12:00:00.000Z',
    stayingAtHotel: null,
    stayingFullDuration: null,
  },
]

function renderList(
  overrides: Partial<Parameters<typeof CurrentRidersList>[0]> = {},
) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentRidersList tripId="trip-1" riders={riders} {...overrides} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedRemoveTripRider.mockReset()
  mockedRemoveTripRider.mockResolvedValue(undefined)
})

describe('CurrentRidersList', () => {
  it('shows an empty-state message when there are no riders', () => {
    renderList({ riders: [] })
    expect(screen.getByText(/no riders added yet/i)).toBeInTheDocument()
  })

  it('shows a hotel badge per rider, distinguishing full vs. partial stay, and none when unanswered', () => {
    renderList()

    expect(screen.getByText('Hotel')).toBeInTheDocument()
    expect(screen.getByText('Hotel (partial)')).toBeInTheDocument()

    const samRow = screen.getByText(/sam patel/i).closest('li')
    expect(samRow).not.toHaveTextContent('Hotel')
  })

  it('calls removeTripRider with the correct trip and ride request ids', async () => {
    const user = userEvent.setup()
    const onRemoved = vi.fn()
    renderList({ onRemoved })

    const jordanRow = screen.getByText(/jordan lee/i).closest('li')!
    await user.click(within(jordanRow).getByRole('button', { name: /remove/i }))

    await waitFor(() => expect(mockedRemoveTripRider).toHaveBeenCalled())
    expect(mockedRemoveTripRider.mock.calls[0][0]).toEqual({
      data: { tripId: 'trip-1', rideRequestId: 'rr-1' },
    })
  })
})
