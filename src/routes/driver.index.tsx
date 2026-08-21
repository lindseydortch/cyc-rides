import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { getMyDriverTrips } from '#/lib/driver/server-functions'
import { driverTripsQueryKey } from '#/lib/driver/query-keys'
import { DriverTripCard } from '#/components/driver/DriverTripCard'

export const Route = createFileRoute('/driver/')({
  component: DriverDashboard,
})

function DriverDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: driverTripsQueryKey,
    queryFn: () => getMyDriverTrips(),
  })

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Driver Dashboard</h1>
        <Link
          to="/driver/trips/new"
          className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark"
        >
          + New trip
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-4 text-muted">Loading…</p>
      ) : !data ? (
        <p className="mt-4 text-muted">
          We couldn't find your driver profile. Contact an organizer.
        </p>
      ) : data.trips.length === 0 ? (
        <p className="mt-4 text-muted">No trips yet.</p>
      ) : (
        <div className="mt-8 grid gap-4">
          {data.trips.map((trip) => (
            <DriverTripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  )
}
