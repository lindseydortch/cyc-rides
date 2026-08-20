// Shared between scripts/seed-dev-users.ts and the /login dev sign-in
// bypass (Prompt #3.5), so both sides agree on which accounts/password
// exist. Dev-only fixture data — not used by the real LinkedIn auth path.
export const DEV_PASSWORD = 'dev-password-123!'

export interface DevAccountSpec {
  email: string
  label: string
  name: string
  role: 'requester' | 'driver'
  isAdmin: boolean
  driver?: {
    vehicleMakeModel: string
    licensePlate: string
    passengerCapacity: number
    luggageCapacity: number
  }
}

export const DEV_ACCOUNTS: DevAccountSpec[] = [
  {
    email: 'dev-requester@example.com',
    label: 'Requester',
    name: 'Dev Requester',
    role: 'requester',
    isAdmin: false,
  },
  {
    email: 'dev-driver@example.com',
    label: 'Driver',
    name: 'Dev Driver',
    role: 'driver',
    isAdmin: false,
    driver: {
      vehicleMakeModel: 'Honda CR-V',
      licensePlate: 'DEV-0001',
      passengerCapacity: 4,
      luggageCapacity: 3,
    },
  },
  {
    email: 'dev-admin@example.com',
    label: 'Admin',
    name: 'Dev Admin',
    role: 'driver',
    isAdmin: true,
    driver: {
      vehicleMakeModel: 'Toyota Sienna',
      licensePlate: 'DEV-0002',
      passengerCapacity: 6,
      luggageCapacity: 5,
    },
  },
]
