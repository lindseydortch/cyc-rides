import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { TripForm } from '#/components/driver/TripForm'
import { createTrip } from '#/lib/driver/server-functions'

vi.mock('#/lib/driver/server-functions', () => ({
  createTrip: vi.fn(),
}))

const mockedCreateTrip = vi.mocked(createTrip)

function renderForm(props: Parameters<typeof TripForm>[0] = {}) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <TripForm {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedCreateTrip.mockReset()
  mockedCreateTrip.mockResolvedValue({ id: 'new-trip-id' })
})

describe('TripForm', () => {
  it('requires airport, direction, and a scheduled time before submitting', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /create trip/i }))

    expect(screen.getByText('Select an airport.')).toBeInTheDocument()
    expect(screen.getByText('Select arrival or departure.')).toBeInTheDocument()
    expect(screen.getByText('Enter a date and time.')).toBeInTheDocument()
    expect(mockedCreateTrip).not.toHaveBeenCalled()
  })

  it('submits airport/direction/scheduledTime as ISO and calls onSuccess with the new trip id', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    renderForm({ onSuccess })

    await user.selectOptions(screen.getByLabelText(/airport/i), 'DAL')
    await user.selectOptions(screen.getByLabelText(/direction/i), 'departure')
    await user.type(
      screen.getByLabelText(/scheduled time/i),
      '2026-09-01T10:00',
    )

    await user.click(screen.getByRole('button', { name: /create trip/i }))

    await waitFor(() => expect(mockedCreateTrip).toHaveBeenCalled())
    const call = mockedCreateTrip.mock.calls[0][0]
    expect(call.data.airport).toBe('DAL')
    expect(call.data.direction).toBe('departure')
    expect(call.data.scheduledTime).toBe(
      new Date('2026-09-01T10:00').toISOString(),
    )

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('new-trip-id'))
  })
})
