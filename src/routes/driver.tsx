import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/driver')({ component: DriverDashboard })

function DriverDashboard() {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold text-ink">Driver Dashboard</h1>
      <p className="mt-4 text-muted">Driver dashboard coming in a later prompt.</p>
    </div>
  )
}
