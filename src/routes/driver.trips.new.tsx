import { createFileRoute, useRouter } from '@tanstack/react-router'

import { TripForm } from '#/components/driver/TripForm'

// No beforeLoad here - the /driver layout route already guards the whole
// section.
export const Route = createFileRoute('/driver/trips/new')({
  component: NewTrip,
})

function NewTrip() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold text-ink">New Trip</h1>
      <p className="mt-2 text-muted">
        Set up a trip and we'll help you find riders to add.
      </p>
      <TripForm
        onSuccess={(tripId) =>
          router.navigate({ to: '/driver/trips/$tripId', params: { tripId } })
        }
      />
    </div>
  )
}
