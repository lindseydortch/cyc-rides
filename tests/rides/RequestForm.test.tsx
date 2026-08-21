import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { RequestForm } from '#/components/rides/RequestForm'
import type { RequestFormInitialData } from '#/components/rides/RequestForm'
import {
  createRideRequest,
  updateRideRequest,
} from '#/lib/rides/server-functions'

vi.mock('#/lib/rides/server-functions', () => ({
  createRideRequest: vi.fn(),
  updateRideRequest: vi.fn(),
}))

const mockedCreateRideRequest = vi.mocked(createRideRequest)
const mockedUpdateRideRequest = vi.mocked(updateRideRequest)

function renderForm(props: Parameters<typeof RequestForm>[0] = {}) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <RequestForm {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedCreateRideRequest.mockReset()
  mockedCreateRideRequest.mockResolvedValue(undefined)
  mockedUpdateRideRequest.mockReset()
  mockedUpdateRideRequest.mockResolvedValue(undefined)
})

describe('RequestForm validation', () => {
  it('requires an airport and at least one fully-filled leg when nothing is entered', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    expect(await screen.findByText('Select an airport.')).toBeInTheDocument()
    expect(screen.getByText(/add at least one leg/i)).toBeInTheDocument()
    expect(mockedCreateRideRequest).not.toHaveBeenCalled()
  })

  it('flags a partially-filled leg (flight without a date/time) as incomplete', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText(/airport/i), 'DFW')
    await user.type(screen.getByPlaceholderText(/AA100/i), 'AA100')
    // Arrival date/time left blank on purpose.

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    expect(await screen.findByText(/enter a date\/time/i)).toBeInTheDocument()
    expect(screen.queryByText(/add at least one leg/i)).not.toBeInTheDocument()
    expect(mockedCreateRideRequest).not.toHaveBeenCalled()
  })

  it('allows submitting with only one leg filled in (a partial request)', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText(/airport/i), 'DFW')
    await user.type(screen.getByPlaceholderText(/AA100/i), 'AA100')
    await user.type(
      screen.getByLabelText(/arrival date & time/i),
      '2026-09-01T10:00',
    )
    // Departure left entirely blank - should be valid.

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    await waitFor(() => expect(mockedCreateRideRequest).toHaveBeenCalled())
    const call = mockedCreateRideRequest.mock.calls[0][0]
    expect(call.data.arrivalFlight).toBe('AA100')
    expect(call.data.departureFlight).toBeNull()
    expect(call.data.departureTime).toBeNull()
  })

  it('submits both legs when both are fully filled', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText(/airport/i), 'DFW')
    await user.type(screen.getByPlaceholderText(/AA100/i), 'AA100')
    await user.type(
      screen.getByLabelText(/arrival date & time/i),
      '2026-09-01T10:00',
    )
    await user.type(screen.getByPlaceholderText(/AA200/i), 'AA200')
    await user.type(
      screen.getByLabelText(/departure date & time/i),
      '2026-09-03T14:00',
    )

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    await waitFor(() => expect(mockedCreateRideRequest).toHaveBeenCalled())
    const call = mockedCreateRideRequest.mock.calls[0][0]
    expect(call.data.airport).toBe('DFW')
    expect(call.data.arrivalFlight).toBe('AA100')
    expect(call.data.departureFlight).toBe('AA200')
    expect(call.data.companionNames).toEqual([])
    expect(call.data.stayingAtHotel).toBeNull()
    expect(call.data.stayingFullDuration).toBeNull()
  })

  it('adding and removing a companion field works', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.queryByLabelText(/companion 1 name/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /add a companion/i }))
    expect(screen.getByLabelText(/companion 1 name/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/companion 1 name/i), 'Alex Rivera')

    await user.click(screen.getByRole('button', { name: /add a companion/i }))
    expect(screen.getByLabelText(/companion 2 name/i)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /remove companion 1/i }),
    )

    expect(screen.queryByDisplayValue('Alex Rivera')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/companion 1 name/i)).toBeInTheDocument()
  })
})

describe('RequestForm hotel stay checkboxes', () => {
  async function fillMinimalValidLeg(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByLabelText(/airport/i), 'DFW')
    await user.type(screen.getByPlaceholderText(/AA100/i), 'AA100')
    await user.type(
      screen.getByLabelText(/arrival date & time/i),
      '2026-09-01T10:00',
    )
  }

  it('hides "staying the entire conference" until the hotel checkbox is checked', () => {
    renderForm()
    expect(
      screen.queryByLabelText(/staying the entire conference/i),
    ).not.toBeInTheDocument()
  })

  it('submits both fields as null when left unanswered', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMinimalValidLeg(user)

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    await waitFor(() => expect(mockedCreateRideRequest).toHaveBeenCalled())
    const call = mockedCreateRideRequest.mock.calls[0][0]
    expect(call.data.stayingAtHotel).toBeNull()
    expect(call.data.stayingFullDuration).toBeNull()
  })

  it('submits stayingAtHotel true and stayingFullDuration null when checked but the nested field is left unanswered', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMinimalValidLeg(user)

    await user.click(screen.getByLabelText(/staying at the conference hotel/i))
    expect(
      screen.getByLabelText(/staying the entire conference/i),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    await waitFor(() => expect(mockedCreateRideRequest).toHaveBeenCalled())
    const call = mockedCreateRideRequest.mock.calls[0][0]
    expect(call.data.stayingAtHotel).toBe(true)
    expect(call.data.stayingFullDuration).toBeNull()
  })

  it('submits stayingFullDuration false (partial stay) when the nested field is explicitly unchecked', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMinimalValidLeg(user)

    await user.click(screen.getByLabelText(/staying at the conference hotel/i))
    // Check then uncheck to produce an explicit false, distinct from
    // never having touched it.
    await user.click(screen.getByLabelText(/staying the entire conference/i))
    await user.click(screen.getByLabelText(/staying the entire conference/i))

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    await waitFor(() => expect(mockedCreateRideRequest).toHaveBeenCalled())
    const call = mockedCreateRideRequest.mock.calls[0][0]
    expect(call.data.stayingAtHotel).toBe(true)
    expect(call.data.stayingFullDuration).toBe(false)
  })

  it('resets stayingFullDuration to null when the hotel checkbox is unchecked again', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMinimalValidLeg(user)

    const hotelCheckbox = screen.getByLabelText(
      /staying at the conference hotel/i,
    )
    await user.click(hotelCheckbox)
    await user.click(screen.getByLabelText(/staying the entire conference/i))
    await user.click(hotelCheckbox)

    expect(
      screen.queryByLabelText(/staying the entire conference/i),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /submit ride request/i }),
    )

    await waitFor(() => expect(mockedCreateRideRequest).toHaveBeenCalled())
    const call = mockedCreateRideRequest.mock.calls[0][0]
    expect(call.data.stayingAtHotel).toBeNull()
    expect(call.data.stayingFullDuration).toBeNull()
  })
})

describe('RequestForm edit mode', () => {
  const initialData: RequestFormInitialData = {
    airport: 'DFW',
    arrivalFlight: 'AA100',
    arrivalTime: '2026-09-01T10:00',
    departureFlight: '',
    departureTime: '',
    companionNames: ['Alex Rivera'],
    stayingAtHotel: true,
    stayingFullDuration: false,
  }

  it('prefills fields from initialData and submits an update round-trip', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    renderForm({ mode: 'edit', initialData, onSuccess })

    expect(screen.getByDisplayValue('AA100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alex Rivera')).toBeInTheDocument()
    expect(
      screen.getByLabelText(/staying at the conference hotel/i),
    ).toBeChecked()
    expect(
      screen.getByLabelText(/staying the entire conference/i),
    ).not.toBeChecked()

    const arrivalFlightInput = screen.getByPlaceholderText(/AA100/i)
    await user.clear(arrivalFlightInput)
    await user.type(arrivalFlightInput, 'AA999')

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(mockedUpdateRideRequest).toHaveBeenCalled())
    const call = mockedUpdateRideRequest.mock.calls[0][0]
    expect(call.data.arrivalFlight).toBe('AA999')
    expect(call.data.companionNames).toEqual(['Alex Rivera'])
    expect(mockedCreateRideRequest).not.toHaveBeenCalled()
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderForm({ mode: 'edit', initialData, onCancel })

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('shows the confirmed-driver warning banner only for a confirmed leg being edited', () => {
    renderForm({
      mode: 'edit',
      initialData,
      confirmedLegs: { arrival: true, departure: false },
    })

    const warnings = screen.getAllByRole('alert')
    const driverWarnings = warnings.filter((el) =>
      /driver is already assigned/i.test(el.textContent),
    )
    expect(driverWarnings).toHaveLength(1)
  })

  it('shows no confirmed-driver warning when neither leg is confirmed', () => {
    renderForm({
      mode: 'edit',
      initialData,
      confirmedLegs: { arrival: false, departure: false },
    })

    expect(
      screen.queryByText(/driver is already assigned/i),
    ).not.toBeInTheDocument()
  })
})
