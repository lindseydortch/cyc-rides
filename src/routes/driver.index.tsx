import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  getMyDriverTrips,
  getUnclaimedCandidates,
} from '#/lib/driver/server-functions'
import {
  driverTripsQueryKey,
  unclaimedCandidatesQueryKey,
} from '#/lib/driver/query-keys'
import { DriverTripCard } from '#/components/driver/DriverTripCard'
import { RidersNeedingPickup } from '#/components/driver/RidersNeedingPickup'

export const Route = createFileRoute('/driver/')({
  component: DriverDashboard,
})

function DriverDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: driverTripsQueryKey,
    queryFn: () => getMyDriverTrips(),
  })

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: unclaimedCandidatesQueryKey,
    queryFn: () => getUnclaimedCandidates(),
  })

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Driver Dashboard</h1>
        <Link
          to="/driver/trips/new"
          className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-cloud"
        >
          + New trip (no riders yet)
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Your trips</h2>
        {isLoading ? (
          <p className="mt-4 text-muted">Loading…</p>
        ) : !data ? (
          <p className="mt-4 text-muted">
            We couldn't find your driver profile. Contact an organizer.
          </p>
        ) : data.trips.length === 0 ? (
          <p className="mt-4 text-muted">No trips yet.</p>
        ) : (
          <div className="mt-4 grid gap-4">
            {data.trips.map((trip) => (
              <DriverTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>

      {candidatesLoading ? (
        <p className="mt-10 text-muted">Loading riders…</p>
      ) : (
        <RidersNeedingPickup
          candidates={candidates ?? []}
          trips={data?.trips ?? []}
        />
      )}
    </div>
  )
}
