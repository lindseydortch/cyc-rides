import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'

import { createTrip } from '#/lib/driver/server-functions'
import type { Airport, Leg } from '#/lib/rides/types'

interface TripFormProps {
  onSuccess?: (tripId: string) => void
}

interface FormErrors {
  airport?: string
  direction?: string
  scheduledTime?: string
}

export function TripForm({ onSuccess }: TripFormProps) {
  const [airport, setAirport] = useState<Airport | ''>('')
  const [direction, setDirection] = useState<Leg | ''>('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  const mutation = useMutation({
    mutationFn: createTrip,
    onSuccess: (result) => {
      onSuccess?.(result.id)
    },
  })

  function validate(): boolean {
    const nextErrors: FormErrors = {}
    if (!airport) nextErrors.airport = 'Select an airport.'
    if (!direction) nextErrors.direction = 'Select arrival or departure.'
    if (!scheduledTime) nextErrors.scheduledTime = 'Enter a date and time.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    mutation.mutate({
      data: {
        airport: airport as Airport,
        direction: direction as Leg,
        scheduledTime: new Date(scheduledTime).toISOString(),
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-8 grid gap-6 rounded-lg border border-line p-8"
    >
      <label className="grid gap-1 text-sm font-medium text-ink">
        Airport
        <select
          value={airport}
          onChange={(e) => setAirport(e.target.value as Airport | '')}
          className="rounded-md border border-line px-3 py-2 text-ink"
        >
          <option value="">Select an airport</option>
          <option value="DFW">DFW</option>
          <option value="DAL">DAL</option>
        </select>
        {errors.airport && (
          <span className="text-sm text-red-600">{errors.airport}</span>
        )}
      </label>

      <label className="grid gap-1 text-sm font-medium text-ink">
        Direction
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as Leg | '')}
          className="rounded-md border border-line px-3 py-2 text-ink"
        >
          <option value="">Select arrival or departure</option>
          <option value="arrival">Arrival (picking riders up)</option>
          <option value="departure">Departure (dropping riders off)</option>
        </select>
        {errors.direction && (
          <span className="text-sm text-red-600">{errors.direction}</span>
        )}
      </label>

      <label className="grid gap-1 text-sm font-medium text-ink">
        Scheduled time
        <input
          type="datetime-local"
          value={scheduledTime}
          onChange={(e) => setScheduledTime(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-ink"
        />
        {errors.scheduledTime && (
          <span className="text-sm text-red-600">{errors.scheduledTime}</span>
        )}
      </label>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="justify-self-start rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
      >
        {mutation.isPending ? 'Creating…' : 'Create trip'}
      </button>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Something went wrong creating the trip. Please try again.
        </p>
      )}
    </form>
  )
}
