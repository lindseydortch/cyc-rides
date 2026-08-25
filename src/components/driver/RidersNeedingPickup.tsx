import { useState } from 'react'

import { matchesUnclaimedFilters } from '#/lib/driver/server-functions'
import { formatDateTime } from '#/lib/driver/format'
import { hotelStayBadge } from '#/lib/hotel-stay'
import { RiderActionBar } from '#/components/driver/RiderActionBar'
import type { Airport, Leg } from '#/lib/rides/types'
import type {
  Trip,
  UnclaimedCandidate,
  UnclaimedFilters,
} from '#/lib/driver/types'

interface RidersNeedingPickupProps {
  candidates: UnclaimedCandidate[]
  trips: Trip[]
}

interface FilterState {
  airport: Airport | ''
  stayingAtHotel: boolean
  startTime: string
  endTime: string
}

const emptyFilters: FilterState = {
  airport: '',
  stayingAtHotel: false,
  startTime: '',
  endTime: '',
}

// A ride_requests row can surface as two candidate rows - one per unclaimed
// leg - sharing the same rideRequestId. Selection must key on
// rideRequestId + direction, not rideRequestId alone, or checking one leg's
// row would also mark the other leg's row (a different airport/direction)
// as selected.
function candidateKey(candidate: UnclaimedCandidate): string {
  return `${candidate.rideRequestId}::${candidate.direction}`
}

function toFilters(state: FilterState): UnclaimedFilters {
  return {
    airport: state.airport || undefined,
    stayingAtHotel: state.stayingAtHotel || undefined,
    startTime: state.startTime
      ? new Date(state.startTime).toISOString()
      : undefined,
    endTime: state.endTime ? new Date(state.endTime).toISOString() : undefined,
  }
}

export function RidersNeedingPickup({
  candidates,
  trips,
}: RidersNeedingPickupProps) {
  const [directionTab, setDirectionTab] = useState<Leg>('arrival')
  const [filterState, setFilterState] = useState<FilterState>(emptyFilters)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filters = toFilters(filterState)
  const filteredCandidates = candidates
    .filter((c) => c.direction === directionTab)
    .filter((c) => matchesUnclaimedFilters(c, filters))

  const arrivalCount = candidates.filter(
    (c) => c.direction === 'arrival',
  ).length
  const departureCount = candidates.filter(
    (c) => c.direction === 'departure',
  ).length

  function switchTab(direction: Leg) {
    setDirectionTab(direction)
    setSelected(new Set())
  }

  const selectedCandidates = candidates.filter((c) =>
    selected.has(candidateKey(c)),
  )
  const lock = selectedCandidates[0]
    ? {
        airport: selectedCandidates[0].airport,
        direction: selectedCandidates[0].direction,
      }
    : null

  function toggle(candidate: UnclaimedCandidate) {
    setSelected((prev) => {
      const next = new Set(prev)
      const key = candidateKey(candidate)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-ink">
        Riders needing a pickup
      </h2>

      <div role="tablist" className="mt-4 flex gap-1 border-b border-line">
        <button
          type="button"
          role="tab"
          aria-selected={directionTab === 'arrival'}
          onClick={() => switchTab('arrival')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            directionTab === 'arrival'
              ? 'border-blue text-blue'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Arrivals ({arrivalCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={directionTab === 'departure'}
          onClick={() => switchTab('departure')}
          className={`border-b-2 px-4 py-2 text-sm font-semibold ${
            directionTab === 'departure'
              ? 'border-blue text-blue'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Departures ({departureCount})
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="grid gap-1 text-sm font-medium text-ink">
          Airport
          <select
            value={filterState.airport}
            onChange={(e) =>
              setFilterState((f) => ({
                ...f,
                airport: e.target.value as Airport | '',
              }))
            }
            className="rounded-md border border-line px-3 py-2 text-ink"
          >
            <option value="">All airports</option>
            <option value="DFW">DFW</option>
            <option value="DAL">DAL</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-ink">
          From
          <input
            type="datetime-local"
            value={filterState.startTime}
            onChange={(e) =>
              setFilterState((f) => ({ ...f, startTime: e.target.value }))
            }
            className="rounded-md border border-line px-3 py-2 text-ink"
          />
        </label>

        <label className="grid gap-1 text-sm font-medium text-ink">
          To
          <input
            type="datetime-local"
            value={filterState.endTime}
            onChange={(e) =>
              setFilterState((f) => ({ ...f, endTime: e.target.value }))
            }
            className="rounded-md border border-line px-3 py-2 text-ink"
          />
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={filterState.stayingAtHotel}
            onChange={(e) =>
              setFilterState((f) => ({
                ...f,
                stayingAtHotel: e.target.checked,
              }))
            }
          />
          Staying at the conference hotel
        </label>
      </div>

      {filteredCandidates.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No unclaimed riders match these filters.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {filteredCandidates.map((candidate) => {
            const badge = hotelStayBadge(
              candidate.stayingAtHotel,
              candidate.stayingFullDuration,
            )
            const isSelected = selected.has(candidateKey(candidate))
            const isDisabled =
              !isSelected &&
              lock !== null &&
              (candidate.airport !== lock.airport ||
                candidate.direction !== lock.direction)

            return (
              <li key={candidateKey(candidate)}>
                <label
                  className={`flex items-center gap-3 rounded-md border border-line p-3 text-sm text-ink ${
                    isDisabled ? 'opacity-40' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDisabled}
                    onChange={() => toggle(candidate)}
                  />
                  <span className="flex-1">
                    {candidate.personName ?? 'Rider'} — {candidate.airport} ·{' '}
                    {formatDateTime(candidate.flightTime)} · party of{' '}
                    {candidate.partySize}
                  </span>
                  {badge && (
                    <span className="rounded-full bg-cloud px-2 py-0.5 text-xs font-medium text-muted">
                      {badge}
                    </span>
                  )}
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <RiderActionBar
        selected={selectedCandidates}
        trips={trips}
        onClaimed={clearSelection}
      />
    </section>
  )
}
