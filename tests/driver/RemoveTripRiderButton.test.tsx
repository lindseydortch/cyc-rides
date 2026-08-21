import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { RemoveTripRiderButton } from '#/components/driver/RemoveTripRiderButton'
import { removeTripRider } from '#/lib/driver/server-functions'

vi.mock('#/lib/driver/server-functions', () => ({
  removeTripRider: vi.fn(),
}))

const mockedRemoveTripRider = vi.mocked(removeTripRider)

function renderButton(
  overrides: Partial<Parameters<typeof RemoveTripRiderButton>[0]> = {},
) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <RemoveTripRiderButton
        tripId="trip-1"
        rideRequestId="rr-1"
        {...overrides}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedRemoveTripRider.mockReset()
  mockedRemoveTripRider.mockResolvedValue(undefined)
})

describe('RemoveTripRiderButton', () => {
  it('calls removeTripRider with the trip and ride request ids and fires onRemoved on success', async () => {
    const user = userEvent.setup()
    const onRemoved = vi.fn()
    renderButton({ onRemoved })

    await user.click(screen.getByRole('button', { name: /remove/i }))

    await waitFor(() => expect(mockedRemoveTripRider).toHaveBeenCalled())
    expect(mockedRemoveTripRider.mock.calls[0][0]).toEqual({
      data: { tripId: 'trip-1', rideRequestId: 'rr-1' },
    })
    await waitFor(() => expect(onRemoved).toHaveBeenCalled())
  })
})
