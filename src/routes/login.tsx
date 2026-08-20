import { useState } from 'react'
import { Car, TriangleAlert } from 'lucide-react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { supabaseBrowserClient } from '#/lib/supabase/client'
import { getAuthSession } from '#/lib/auth/server-functions'
import { homeRouteForPerson } from '#/lib/auth/types'
import { DEV_ACCOUNTS, DEV_PASSWORD } from '#/lib/auth/dev-accounts'

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
  const [devSigningInEmail, setDevSigningInEmail] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

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

  const devSignIn = async (email: string) => {
    setDevSigningInEmail(email)
    setError(null)
    const { error: signInError } =
      await supabaseBrowserClient.auth.signInWithPassword({
        email,
        password: DEV_PASSWORD,
      })
    if (signInError) {
      setError(signInError.message)
      setDevSigningInEmail(null)
      return
    }
    await navigate({ to: '/' })
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

      {import.meta.env.DEV && (
        <div className="mt-10 w-full rounded-lg border-2 border-dashed border-amber-500 bg-amber-50 p-4">
          <div className="flex items-center justify-center gap-2 text-amber-800">
            <TriangleAlert className="h-4 w-4" />
            <span className="text-xs font-bold tracking-wide uppercase">
              Dev only — not real auth
            </span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Local development bypass. Never shown in a production build.
          </p>
          <div className="mt-4 grid gap-2">
            {DEV_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => void devSignIn(account.email)}
                disabled={devSigningInEmail !== null}
                className="w-full rounded-md border-2 border-amber-500 bg-white px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                {devSigningInEmail === account.email
                  ? 'Signing in…'
                  : `Dev: sign in as ${account.label}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
