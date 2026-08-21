import type { Leg, LegStatus, RideRequestStatus } from '#/lib/rides/types'

function formatScheduledTime(scheduledTime: string | null): string {
  if (!scheduledTime) return 'Time to be confirmed'
  return new Date(scheduledTime).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function LegCard({
  title,
  leg,
  onAddLeg,
}: {
  title: string
  leg: LegStatus
  onAddLeg: () => void
}) {
  return (
    <div className="rounded-lg border border-line p-6">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>

      {leg.confirmed ? (
        <>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-green/10 px-3 py-1 text-sm font-medium text-green">
            Ride confirmed
          </p>
          <p className="mt-3 text-sm text-muted">
            Scheduled: {formatScheduledTime(leg.scheduledTime)}
          </p>
          {leg.tripMates.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink">Riding with:</p>
              <ul className="mt-1 list-inside list-disc text-sm text-muted">
                {leg.tripMates.map((mate) => (
                  <li key={mate.rideRequestId}>
                    {mate.personName ?? 'Rider'}
                    {mate.companionNames.length > 0 &&
                      ` (+ ${mate.companionNames.join(', ')})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : leg.requested ? (
        <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-cloud px-3 py-1 text-sm font-medium text-muted">
          Still needs a ride
        </p>
      ) : (
        <>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-cloud px-3 py-1 text-sm font-medium text-muted">
            Not requested
          </p>
          <button
            type="button"
            onClick={onAddLeg}
            className="mt-3 block text-sm font-medium text-blue hover:underline"
          >
            + Add this leg
          </button>
        </>
      )}
    </div>
  )
}

function hotelStayLabel(
  stayingAtHotel: boolean | null,
  stayingFullDuration: boolean | null,
): string | null {
  if (!stayingAtHotel) return null
  return stayingFullDuration
    ? 'Staying at the conference hotel'
    : 'Staying at the conference hotel (partial stay)'
}

export function StatusCards({
  status,
  onEditRequest,
  onAddLeg,
}: {
  status: RideRequestStatus
  onEditRequest: () => void
  onAddLeg: (leg: Leg) => void
}) {
  const hotelStay = hotelStayLabel(
    status.stayingAtHotel,
    status.stayingFullDuration,
  )

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        {hotelStay ? (
          <p className="text-sm text-muted">{hotelStay}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onEditRequest}
          className="rounded-md border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-cloud"
        >
          Edit request
        </button>
      </div>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <LegCard
          title="Arrival"
          leg={status.arrival}
          onAddLeg={() => onAddLeg('arrival')}
        />
        <LegCard
          title="Departure"
          leg={status.departure}
          onAddLeg={() => onAddLeg('departure')}
        />
      </div>
    </div>
  )
}
