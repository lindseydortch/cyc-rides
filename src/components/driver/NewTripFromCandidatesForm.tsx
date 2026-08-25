import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { createTripAndClaimRiders } from '#/lib/driver/server-functions'
import { directionLabel } from '#/lib/driver/format'
import type { Airport, Leg } from '#/lib/rides/types'

interface NewTripFromCandidatesFormProps {
  airport: Airport
  direction: Leg
  defaultScheduledTime: string
  rideRequestIds: string[]
  onCreated?: (tripId: string) => void
  onCancel?: () => void
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function NewTripFromCandidatesForm({
  airport,
  direction,
  defaultScheduledTime,
  rideRequestIds,
  onCreated,
  onCancel,
}: NewTripFromCandidatesFormProps) {
  const [scheduledTime, setScheduledTime] = useState(() =>
    toDatetimeLocalValue(defaultScheduledTime),
  )

  const mutation = useMutation({
    mutationFn: createTripAndClaimRiders,
    onSuccess: (result) => {
      onCreated?.(result.id)
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledTime) return
    mutation.mutate({
      data: {
        airport,
        direction,
        scheduledTime: new Date(scheduledTime).toISOString(),
        rideRequestIds,
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-md border border-line bg-cloud p-4"
    >
      <div className="grid gap-1 text-sm text-ink">
        <span className="font-medium">Airport</span>
        <span className="text-muted">{airport}</span>
      </div>

      <div className="grid gap-1 text-sm text-ink">
        <span className="font-medium">Direction</span>
        <span className="text-muted">{directionLabel(direction)}</span>
      </div>

      <label className="grid gap-1 text-sm font-medium text-ink">
        Scheduled time
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-ink"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!scheduledTime || mutation.isPending}
          className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating…' : 'Create trip & claim riders'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-cloud"
          >
            Cancel
          </button>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Something went wrong creating the trip. Please try again.
        </p>
      )}
    </form>
  )
}
