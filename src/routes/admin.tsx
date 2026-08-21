import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { requireAdminSession } from '#/lib/auth/route-guards'
import {
  getAdminRideRequests,
  getAdminSummary,
  getAdminTrips,
} from '#/lib/admin/server-functions'
import {
  adminRideRequestsQueryKey,
  adminSummaryQueryKey,
  adminTripsQueryKey,
} from '#/lib/admin/query-keys'
import { SummaryCards } from '#/components/admin/SummaryCards'
import { RideRequestsTable } from '#/components/admin/RideRequestsTable'
import { TripsTable } from '#/components/admin/TripsTable'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => requireAdminSession(),
  component: AdminDashboard,
})

function AdminDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: adminSummaryQueryKey,
    queryFn: () => getAdminSummary(),
  })
  const { data: rideRequests, isLoading: rideRequestsLoading } = useQuery({
    queryKey: adminRideRequestsQueryKey,
    queryFn: () => getAdminRideRequests(),
  })
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: adminTripsQueryKey,
    queryFn: () => getAdminTrips(),
  })

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold text-ink">Admin Dashboard</h1>

      <div className="mt-6">
        {summaryLoading || !summary ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <SummaryCards summary={summary} />
        )}
      </div>

      <div className="mt-10">
        {rideRequestsLoading || !rideRequests ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <RideRequestsTable rows={rideRequests} />
        )}
      </div>

      <div className="mt-10">
        {tripsLoading || !trips ? (
          <p className="text-muted">Loading…</p>
        ) : (
          <TripsTable rows={trips} />
        )}
      </div>
    </div>
  )
}
