import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { requireOnboardedSession } from '#/lib/auth/route-guards'
import { getMyRideStatus } from '#/lib/rides/server-functions'
import { rideStatusQueryKey } from '#/lib/rides/query-keys'
import { RequestForm } from '#/components/rides/RequestForm'
import type { RequestFormInitialData } from '#/components/rides/RequestForm'
import { StatusCards } from '#/components/rides/StatusCards'
import type { Leg, RideRequestStatus } from '#/lib/rides/types'

export const Route = createFileRoute('/request')({
  beforeLoad: () => requireOnboardedSession(),
  component: RequestRide,
})

// Converts a stored UTC ISO timestamp back into the local
// yyyy-MM-ddTHH:mm value an <input type="datetime-local"> expects. Can't
// use toISOString() here - that's UTC, not the browser's local time, which
// is what the field originally submitted (see RequestForm's handleSubmit).
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toInitialData(status: RideRequestStatus): RequestFormInitialData {
  return {
    airport: status.airport ?? '',
    arrivalFlight: status.arrivalFlight ?? '',
    arrivalTime: toDatetimeLocalValue(status.arrivalTime),
    departureFlight: status.departureFlight ?? '',
    departureTime: toDatetimeLocalValue(status.departureTime),
    companionNames: status.companions.map((c) => c.name ?? ''),
  }
}

function RequestRide() {
  const { data: status, isLoading } = useQuery({
    queryKey: rideStatusQueryKey,
    queryFn: () => getMyRideStatus(),
  })
  const [isEditing, setIsEditing] = useState(false)
  const [focusLeg, setFocusLeg] = useState<Leg | undefined>(undefined)

  function startEdit(leg?: Leg) {
    setFocusLeg(leg)
    setIsEditing(true)
  }

  function stopEdit() {
    setIsEditing(false)
    setFocusLeg(undefined)
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold text-ink">Your Ride</h1>

      {isLoading ? (
        <p className="mt-4 text-muted">Loading…</p>
      ) : status && !isEditing ? (
        <>
          <p className="mt-4 text-muted">
            Here's the status of your ride to and from the airport.
          </p>
          <StatusCards
            status={status}
            onEditRequest={() => startEdit()}
            onAddLeg={(leg) => startEdit(leg)}
          />
        </>
      ) : status && isEditing ? (
        <>
          <p className="mt-4 text-muted">Update your ride request below.</p>
          <RequestForm
            mode="edit"
            initialData={toInitialData(status)}
            confirmedLegs={{
              arrival: status.arrival.confirmed,
              departure: status.departure.confirmed,
            }}
            focusLeg={focusLeg}
            onSuccess={stopEdit}
            onCancel={stopEdit}
          />
        </>
      ) : (
        <>
          <p className="mt-4 text-muted">
            Tell us your flight details and we'll match you with a driver.
          </p>
          <RequestForm />
        </>
      )}
    </div>
  )
}
