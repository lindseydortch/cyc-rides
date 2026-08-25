import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { addTripRiders } from '#/lib/driver/server-functions'
import {
  driverTripDetailQueryKey,
  driverTripsQueryKey,
} from '#/lib/driver/query-keys'
import type { DriverCapacity, RideCandidate } from '#/lib/driver/types'
import { hotelStayBadge } from '#/lib/hotel-stay'

interface AddRidersFormProps {
  tripId: string
  candidates: RideCandidate[]
  capacity: DriverCapacity
  onAdded?: () => void
}

function formatFlightTime(flightTime: string | null): string {
  if (!flightTime) return 'Time unknown'
  return new Date(flightTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function AddRidersForm({
  tripId,
  candidates,
  capacity,
  onAdded,
}: AddRidersFormProps) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const selectedPartySize = candidates
    .filter((c) => selected.has(c.rideRequestId))
    .reduce((sum, c) => sum + c.partySize, 0)

  const mutation = useMutation({
    mutationFn: addTripRiders,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: driverTripDetailQueryKey(tripId),
      })
      await queryClient.invalidateQueries({ queryKey: driverTripsQueryKey })
      setSelected(new Set())
      onAdded?.()
    },
  })

  function toggle(rideRequestId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rideRequestId)) next.delete(rideRequestId)
      else next.add(rideRequestId)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) return
    mutation.mutate({ data: { tripId, rideRequestIds: Array.from(selected) } })
  }

  if (candidates.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        No unclaimed ride requests match this trip's airport, direction, and
        time window.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
      <p className="text-sm text-muted">
        {selectedPartySize} / {capacity.passengerCapacity ?? '—'} passengers
        selected · luggage capacity {capacity.luggageCapacity ?? '—'}
      </p>

      <ul className="grid gap-2">
        {candidates.map((candidate) => {
          const badge = hotelStayBadge(
            candidate.stayingAtHotel,
            candidate.stayingFullDuration,
          )
          return (
            <li key={candidate.rideRequestId}>
              <label className="flex items-center gap-3 rounded-md border border-line p-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={selected.has(candidate.rideRequestId)}
                  onChange={() => toggle(candidate.rideRequestId)}
                />
                <span className="flex-1">
                  {candidate.personName ?? 'Rider'} —{' '}
                  {candidate.flight ?? 'No flight #'} ·{' '}
                  {formatFlightTime(candidate.flightTime)} · party of{' '}
                  {candidate.partySize}
                </span>
                {badge && (
                  <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-medium text-muted">
                    {badge}
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>

      <button
        type="submit"
        disabled={selected.size === 0 || mutation.isPending}
        className="justify-self-start rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
      >
        {mutation.isPending
          ? 'Adding…'
          : `Add selected riders (${selected.size})`}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Something went wrong adding riders. Please try again.
        </p>
      )}
    </form>
  )
}
