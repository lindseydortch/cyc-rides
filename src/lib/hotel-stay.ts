// Shared short badge label for hotel-stay info, used anywhere a rider row
// needs to stay compact (driver add-riders/current-riders lists, admin
// table) - contrast with StatusCards' longer sentence-style readback.
export function hotelStayBadge(
  stayingAtHotel: boolean | null,
  stayingFullDuration: boolean | null,
): string | null {
  if (!stayingAtHotel) return null
  return stayingFullDuration ? 'Hotel' : 'Hotel (partial)'
}
