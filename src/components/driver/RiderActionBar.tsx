import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { addTripRiders } from '#/lib/driver/server-functions'
import {
  driverTripsQueryKey,
  unclaimedCandidatesQueryKey,
} from '#/lib/driver/query-keys'
import { formatDateTime } from '#/lib/driver/format'
import { NewTripFromCandidatesForm } from '#/components/driver/NewTripFromCandidatesForm'
import type { Trip, UnclaimedCandidate } from '#/lib/driver/types'

interface RiderActionBarProps {
  selected: UnclaimedCandidate[]
  trips: Trip[]
  onClaimed?: () => void
}

function earliestFlightTime(candidates: UnclaimedCandidate[]): string {
  const times = candidates
    .map((c) => c.flightTime)
    .filter((t): t is string => t !== null)
  if (times.length === 0) return new Date().toISOString()
  return times.reduce((earliest, t) => (t < earliest ? t : earliest))
}

export function RiderActionBar({
  selected,
  trips,
  onClaimed,
}: RiderActionBarProps) {
  const queryClient = useQueryClient()
  const [showNewTripForm, setShowNewTripForm] = useState(false)

  const addMutation = useMutation({
    mutationFn: addTripRiders,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: driverTripsQueryKey })
      await queryClient.invalidateQueries({
        queryKey: unclaimedCandidatesQueryKey,
      })
      onClaimed?.()
    },
  })

  if (selected.length === 0) return null

  const airport = selected[0].airport
  const direction = selected[0].direction
  const rideRequestIds = selected.map((c) => c.rideRequestId)

  const matchingTrips = trips.filter(
    (t) => t.airport === airport && t.direction === direction,
  )

  function handleCreated() {
    void queryClient.invalidateQueries({ queryKey: driverTripsQueryKey })
    void queryClient.invalidateQueries({
      queryKey: unclaimedCandidatesQueryKey,
    })
    setShowNewTripForm(false)
    onClaimed?.()
  }

  return (
    <div className="sticky bottom-4 mt-4 grid gap-4 rounded-lg border border-line bg-background p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">
          {selected.length} rider{selected.length === 1 ? '' : 's'} selected
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {matchingTrips.map((trip) => (
            <button
              key={trip.id}
              type="button"
              disabled={addMutation.isPending}
              onClick={() =>
                addMutation.mutate({
                  data: { tripId: trip.id, rideRequestIds },
                })
              }
              className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-cloud disabled:opacity-60"
            >
              Add to trip at {formatDateTime(trip.scheduledTime)}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setShowNewTripForm((v) => !v)}
            className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark"
          >
            + New trip
          </button>
        </div>
      </div>

      {addMutation.isError && (
        <p className="text-sm text-red-600">
          Something went wrong adding riders to that trip. Please try again.
        </p>
      )}

      {showNewTripForm && airport && (
        <NewTripFromCandidatesForm
          airport={airport}
          direction={direction}
          defaultScheduledTime={earliestFlightTime(selected)}
          rideRequestIds={rideRequestIds}
          onCreated={handleCreated}
          onCancel={() => setShowNewTripForm(false)}
        />
      )}
    </div>
  )
}
