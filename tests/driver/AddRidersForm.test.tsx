import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AddRidersForm } from '#/components/driver/AddRidersForm'
import { addTripRiders } from '#/lib/driver/server-functions'
import type { RideCandidate } from '#/lib/driver/types'

vi.mock('#/lib/driver/server-functions', () => ({
  addTripRiders: vi.fn(),
}))

const mockedAddTripRiders = vi.mocked(addTripRiders)

const candidates: RideCandidate[] = [
  {
    rideRequestId: 'rr-1',
    personName: 'Jordan Lee',
    flight: 'AA100',
    flightTime: '2026-09-01T10:00:00.000Z',
    partySize: 2,
    stayingAtHotel: true,
    stayingFullDuration: true,
  },
  {
    rideRequestId: 'rr-2',
    personName: 'Alex Rivera',
    flight: 'AA200',
    flightTime: '2026-09-01T10:30:00.000Z',
    partySize: 1,
    stayingAtHotel: true,
    stayingFullDuration: false,
  },
]

function renderForm(
  overrides: Partial<Parameters<typeof AddRidersForm>[0]> = {},
) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AddRidersForm
        tripId="trip-1"
        candidates={candidates}
        capacity={{ passengerCapacity: 6, luggageCapacity: 4 }}
        {...overrides}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedAddTripRiders.mockReset()
  mockedAddTripRiders.mockResolvedValue(undefined)
})

describe('AddRidersForm', () => {
  it('only lists the candidates it was given (the matching-unclaimed filtering happens server-side)', () => {
    renderForm()

    expect(screen.getByText(/jordan lee/i)).toBeInTheDocument()
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('shows a message and no checkboxes when there are no candidates', () => {
    renderForm({ candidates: [] })

    expect(
      screen.getByText(/no unclaimed ride requests match/i),
    ).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('updates the passenger counter as riders are selected and deselected', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByText(/0 \/ 6 passengers selected/i)).toBeInTheDocument()

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0]) // Jordan Lee, party of 2
    expect(screen.getByText(/2 \/ 6 passengers selected/i)).toBeInTheDocument()

    await user.click(checkboxes[1]) // Alex Rivera, party of 1
    expect(screen.getByText(/3 \/ 6 passengers selected/i)).toBeInTheDocument()

    await user.click(checkboxes[0]) // deselect Jordan Lee
    expect(screen.getByText(/1 \/ 6 passengers selected/i)).toBeInTheDocument()
  })

  it('submits only the selected rideRequestIds for the given trip', async () => {
    const user = userEvent.setup()
    const onAdded = vi.fn()
    renderForm({ onAdded })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[1]) // Alex Rivera only

    await user.click(
      screen.getByRole('button', { name: /add selected riders/i }),
    )

    await waitFor(() => expect(mockedAddTripRiders).toHaveBeenCalled())
    const call = mockedAddTripRiders.mock.calls[0][0]
    expect(call.data.tripId).toBe('trip-1')
    expect(call.data.rideRequestIds).toEqual(['rr-2'])

    await waitFor(() => expect(onAdded).toHaveBeenCalled())
  })

  it('disables submit until at least one rider is selected', () => {
    renderForm()
    expect(
      screen.getByRole('button', { name: /add selected riders/i }),
    ).toBeDisabled()
  })

  it('shows a hotel badge per candidate, distinguishing full vs. partial stay', () => {
    renderForm()

    expect(screen.getByText('Hotel')).toBeInTheDocument()
    expect(screen.getByText('Hotel (partial)')).toBeInTheDocument()
  })

  it('shows no hotel badge for a candidate who is not staying at the hotel', () => {
    renderForm({
      candidates: [
        {
          rideRequestId: 'rr-3',
          personName: 'Sam Lee',
          flight: 'AA300',
          flightTime: '2026-09-01T11:00:00.000Z',
          partySize: 1,
          stayingAtHotel: null,
          stayingFullDuration: null,
        },
      ],
    })

    expect(screen.queryByText(/hotel/i)).not.toBeInTheDocument()
  })
})
