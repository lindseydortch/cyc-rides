import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireDriverSession } from '#/lib/auth/route-guards'

// Pathless layout for /driver and its sub-routes (trips/new,
// trips/$tripId) - the guard lives here so it runs once for the whole
// section, and each child route renders through the Outlet below. The
// dashboard itself lives in driver.index.tsx (the '/driver' index child),
// not in this file.
export const Route = createFileRoute('/driver')({
  beforeLoad: () => requireDriverSession(),
  component: () => <Outlet />,
})
