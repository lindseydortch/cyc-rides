import { Car } from 'lucide-react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { getAuthSession } from '#/lib/auth/server-functions'
import { homeRouteForPerson } from '#/lib/auth/types'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getAuthSession()
    if (!session) return
    if (!session.person.role) throw redirect({ to: '/onboarding' })
    throw redirect({ to: homeRouteForPerson(session.person) })
  },
  component: Home,
})

function Home() {
  const navigate = useNavigate()

  return (
    <div>
      <section className="bg-navy px-4 py-24 text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Car className="h-8 w-8 text-white" />
          </span>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">CYC Rides</h1>
          <p className="mt-4 max-w-xl text-lg text-white/80">
            Get a ride to or from DFW or Dallas Love Field for Commit Your Code.
            Sign in to request a ride, or to volunteer as a driver.
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: '/login' })}
            className="mt-8 rounded-md bg-blue px-6 py-3 text-base font-semibold text-white hover:bg-blue-dark"
          >
            Sign in with LinkedIn
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted">
          CYC Rides matches conference attendees who need a ride with fellow
          attendees who are driving. Sign in with your LinkedIn account to get
          started — no separate account or password required.
        </p>
      </section>
    </div>
  )
}
