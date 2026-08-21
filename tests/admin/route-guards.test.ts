import { describe, expect, it, vi } from 'vitest'

import { requireAdminSession } from '#/lib/auth/route-guards'
import { getAuthSession } from '#/lib/auth/server-functions'
import type { AuthSession } from '#/lib/auth/types'

vi.mock('#/lib/auth/server-functions', () => ({
  getAuthSession: vi.fn(),
}))

const mockedGetAuthSession = vi.mocked(getAuthSession)

function makeSession(
  overrides: Partial<AuthSession['person']> = {},
): AuthSession {
  return {
    userId: 'user-1',
    person: {
      id: 'user-1',
      name: 'Test Person',
      email: 'test@example.com',
      role: 'requester',
      is_admin: false,
      avatar_url: null,
      ...overrides,
    },
  }
}

describe('requireAdminSession', () => {
  it('redirects a non-admin, onboarded requester to their own home route', async () => {
    mockedGetAuthSession.mockResolvedValue(makeSession({ role: 'requester' }))

    await expect(requireAdminSession()).rejects.toMatchObject({
      options: { to: '/request' },
    })
  })

  it('redirects a non-admin driver to their own home route', async () => {
    mockedGetAuthSession.mockResolvedValue(makeSession({ role: 'driver' }))

    await expect(requireAdminSession()).rejects.toMatchObject({
      options: { to: '/driver' },
    })
  })

  it('redirects an unauthenticated visitor to /login', async () => {
    mockedGetAuthSession.mockResolvedValue(null)

    await expect(requireAdminSession()).rejects.toMatchObject({
      options: { to: '/login' },
    })
  })

  it('returns the session for an admin', async () => {
    const session = makeSession({ role: 'driver', is_admin: true })
    mockedGetAuthSession.mockResolvedValue(session)

    await expect(requireAdminSession()).resolves.toEqual(session)
  })
})
