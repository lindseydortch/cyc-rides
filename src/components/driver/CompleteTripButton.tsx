import { useMutation } from '@tanstack/react-query'

import { completeTrip } from '#/lib/driver/server-functions'

interface CompleteTripButtonProps {
  tripId: string
  onCompleted?: () => void
}

export function CompleteTripButton({
  tripId,
  onCompleted,
}: CompleteTripButtonProps) {
  const mutation = useMutation({
    mutationFn: completeTrip,
    onSuccess: () => {
      onCompleted?.()
    },
  })

  return (
    <div>
      <button
        type="button"
        onClick={() => mutation.mutate({ data: { tripId } })}
        disabled={mutation.isPending}
        className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-cloud disabled:opacity-60"
      >
        {mutation.isPending ? 'Marking complete…' : 'Mark trip complete'}
      </button>
      {mutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          Something went wrong marking the trip complete. Please try again.
        </p>
      )}
    </div>
  )
}
