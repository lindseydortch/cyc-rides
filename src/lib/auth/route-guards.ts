import { redirect } from '@tanstack/react-router'

import { getAuthSession } from '#/lib/auth/server-functions'
import { homeRouteForPerson } from '#/lib/auth/types'
import type { AuthSession } from '#/lib/auth/types'

// Redirects unauthenticated visitors to /login. Use in a protected route's
// beforeLoad.
export async function requireSession(): Promise<AuthSession> {
  const session = await getAuthSession()
  if (!session) {
    throw redirect({ to: '/login' })
  }
  return session
}

// Same as requireSession, but also redirects anyone who hasn't picked a
// role yet to /onboarding.
export async function requireOnboardedSession(): Promise<AuthSession> {
  const session = await requireSession()
  if (!session.person.role) {
    throw redirect({ to: '/onboarding' })
  }
  return session
}

// Same as requireOnboardedSession, but also redirects anyone whose role
// isn't 'driver' (and who isn't an admin) back to their own home route. Use
// in beforeLoad for /driver and its sub-routes.
export async function requireDriverSession(): Promise<AuthSession> {
  const session = await requireOnboardedSession()
  if (session.person.role !== 'driver' && !session.person.is_admin) {
    throw redirect({ to: homeRouteForPerson(session.person) })
  }
  return session
}
