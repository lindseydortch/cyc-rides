export const driverTripsQueryKey = ['driver-trips'] as const

export function driverTripDetailQueryKey(tripId: string) {
  return ['driver-trip', tripId] as const
}

export const unclaimedCandidatesQueryKey = ['unclaimed-candidates'] as const
