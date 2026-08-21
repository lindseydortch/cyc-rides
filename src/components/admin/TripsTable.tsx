import { Link } from '@tanstack/react-router'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

import type { AdminTripRow } from '#/lib/admin/types'

function formatTime(time: string | null): string {
  if (!time) return 'Time to be confirmed'
  return new Date(time).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function directionLabel(direction: string): string {
  return direction === 'arrival' ? 'Arrival' : 'Departure'
}

const columnHelper = createColumnHelper<AdminTripRow>()

const columns = [
  columnHelper.accessor('driverName', {
    header: 'Driver',
    cell: (info) => info.getValue() ?? 'Unassigned',
  }),
  columnHelper.accessor('airport', {
    header: 'Airport',
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('direction', {
    header: 'Direction',
    cell: (info) => directionLabel(info.getValue()),
  }),
  columnHelper.accessor('scheduledTime', {
    header: 'Scheduled time',
    cell: (info) => formatTime(info.getValue()),
  }),
  columnHelper.accessor('riderCount', { header: 'Riders' }),
]

// Clicking a row opens the same driver trip-detail screen drivers use
// (/driver/trips/$tripId) - admins already pass that route's guard
// (requireDriverSession allows is_admin through), and getTripDetail no
// longer requires the caller to own a drivers row, so this reuses the
// existing add/remove-riders component rather than a second one (Prompt
// #6).
export function TripsTable({ rows }: { rows: AdminTripRow[] }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Trips</h2>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No trips yet.</p>
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
                  {row.getVisibleCells().map((cell, index) => (
                    <td key={cell.id} className="px-0 py-0 text-ink">
                      <Link
                        to="/driver/trips/$tripId"
                        params={{ tripId: row.original.id }}
                        className={`block px-4 py-2 hover:bg-cloud ${
                          index === 0 ? 'font-medium text-blue' : ''
                        }`}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Link>
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
