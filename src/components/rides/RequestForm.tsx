import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  createRideRequest,
  updateRideRequest,
} from '#/lib/rides/server-functions'
import { rideStatusQueryKey } from '#/lib/rides/query-keys'
import type { Airport, Leg } from '#/lib/rides/types'

interface FormErrors {
  airport?: string
  arrivalFlight?: string
  arrivalTime?: string
  departureFlight?: string
  departureTime?: string
  form?: string
}

export interface RequestFormInitialData {
  airport: Airport | ''
  arrivalFlight: string
  arrivalTime: string
  departureFlight: string
  departureTime: string
  companionNames: string[]
}

interface RequestFormProps {
  mode?: 'create' | 'edit'
  initialData?: RequestFormInitialData
  // Whether a driver is already assigned to each leg - drives the "changes
  // won't notify them" warning banner. Only meaningful in edit mode.
  confirmedLegs?: { arrival: boolean; departure: boolean }
  // Which leg's flight-number field to autofocus on mount, e.g. when
  // entering edit mode from a "not requested" leg's "add this leg" action.
  focusLeg?: Leg
  onSuccess?: () => void
  onCancel?: () => void
}

// A leg is only submitted as a pair: both filled means "requesting this
// leg," both empty means "not requesting it," and one-without-the-other is
// an incomplete leg that fails validation.
function legFillState(
  flight: string,
  time: string,
): 'empty' | 'partial' | 'complete' {
  const hasFlight = flight.trim() !== ''
  const hasTime = time !== ''
  if (!hasFlight && !hasTime) return 'empty'
  if (hasFlight && hasTime) return 'complete'
  return 'partial'
}

export function RequestForm({
  mode = 'create',
  initialData,
  confirmedLegs,
  focusLeg,
  onSuccess,
  onCancel,
}: RequestFormProps) {
  const queryClient = useQueryClient()

  const [airport, setAirport] = useState<Airport | ''>(
    initialData?.airport ?? '',
  )
  const [arrivalFlight, setArrivalFlight] = useState(
    initialData?.arrivalFlight ?? '',
  )
  const [arrivalTime, setArrivalTime] = useState(initialData?.arrivalTime ?? '')
  const [departureFlight, setDepartureFlight] = useState(
    initialData?.departureFlight ?? '',
  )
  const [departureTime, setDepartureTime] = useState(
    initialData?.departureTime ?? '',
  )
  const [companions, setCompanions] = useState<string[]>(
    initialData?.companionNames ?? [],
  )
  const [errors, setErrors] = useState<FormErrors>({})

  const arrivalFlightRef = useRef<HTMLInputElement>(null)
  const departureFlightRef = useRef<HTMLInputElement>(null)

  // Only run once on mount - focusLeg is a one-shot entry hint, not
  // something that should re-steal focus on every re-render. (No
  // react-hooks/exhaustive-deps rule is configured in this project, so no
  // suppression comment is needed for the intentionally-empty deps array.)
  useEffect(() => {
    if (focusLeg === 'arrival') arrivalFlightRef.current?.focus()
    else if (focusLeg === 'departure') departureFlightRef.current?.focus()
  }, [])

  const mutation = useMutation({
    mutationFn: mode === 'edit' ? updateRideRequest : createRideRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: rideStatusQueryKey })
      onSuccess?.()
    },
  })

  function addCompanion() {
    setCompanions((prev) => [...prev, ''])
  }

  function removeCompanion(index: number) {
    setCompanions((prev) => prev.filter((_, i) => i !== index))
  }

  function updateCompanion(index: number, value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? value : c)))
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {}
    if (!airport) nextErrors.airport = 'Select an airport.'

    const arrivalState = legFillState(arrivalFlight, arrivalTime)
    const departureState = legFillState(departureFlight, departureTime)

    if (arrivalState === 'partial') {
      if (!arrivalFlight.trim())
        nextErrors.arrivalFlight =
          "Enter a flight number, or clear the date/time if you're not requesting an arrival ride."
      if (!arrivalTime)
        nextErrors.arrivalTime =
          "Enter a date/time, or clear the flight number if you're not requesting an arrival ride."
    }

    if (departureState === 'partial') {
      if (!departureFlight.trim())
        nextErrors.departureFlight =
          "Enter a flight number, or clear the date/time if you're not requesting a departure ride."
      if (!departureTime)
        nextErrors.departureTime =
          "Enter a date/time, or clear the flight number if you're not requesting a departure ride."
    }

    if (arrivalState === 'empty' && departureState === 'empty') {
      nextErrors.form = 'Add at least one leg — arrival or departure.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const arrivalComplete =
      legFillState(arrivalFlight, arrivalTime) === 'complete'
    const departureComplete =
      legFillState(departureFlight, departureTime) === 'complete'

    mutation.mutate({
      data: {
        airport: airport as Airport,
        arrivalFlight: arrivalComplete ? arrivalFlight.trim() : null,
        arrivalTime: arrivalComplete
          ? new Date(arrivalTime).toISOString()
          : null,
        departureFlight: departureComplete ? departureFlight.trim() : null,
        departureTime: departureComplete
          ? new Date(departureTime).toISOString()
          : null,
        companionNames: companions,
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

      <fieldset className="grid gap-4 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">Arrival</legend>
        <p className="text-sm text-muted">
          Leave both fields blank if you're not requesting an arrival ride.
        </p>
        {confirmedLegs?.arrival && (
          <div
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            A driver is already assigned to this leg. Changing the time here
            won't automatically notify them — reach out directly if your flight
            changes.
          </div>
        )}
        <label className="grid gap-1 text-sm font-medium text-ink">
          Flight number
          <input
            ref={arrivalFlightRef}
            value={arrivalFlight}
            onChange={(e) => setArrivalFlight(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-ink"
            placeholder="AA100"
          />
          {errors.arrivalFlight && (
            <span className="text-sm text-red-600">{errors.arrivalFlight}</span>
          )}
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Arrival date &amp; time
          <input
            type="datetime-local"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-ink"
          />
          {errors.arrivalTime && (
            <span className="text-sm text-red-600">{errors.arrivalTime}</span>
          )}
        </label>
      </fieldset>

      <fieldset className="grid gap-4 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          Departure
        </legend>
        <p className="text-sm text-muted">
          Leave both fields blank if you're not requesting a departure ride.
        </p>
        {confirmedLegs?.departure && (
          <div
            role="alert"
            className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            A driver is already assigned to this leg. Changing the time here
            won't automatically notify them — reach out directly if your flight
            changes.
          </div>
        )}
        <label className="grid gap-1 text-sm font-medium text-ink">
          Flight number
          <input
            ref={departureFlightRef}
            value={departureFlight}
            onChange={(e) => setDepartureFlight(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-ink"
            placeholder="AA200"
          />
          {errors.departureFlight && (
            <span className="text-sm text-red-600">
              {errors.departureFlight}
            </span>
          )}
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          Departure date &amp; time
          <input
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            className="rounded-md border border-line px-3 py-2 text-ink"
          />
          {errors.departureTime && (
            <span className="text-sm text-red-600">{errors.departureTime}</span>
          )}
        </label>
      </fieldset>

      <fieldset className="grid gap-3 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-ink">
          Companions
        </legend>
        {companions.map((name, index) => (
          <div key={index} className="flex gap-2">
            <input
              value={name}
              onChange={(e) => updateCompanion(index, e.target.value)}
              placeholder="Companion name"
              className="flex-1 rounded-md border border-line px-3 py-2 text-ink"
              aria-label={`Companion ${index + 1} name`}
            />
            <button
              type="button"
              onClick={() => removeCompanion(index)}
              className="rounded-md border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-cloud"
              aria-label={`Remove companion ${index + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addCompanion}
          className="justify-self-start rounded-md border border-line px-3 py-2 text-sm font-medium text-blue hover:bg-cloud"
        >
          + Add a companion
        </button>
      </fieldset>

      {errors.form && (
        <p className="text-sm text-red-600" role="alert">
          {errors.form}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="justify-self-start rounded-md bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-dark disabled:opacity-60"
        >
          {mutation.isPending
            ? 'Saving…'
            : mode === 'edit'
              ? 'Save changes'
              : 'Submit ride request'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-cloud"
          >
            Cancel
          </button>
        )}
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-600">
          Something went wrong saving your request. Please try again.
        </p>
      )}
    </form>
  )
}
