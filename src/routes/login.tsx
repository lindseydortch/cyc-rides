import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({ component: Login })

function Login() {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-3xl font-bold text-ink">Log in</h1>
      <p className="mt-4 text-muted">Auth flow coming in a later prompt.</p>
    </div>
  )
}
