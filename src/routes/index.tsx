import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-4xl font-bold text-ink">CYC Rides</h1>
      <p className="mt-4 text-lg text-muted">
        Landing page content coming in a later prompt.
      </p>
    </div>
  )
}
