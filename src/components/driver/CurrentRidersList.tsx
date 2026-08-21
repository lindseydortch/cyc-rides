import { RemoveTripRiderButton } from '#/components/driver/RemoveTripRiderButton'
import { hotelStayBadge } from '#/lib/hotel-stay'
import type { TripRider } from '#/lib/driver/types'

function formatFlightTime(flightTime: string | null): string {
  if (!flightTime) return ''
  return new Date(flightTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

interface CurrentRidersListProps {
  tripId: string
  riders: TripRider[]
  onRemoved?: () => void
}

export function CurrentRidersList({
  tripId,
  riders,
  onRemoved,
}: CurrentRidersListProps) {
  if (riders.length === 0) {
    return <p className="mt-2 text-sm text-muted">No riders added yet.</p>
  }

  return (
    <ul className="mt-2 grid gap-2">
      {riders.map((rider) => {
        const badge = hotelStayBadge(
          rider.stayingAtHotel,
          rider.stayingFullDuration,
        )
        return (
          <li
            key={rider.rideRequestId}
            className="flex items-center justify-between gap-3 rounded-md border border-line p-3 text-sm text-ink"
          >
            <span className="flex items-center gap-2">
              {rider.personName ?? 'Rider'}
              {rider.companionNames.length > 0 &&
                ` (+ ${rider.companionNames.join(', ')})`}
              {rider.flightTime && ` — ${formatFlightTime(rider.flightTime)}`}
              {badge && (
                <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-medium text-muted">
                  {badge}
                </span>
              )}
            </span>
            <RemoveTripRiderButton
              tripId={tripId}
              rideRequestId={rider.rideRequestId}
              onRemoved={onRemoved}
            />
          </li>
        )
      })}
    </ul>
  )
}
