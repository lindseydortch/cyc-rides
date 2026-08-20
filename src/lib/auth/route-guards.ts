import { redirect } from '@tanstack/react-router'

import { getAuthSession } from '#/lib/auth/server-functions'
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
