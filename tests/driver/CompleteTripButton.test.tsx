import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { CompleteTripButton } from '#/components/driver/CompleteTripButton'
import { completeTrip } from '#/lib/driver/server-functions'

vi.mock('#/lib/driver/server-functions', () => ({
  completeTrip: vi.fn(),
}))

const mockedCompleteTrip = vi.mocked(completeTrip)

function renderButton(
  overrides: Partial<Parameters<typeof CompleteTripButton>[0]> = {},
) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <CompleteTripButton tripId="trip-1" {...overrides} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockedCompleteTrip.mockReset()
  mockedCompleteTrip.mockResolvedValue(undefined)
})

describe('CompleteTripButton', () => {
  it('calls completeTrip with the trip id and fires onCompleted on success', async () => {
    const user = userEvent.setup()
    const onCompleted = vi.fn()
    renderButton({ onCompleted })

    await user.click(
      screen.getByRole('button', { name: /mark trip complete/i }),
    )

    await waitFor(() => expect(mockedCompleteTrip).toHaveBeenCalled())
    expect(mockedCompleteTrip.mock.calls[0][0]).toEqual({
      data: { tripId: 'trip-1' },
    })
    await waitFor(() => expect(onCompleted).toHaveBeenCalled())
  })
})
