import { createFileRoute } from '@tanstack/react-router'

import { requireOnboardedSession } from '#/lib/auth/route-guards'

export const Route = createFileRoute('/admin')({
  beforeLoad: () => requireOnboardedSession(),
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold text-ink">Admin Dashboard</h1>
      <p className="mt-4 text-muted">
        Admin dashboard coming in a later prompt.
      </p>
    </div>
  )
}
