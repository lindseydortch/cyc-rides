import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { RidersNeedingPickup } from '#/components/driver/RidersNeedingPickup'
import {
  addTripRiders,
  createTripAndClaimRiders,
} from '#/lib/driver/server-functions'
import type * as ServerFunctions from '#/lib/driver/server-functions'
import type { Trip, UnclaimedCandidate } from '#/lib/driver/types'

vi.mock('#/lib/driver/server-functions', async (importOriginal) => {
  const actual = await importOriginal<typeof ServerFunctions>()
  return {
    ...actual,
    addTripRiders: vi.fn(),
    createTripAndClaimRiders: vi.fn(),
  }
})

const mockedAddTripRiders = vi.mocked(addTripRiders)
const mockedCreateTripAndClaimRiders = vi.mocked(createTripAndClaimRiders)

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const jordan: UnclaimedCandidate = {
  rideRequestId: 'rr-jordan',
  airport: 'DFW',
  direction: 'arrival',
  personName: 'Jordan Lee',
  flight: 'AA100',
  flightTime: '2026-09-01T10:00:00.000Z',
  partySize: 2,
  stayingAtHotel: true,
  stayingFullDuration: true,
}

const alex: UnclaimedCandidate = {
  rideRequestId: 'rr-alex',
  airport: 'DFW',
  direction: 'arrival',
  personName: 'Alex Rivera',
  flight: 'AA050',
  flightTime: '2026-09-01T09:00:00.000Z',
  partySize: 1,
  stayingAtHotel: false,
  stayingFullDuration: null,
}

const dana: UnclaimedCandidate = {
  rideRequestId: 'rr-dana',
  airport: 'DAL',
  direction: 'arrival',
  personName: 'Dana Park',
  flight: 'DL200',
  flightTime: '2026-09-01T11:00:00.000Z',
  partySize: 1,
  stayingAtHotel: false,
  stayingFullDuration: null,
}

const sam: UnclaimedCandidate = {
  rideRequestId: 'rr-sam',
  airport: 'DAL',
  direction: 'departure',
  personName: 'Sam Lee',
  flight: 'SW900',
  flightTime: '2026-09-02T12:00:00.000Z',
  partySize: 1,
  stayingAtHotel: false,
  stayingFullDuration: null,
}

const candidates = [jordan, alex, dana, sam]

const matchingTrip: Trip = {
  id: 'trip-match',
  airport: 'DFW',
  direction: 'arrival',
  scheduledTime: '2026-09-01T08:00:00.000Z',
  riders: [],
}

const nonMatchingTrip: Trip = {
  id: 'trip-no-match',
  airport: 'DAL',
  direction: 'arrival',
  scheduledTime: '2026-09-01T08:00:00.000Z',
  riders: [],
}

function renderSection(
  overrides: Partial<Parameters<typeof RidersNeedingPickup>[0]> = {},
) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <RidersNeedingPickup candidates={candidates} trips={[]} {...overrides} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedAddTripRiders.mockReset()
  mockedAddTripRiders.mockResolvedValue(undefined)
  mockedCreateTripAndClaimRiders.mockReset()
  mockedCreateTripAndClaimRiders.mockResolvedValue({ id: 'new-trip-id' })
})

describe('RidersNeedingPickup', () => {
  it('renders arrival candidates across airports on the default Arrivals tab, across all trip context', () => {
    renderSection()

    expect(screen.getByText(/jordan lee/i)).toBeInTheDocument()
    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument()
    expect(screen.getByText(/dana park/i)).toBeInTheDocument()
    expect(screen.queryByText(/sam lee/i)).not.toBeInTheDocument()
  })

  it('switches between the Arrivals and Departures tabs', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('tab', { name: /departures/i }))

    expect(screen.getByText(/sam lee/i)).toBeInTheDocument()
    expect(screen.queryByText(/jordan lee/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/alex rivera/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/dana park/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /arrivals/i }))

    expect(screen.getByText(/jordan lee/i)).toBeInTheDocument()
    expect(screen.queryByText(/sam lee/i)).not.toBeInTheDocument()
  })

  it('locks the selection to one airport, disabling non-matching candidates within the same tab', async () => {
    const user = userEvent.setup()
    renderSection()

    const jordanRow = screen.getByText(/jordan lee/i).closest('label')!
    const alexRow = screen.getByText(/alex rivera/i).closest('label')!
    const danaRow = screen.getByText(/dana park/i).closest('label')!

    await user.click(jordanRow.querySelector('input[type="checkbox"]')!)

    // Same airport+direction (DFW arrival) stays enabled.
    expect(alexRow.querySelector('input[type="checkbox"]')).not.toBeDisabled()
    // Different airport, same direction (DAL arrival) is disabled, not hidden.
    expect(danaRow.querySelector('input[type="checkbox"]')).toBeDisabled()
    expect(screen.getByText(/dana park/i)).toBeInTheDocument()
  })

  it('narrows the list by airport', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.selectOptions(screen.getByLabelText(/airport/i), 'DAL')

    expect(screen.queryByText(/jordan lee/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/alex rivera/i)).not.toBeInTheDocument()
    expect(screen.getByText(/dana park/i)).toBeInTheDocument()
  })

  it('narrows the list by staying-at-hotel', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByLabelText(/staying at the conference hotel/i))

    expect(screen.getByText(/jordan lee/i)).toBeInTheDocument()
    expect(screen.queryByText(/alex rivera/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sam lee/i)).not.toBeInTheDocument()
  })

  it('narrows the list by a date/time range', async () => {
    const user = userEvent.setup()
    renderSection()

    // Window covers only Alex's 09:00 flight, not Jordan's 10:00 or Sam's
    // next-day 12:00.
    const from = toDatetimeLocalValue('2026-09-01T08:30:00.000Z')
    const to = toDatetimeLocalValue('2026-09-01T09:30:00.000Z')

    await user.type(screen.getByLabelText(/^from$/i), from)
    await user.type(screen.getByLabelText(/^to$/i), to)

    expect(screen.getByText(/alex rivera/i)).toBeInTheDocument()
    expect(screen.queryByText(/jordan lee/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sam lee/i)).not.toBeInTheDocument()
  })

  it('shows "Add to trip" only for matching trips, and hides it when none match', async () => {
    const user = userEvent.setup()
    const { rerender } = renderSection({
      trips: [matchingTrip, nonMatchingTrip],
    })
    const queryClient = new QueryClient()

    const jordanCheckbox = screen
      .getByText(/jordan lee/i)
      .closest('label')!
      .querySelector('input[type="checkbox"]')!
    await user.click(jordanCheckbox)

    expect(
      screen.getByRole('button', { name: /add to trip/i }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /add to trip/i }),
    ).toHaveLength(1)

    rerender(
      <QueryClientProvider client={queryClient}>
        <RidersNeedingPickup
          candidates={candidates}
          trips={[nonMatchingTrip]}
        />
      </QueryClientProvider>,
    )

    expect(
      screen.queryByRole('button', { name: /add to trip/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /\+ new trip/i }),
    ).toBeInTheDocument()
  })

  it('calls addTripRiders with the matching trip and selected riders', async () => {
    const user = userEvent.setup()
    renderSection({ trips: [matchingTrip] })

    await user.click(
      screen
        .getByText(/jordan lee/i)
        .closest('label')!
        .querySelector('input[type="checkbox"]')!,
    )
    await user.click(screen.getByRole('button', { name: /add to trip/i }))

    await waitFor(() => expect(mockedAddTripRiders).toHaveBeenCalled())
    expect(mockedAddTripRiders.mock.calls[0][0].data).toEqual({
      tripId: 'trip-match',
      rideRequestIds: ['rr-jordan'],
    })
  })

  it('"+ New trip" pre-fills scheduled time from the earliest selected rider and creates+claims in one call', async () => {
    const user = userEvent.setup()
    renderSection({ trips: [] })

    // Select both DFW-arrival candidates - Alex's 09:00 flight is earlier
    // than Jordan's 10:00.
    await user.click(
      screen
        .getByText(/jordan lee/i)
        .closest('label')!
        .querySelector('input[type="checkbox"]')!,
    )
    await user.click(
      screen
        .getByText(/alex rivera/i)
        .closest('label')!
        .querySelector('input[type="checkbox"]')!,
    )

    await user.click(screen.getByRole('button', { name: /\+ new trip/i }))

    const scheduledTimeInput = screen.getByLabelText(/scheduled time/i)
    expect(scheduledTimeInput).toHaveValue(
      toDatetimeLocalValue(alex.flightTime!),
    )

    await user.click(
      screen.getByRole('button', { name: /create trip & claim riders/i }),
    )

    await waitFor(() =>
      expect(mockedCreateTripAndClaimRiders).toHaveBeenCalled(),
    )
    const call = mockedCreateTripAndClaimRiders.mock.calls[0][0].data
    expect(call.airport).toBe('DFW')
    expect(call.direction).toBe('arrival')
    expect(call.rideRequestIds).toEqual(['rr-jordan', 'rr-alex'])
    expect(new Date(call.scheduledTime).getTime()).toBe(
      new Date(toDatetimeLocalValue(alex.flightTime!)).getTime(),
    )
  })
})
