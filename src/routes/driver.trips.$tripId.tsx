import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { getTripDetail } from '#/lib/driver/server-functions'
import {
  driverTripDetailQueryKey,
  driverTripsQueryKey,
} from '#/lib/driver/query-keys'
import { AddRidersForm } from '#/components/driver/AddRidersForm'
import { CompleteTripButton } from '#/components/driver/CompleteTripButton'

// No beforeLoad here - the /driver layout route already guards the whole
// section.
export const Route = createFileRoute('/driver/trips/$tripId')({
  component: TripDetailPage,
})

function directionLabel(direction: string): string {
  return direction === 'arrival' ? 'Arrival' : 'Departure'
}

function formatScheduledTime(scheduledTime: string | null): string {
  if (!scheduledTime) return 'Time to be confirmed'
  return new Date(scheduledTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function TripDetailPage() {
  const { tripId } = Route.useParams()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: driverTripDetailQueryKey(tripId),
    queryFn: () => getTripDetail({ data: { tripId } }),
  })

  function refresh() {
    void queryClient.invalidateQueries({
      queryKey: driverTripDetailQueryKey(tripId),
    })
    void queryClient.invalidateQueries({ queryKey: driverTripsQueryKey })
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const { trip, capacity, candidates } = data

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ink">
            {trip.airport} — {directionLabel(trip.direction)}
          </h1>
          <p className="mt-1 text-muted">
            {formatScheduledTime(trip.scheduledTime)}
          </p>
        </div>
        {trip.status === 'open' ? (
          <CompleteTripButton tripId={tripId} onCompleted={refresh} />
        ) : (
          <span className="rounded-full bg-green/10 px-3 py-1 text-sm font-medium text-green">
            Completed
          </span>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Current riders</h2>
        {trip.riders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No riders added yet.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {trip.riders.map((rider) => (
              <li
                key={rider.rideRequestId}
                className="rounded-md border border-line p-3 text-sm text-ink"
              >
                {rider.personName ?? 'Rider'}
                {rider.companionNames.length > 0 &&
                  ` (+ ${rider.companionNames.join(', ')})`}
                {rider.flightTime &&
                  ` — ${formatScheduledTime(rider.flightTime)}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {trip.status === 'open' && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-ink">Add riders</h2>
          <AddRidersForm
            tripId={tripId}
            candidates={candidates}
            capacity={capacity}
            onAdded={refresh}
          />
        </section>
      )}
    </div>
  )
}
