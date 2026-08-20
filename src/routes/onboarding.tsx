import { useState } from 'react'
import { Car, UserRound } from 'lucide-react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { requireSession } from '#/lib/auth/route-guards'
import { authSessionQueryKey } from '#/lib/auth/auth-context'
import { completeOnboarding } from '#/lib/auth/server-functions'
import { homeRouteForPerson } from '#/lib/auth/types'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const session = await requireSession()
    if (session.person.role) {
      throw redirect({ to: homeRouteForPerson(session.person) })
    }
  },
  component: Onboarding,
})

type Choice = 'requester' | 'driver' | null

function Onboarding() {
  const [choice, setChoice] = useState<Choice>(null)
  const [vehicleMakeModel, setVehicleMakeModel] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [passengerCapacity, setPassengerCapacity] = useState('')
  const [luggageCapacity, setLuggageCapacity] = useState('')
  const queryClient = useQueryClient()
  const router = useRouter()

  const mutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authSessionQueryKey })
      await router.invalidate()
      await router.navigate({
        to: choice === 'driver' ? '/driver' : '/request',
      })
    },
  })

  const submitRequester = () => {
    mutation.mutate({ data: { role: 'requester' } })
  }

  const submitDriver = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      data: {
        role: 'driver',
        vehicleMakeModel,
        licensePlate,
        passengerCapacity: Number(passengerCapacity),
        luggageCapacity: Number(luggageCapacity),
      },
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold text-ink">Welcome to CYC Rides</h1>
      <p className="mt-2 text-muted">
        First, tell us how you'll be using CYC Rides.
      </p>

      {choice === null && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setChoice('requester')}
            className="flex flex-col items-center gap-3 rounded-lg border border-line p-8 text-center hover:border-blue hover:bg-cloud"
          >
            <UserRound className="h-8 w-8 text-blue" />
            <span className="text-lg font-semibold text-ink">
              I need a ride
            </span>
            <span className="text-sm text-muted">
              Request a ride to or from the airport.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setChoice('driver')}
            className="flex flex-col items-center gap-3 rounded-lg border border-line p-8 text-center hover:border-blue hover:bg-cloud"
          >
            <Car className="h-8 w-8 text-blue" />
            <span className="text-lg font-semibold text-ink">I can drive</span>
            <span className="text-sm text-muted">
              Volunteer to give rides during the conference.
            </span>
          </button>
        </div>
      )}

      {choice === 'requester' && (
        <div className="mt-8 rounded-lg border border-line p-8">
          <p className="text-ink">
            Great — we'll take you to the ride request form next.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-cloud"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submitRequester}
              disabled={mutation.isPending}
              className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {choice === 'driver' && (
        <form
          onSubmit={submitDriver}
          className="mt-8 rounded-lg border border-line p-8"
        >
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-ink">
              Vehicle make &amp; model
              <input
                required
                value={vehicleMakeModel}
                onChange={(e) => setVehicleMakeModel(e.target.value)}
                className="rounded-md border border-line px-3 py-2 text-ink"
                placeholder="Honda CR-V"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-ink">
              License plate
              <input
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                className="rounded-md border border-line px-3 py-2 text-ink"
                placeholder="ABC-1234"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-ink">
              Passenger capacity
              <input
                required
                type="number"
                min={1}
                value={passengerCapacity}
                onChange={(e) => setPassengerCapacity(e.target.value)}
                className="rounded-md border border-line px-3 py-2 text-ink"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-ink">
              Luggage capacity
              <input
                required
                type="number"
                min={0}
                value={luggageCapacity}
                onChange={(e) => setLuggageCapacity(e.target.value)}
                className="rounded-md border border-line px-3 py-2 text-ink"
              />
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setChoice(null)}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-cloud"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </form>
      )}

      {mutation.isError && (
        <p className="mt-4 text-sm text-red-600">
          Something went wrong saving your choice. Please try again.
        </p>
      )}
    </div>
  )
}
