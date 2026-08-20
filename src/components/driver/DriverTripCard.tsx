import { Link } from '@tanstack/react-router'

import type { Trip } from '#/lib/driver/types'

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

export function DriverTripCard({ trip }: { trip: Trip }) {
  return (
    <Link
      to="/driver/trips/$tripId"
      params={{ tripId: trip.id }}
      className="block rounded-lg border border-line p-6 hover:border-blue hover:bg-cloud"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink">
          {trip.airport} — {directionLabel(trip.direction)}
        </h3>
        <span className="text-sm text-muted">
          {formatScheduledTime(trip.scheduledTime)}
        </span>
      </div>
      {trip.riders.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No riders yet.</p>
      ) : (
        <ul className="mt-3 grid gap-1 text-sm text-muted">
          {trip.riders.map((rider) => (
            <li key={rider.rideRequestId}>
              {rider.personName ?? 'Rider'}
              {rider.companionNames.length > 0 &&
                ` (+ ${rider.companionNames.join(', ')})`}
              {rider.flightTime &&
                ` — ${formatScheduledTime(rider.flightTime)}`}
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
