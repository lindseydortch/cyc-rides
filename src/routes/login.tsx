import { useState } from 'react'
import { Car } from 'lucide-react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { supabaseBrowserClient } from '#/lib/supabase/client'
import { getAuthSession } from '#/lib/auth/server-functions'
import { homeRouteForPerson } from '#/lib/auth/types'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getAuthSession()
    if (!session) return
    if (!session.person.role) throw redirect({ to: '/onboarding' })
    throw redirect({ to: homeRouteForPerson(session.person) })
  },
  component: Login,
})

function Login() {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    setIsSigningIn(true)
    setError(null)
    const { error: signInError } =
      await supabaseBrowserClient.auth.signInWithOAuth({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    if (signInError) {
      setError(signInError.message)
      setIsSigningIn(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-cloud">
        <Car className="h-7 w-7 text-blue" />
      </span>
      <h1 className="mt-6 text-3xl font-bold text-ink">Sign in to CYC Rides</h1>
      <p className="mt-2 text-muted">
        Use your LinkedIn account — no separate password needed.
      </p>

      <button
        type="button"
        onClick={() => void signIn()}
        disabled={isSigningIn}
        className="mt-8 w-full rounded-md bg-blue px-6 py-3 text-base font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
      >
        {isSigningIn ? 'Redirecting to LinkedIn…' : 'Sign in with LinkedIn'}
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  )
}
