import { createFileRoute, redirect } from '@tanstack/react-router'

import { exchangeCodeForSession } from '#/lib/auth/server-functions'

interface CallbackSearch {
  code?: string
}

export const Route = createFileRoute('/auth/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === 'string' ? search.code : undefined,
  }),
  beforeLoad: async ({ search }) => {
    if (search.code) {
      await exchangeCodeForSession({ data: { code: search.code } })
    }
    throw redirect({ to: '/' })
  },
})
