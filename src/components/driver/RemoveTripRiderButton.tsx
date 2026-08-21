import { useMutation } from '@tanstack/react-query'

import { removeTripRider } from '#/lib/driver/server-functions'

interface RemoveTripRiderButtonProps {
  tripId: string
  rideRequestId: string
  onRemoved?: () => void
}

export function RemoveTripRiderButton({
  tripId,
  rideRequestId,
  onRemoved,
}: RemoveTripRiderButtonProps) {
  const mutation = useMutation({
    mutationFn: removeTripRider,
    onSuccess: () => {
      onRemoved?.()
    },
  })

  return (
    <div>
      <button
        type="button"
        onClick={() => mutation.mutate({ data: { tripId, rideRequestId } })}
        disabled={mutation.isPending}
        className="rounded-md border border-line px-3 py-1 text-xs font-medium text-ink hover:bg-cloud disabled:opacity-60"
      >
        {mutation.isPending ? 'Removing…' : 'Remove'}
      </button>
      {mutation.isError && (
        <p className="mt-1 text-xs text-red-600">
          Couldn't remove this rider. Please try again.
        </p>
      )}
    </div>
  )
}
