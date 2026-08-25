export function formatDateTime(value: string | null): string {
  if (!value) return 'Time to be confirmed'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function directionLabel(direction: string): string {
  return direction === 'arrival' ? 'Arrival' : 'Departure'
}
