-- CYC Rides: fills gaps needed by the driver flow (Prompt #5).
--
-- Two things were missing from the existing RLS for a driver to actually
-- run the "add riders" screen:
--
-- 1. No policy let a driver UPDATE a ride_requests row they don't own -
--    needed to flip arrival_ride_confirmed/departure_ride_confirmed to true
--    when they claim a rider. Broad ("any driver can update any
--    ride_requests row"), matching the same MVP-simplicity precedent as the
--    existing "drivers can select all ride_requests" and "authenticated
--    users can select all drivers" policies from Prompt #2 - not scoped to
--    "only the leg/columns they're confirming," same tradeoff already made
--    elsewhere in this schema.
-- 2. Reading rider names requires joining `people`, which drivers have no
--    SELECT policy for beyond their own row - same gap Prompt #4 hit for
--    trip-mates, fixed the same way: a narrow SECURITY DEFINER RPC rather
--    than a broad "drivers can select all people" policy, so name exposure
--    stays scoped to what the driver flow actually needs rather than
--    opening the whole roster.

-- ---------------------------------------------------------------------------
-- ride_requests: drivers can update (to set the confirmed flags)
-- ---------------------------------------------------------------------------

create policy "drivers can update ride_requests"
on public.ride_requests for update
using (exists (select 1 from public.drivers d where d.person_id = auth.uid()))
with check (exists (select 1 from public.drivers d where d.person_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- driver_trip_riders: rider details (name, companions, flight time) for
-- every trip owned by the calling driver - used by both the dashboard
-- (grouped client-side by trip_id) and a trip's "current riders" list.
-- ---------------------------------------------------------------------------

create or replace function public.driver_trip_riders()
returns table (
  trip_id uuid,
  ride_request_id uuid,
  person_name text,
  companion_names text[],
  flight text,
  flight_time timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    tr.trip_id,
    rr.id,
    p.name,
    coalesce(array_agg(rc.name order by rc.name) filter (where rc.name is not null), '{}'),
    case tr.leg when 'arrival' then rr.arrival_flight else rr.departure_flight end,
    case tr.leg when 'arrival' then rr.arrival_time else rr.departure_time end
  from public.trip_riders tr
  join public.trips t on t.id = tr.trip_id
  join public.ride_requests rr on rr.id = tr.ride_request_id
  join public.people p on p.id = rr.person_id
  left join public.ride_companions rc on rc.ride_request_id = rr.id
  where public.owns_driver(t.driver_id)
  group by tr.trip_id, rr.id, p.name, tr.leg;
$$;

grant execute on function public.driver_trip_riders() to authenticated;

-- ---------------------------------------------------------------------------
-- unclaimed_ride_requests: candidates for a trip's "add riders" screen -
-- ride_requests with a fully-filled leg matching the given airport/
-- direction, not yet confirmed on that leg, and with no existing
-- trip_riders row for that leg. Restricted to callers who own a drivers
-- row (a plain requester gets zero rows back, not an error - see the RPC's
-- top-level `exists` check). Sorted by proximity of the leg's flight time to
-- a reference time (the trip's own scheduled_time), nearest first.
-- ---------------------------------------------------------------------------

create or replace function public.unclaimed_ride_requests(
  p_airport text,
  p_direction text,
  p_reference_time timestamptz
)
returns table (
  ride_request_id uuid,
  person_name text,
  flight text,
  flight_time timestamptz,
  party_size int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    rr.id,
    p.name,
    case p_direction when 'arrival' then rr.arrival_flight else rr.departure_flight end,
    case p_direction when 'arrival' then rr.arrival_time else rr.departure_time end,
    (1 + count(rc.id))::int
  from public.ride_requests rr
  join public.people p on p.id = rr.person_id
  left join public.ride_companions rc on rc.ride_request_id = rr.id
  where exists (select 1 from public.drivers d where d.person_id = auth.uid())
    and rr.airport = p_airport
    and (case p_direction
      when 'arrival' then
        rr.arrival_flight is not null and rr.arrival_time is not null and not rr.arrival_ride_confirmed
      else
        rr.departure_flight is not null and rr.departure_time is not null and not rr.departure_ride_confirmed
    end)
    and not exists (
      select 1 from public.trip_riders tr2
      where tr2.ride_request_id = rr.id and tr2.leg = p_direction
    )
  group by rr.id, p.name
  order by abs(extract(epoch from (
    (case p_direction when 'arrival' then rr.arrival_time else rr.departure_time end) - p_reference_time
  )));
$$;

grant execute on function public.unclaimed_ride_requests(text, text, timestamptz) to authenticated;
