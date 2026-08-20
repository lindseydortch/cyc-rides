import { Car, LogOut } from 'lucide-react'
import { Link } from '@tanstack/react-router'

// Placeholder until real auth lands (Prompt 3) — swap for session data then.
const placeholderUser = {
  name: 'Guest User',
  initials: 'GU',
}

const navLinks = [
  { to: '/request', label: 'Request a Ride' },
  { to: '/driver', label: 'Driver' },
  { to: '/admin', label: 'Admin' },
] as const

export function Nav() {
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
          {navLinks.map((link) => (
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
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cloud text-sm font-medium text-ink">
            {placeholderUser.initials}
          </span>
          <span className="hidden text-sm font-medium text-ink sm:inline">
            {placeholderUser.name}
          </span>
          <button
            type="button"
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
