import { Car, LogOut } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'

import { useAuth } from '../lib/auth/auth-context'
import { homeRouteForPerson } from '../lib/auth/types'

// Routes that show their own header/CTA instead of the app nav — public
// landing, auth, and onboarding aren't a signed-in role's dashboard yet.
const NO_NAV_ROUTES = ['/', '/login', '/auth/callback', '/onboarding']

function initials(name: string | null) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { session, signOut } = useAuth()

  if (NO_NAV_ROUTES.includes(pathname) || !session) return null

  const { person } = session
  const links = [{ to: homeRouteForPerson(person), label: 'Home' }] as const

  return (
    <header className="border-b border-line bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cloud">
            <Car className="h-5 w-5 text-blue" />
          </span>
          <span className="text-lg font-semibold">CYC Rides</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted hover:text-ink"
              activeProps={{ className: 'text-ink' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {person.avatar_url ? (
            <img
              src={person.avatar_url}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cloud text-sm font-medium text-ink">
              {initials(person.name)}
            </span>
          )}
          <span className="hidden text-sm font-medium text-ink sm:inline">
            {person.name ?? person.email}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-muted hover:bg-cloud hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
