export type PersonRole = 'requester' | 'driver'

export interface Person {
  id: string
  name: string | null
  email: string | null
  role: PersonRole | null
  is_admin: boolean
  avatar_url: string | null
}

export interface AuthSession {
  userId: string
  person: Person
}

// Where a signed-in person lands once they have a role.
export function homeRouteForPerson(
  person: Person,
): '/admin' | '/driver' | '/request' {
  if (person.is_admin) return '/admin'
  if (person.role === 'driver') return '/driver'
  return '/request'
}
