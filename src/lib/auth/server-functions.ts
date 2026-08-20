import { createServerFn } from '@tanstack/react-start'

import { getSupabaseServerClient } from '#/lib/supabase/server'
import type { AuthSession, PersonRole } from '#/lib/auth/types'

// Reads the current request's session (from cookies) and the matching
// `people` row. Returns null if there's no signed-in user. Used by route
// beforeLoad guards (SSR-safe) and by the client-side auth query.
export const getAuthSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthSession | null> => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: person, error } = await supabase
      .from('people')
      .select('id, name, email, role, is_admin, avatar_url')
      .eq('id', user.id)
      .single()

    if (error) return null

    return { userId: user.id, person }
  },
)

export const exchangeCodeForSession = createServerFn({ method: 'POST' })
  .validator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(data.code)
  })

export const signOutServer = createServerFn({ method: 'POST' }).handler(
  async () => {
    const supabase = getSupabaseServerClient()
    await supabase.auth.signOut()
  },
)

interface OnboardAsRequesterInput {
  role: 'requester'
}

interface OnboardAsDriverInput {
  role: 'driver'
  vehicleMakeModel: string
  licensePlate: string
  passengerCapacity: number
  luggageCapacity: number
}

type CompleteOnboardingInput = OnboardAsRequesterInput | OnboardAsDriverInput

export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator((data: CompleteOnboardingInput) => data)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not signed in')
    }

    const role: PersonRole = data.role
    const { error: roleError } = await supabase
      .from('people')
      .update({ role })
      .eq('id', user.id)

    if (roleError) throw roleError

    if (data.role === 'driver') {
      const { error: driverError } = await supabase.from('drivers').insert({
        person_id: user.id,
        vehicle_make_model: data.vehicleMakeModel,
        license_plate: data.licensePlate,
        passenger_capacity: data.passengerCapacity,
        luggage_capacity: data.luggageCapacity,
      })

      if (driverError) throw driverError
    }
  })
