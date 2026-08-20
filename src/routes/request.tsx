import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/request')({ component: RequestRide })

function RequestRide() {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold text-ink">Request a Ride</h1>
      <p className="mt-4 text-muted">Requester form coming in a later prompt.</p>
    </div>
  )
}
