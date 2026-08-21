import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import { rowNeedsAttention } from '#/lib/admin/server-functions'
import type { AdminRideRequestRow } from '#/lib/admin/types'
import { hotelStayBadge } from '#/lib/hotel-stay'

function formatTime(time: string | null): string {
  if (!time) return '—'
  return new Date(time).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function legStatusLabel(requested: boolean, confirmed: boolean): string {
  if (!requested) return 'Not requested'
  return confirmed ? 'Confirmed' : 'Still needs a ride'
}

function legStatusClassName(requested: boolean, confirmed: boolean): string {
  if (!requested) return 'text-muted'
  return confirmed ? 'text-green' : 'text-blue'
}

function LegStatus({
  requested,
  confirmed,
}: {
  requested: boolean
  confirmed: boolean
}) {
  return (
    <span
      className={`text-sm font-medium ${legStatusClassName(requested, confirmed)}`}
    >
      {legStatusLabel(requested, confirmed)}
    </span>
  )
}

const columnHelper = createColumnHelper<AdminRideRequestRow>()

const columns = [
  columnHelper.accessor('personName', {
    header: 'Name',
    cell: (info) => info.getValue() ?? 'Unnamed',
  }),
  columnHelper.accessor('airport', {
    header: 'Airport',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('arrivalTime', {
    header: 'Arrival time',
    cell: (info) => formatTime(info.getValue()),
  }),
  columnHelper.display({
    id: 'arrivalStatus',
    header: 'Arrival status',
    cell: ({ row }) => (
      <LegStatus
        requested={row.original.arrivalRequested}
        confirmed={row.original.arrivalConfirmed}
      />
    ),
  }),
  columnHelper.accessor('departureTime', {
    header: 'Departure time',
    cell: (info) => formatTime(info.getValue()),
  }),
  columnHelper.display({
    id: 'departureStatus',
    header: 'Departure status',
    cell: ({ row }) => (
      <LegStatus
        requested={row.original.departureRequested}
        confirmed={row.original.departureConfirmed}
      />
    ),
  }),
  columnHelper.accessor('partySize', { header: 'Party size' }),
  columnHelper.display({
    id: 'hotelStay',
    header: 'Hotel stay',
    cell: ({ row }) =>
      hotelStayBadge(
        row.original.stayingAtHotel,
        row.original.stayingFullDuration,
      ) ?? '—',
  }),
]

export function RideRequestsTable({ rows }: { rows: AdminRideRequestRow[] }) {
  const [showAll, setShowAll] = useState(false)

  const filteredRows = useMemo(
    () => (showAll ? rows : rows.filter(rowNeedsAttention)),
    [rows, showAll],
  )

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Ride requests</h2>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
          Show everyone
        </label>
      </div>

      {filteredRows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {showAll ? 'No ride requests yet.' : 'Nothing needs attention.'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-cloud text-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-2 font-medium">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 text-ink">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
