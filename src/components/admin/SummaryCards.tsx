import type { AdminSummary } from '#/lib/admin/types'

export function SummaryCards({ summary }: { summary: AdminSummary }) {
  const cards = [
    { label: 'Unconfirmed arrivals', value: summary.unconfirmedArrivals },
    { label: 'Unconfirmed departures', value: summary.unconfirmedDepartures },
    { label: 'Total riders', value: summary.totalRiders },
    { label: 'Total drivers', value: summary.totalDrivers },
  ] as const

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-line bg-cloud p-4"
        >
          <p className="text-2xl font-bold text-ink">{card.value}</p>
          <p className="mt-1 text-sm text-muted">{card.label}</p>
        </div>
      ))}
    </div>
  )
}
