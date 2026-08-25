-- CYC Rides: rider-first driver home (Prompt #9).
--
-- /driver's primary flow used to require creating an empty trip before a
-- driver could see who needed a pickup. This migration adds the RPC support
-- for browsing every unclaimed leg across all airports/directions and
-- creating a trip + claiming riders in one atomic action.

-- ---------------------------------------------------------------------------
-- _add_trip_riders: shared "insert trip_riders + flip the matching confirmed
-- column" logic, factored out of claim_trip_riders so
-- create_trip_and_claim_riders (below) doesn't duplicate it. Not granted to
-- `authenticated` - it does no ownership check of its own and is only meant
-- to be called from other SECURITY DEFINER functions in this file, which run
-- as this function's owner regardless of grants.
-- ---------------------------------------------------------------------------

create or replace function public._add_trip_riders(
  trip_row public.trips,
  ride_request_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_riders (trip_id, ride_request_id, leg)
  select trip_row.id, rid, trip_row.direction
  from unnest(ride_request_ids) as rid;

  update public.ride_requests
  set
    arrival_ride_confirmed = case
      when trip_row.direction = 'arrival' then true
      else arrival_ride_confirmed
    end,
    departure_ride_confirmed = case
      when trip_row.direction = 'departure' then true
      else departure_ride_confirmed
    end
  where id = any(ride_request_ids);
end;
$$;

-- ---------------------------------------------------------------------------
-- claim_trip_riders: redefined to call _add_trip_riders instead of
-- duplicating the insert+update. Ownership check and signature unchanged.
-- ---------------------------------------------------------------------------

create or replace function public.claim_trip_riders(
  trip_id uuid,
  ride_request_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips;
begin
  select * into v_trip from public.trips t where t.id = claim_trip_riders.trip_id;

  if v_trip.id is null then
    raise exception 'trip not found';
  end if;

  if not (public.owns_driver(v_trip.driver_id) or public.is_admin()) then
    raise exception 'not authorized to claim riders for this trip';
  end if;

  perform public._add_trip_riders(v_trip, claim_trip_riders.ride_request_ids);
end;
$$;

grant execute on function public.claim_trip_riders(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- create_trip_and_claim_riders: same ownership/atomicity contract as
-- claim_trip_riders, but inserts the trips row first. driver_id is always
-- the caller's own drivers.id - never accepted as a parameter - so there's
-- no way to create a trip "as" another driver. If any of ride_request_ids
-- doesn't exist, the insert inside _add_trip_riders raises a foreign-key
-- violation, which aborts the whole function invocation (including the
-- trips insert) - same all-or-nothing guarantee as claim_trip_riders relies
-- on implicitly.
-- ---------------------------------------------------------------------------

create or replace function public.create_trip_and_claim_riders(
  airport text,
  direction text,
  scheduled_time timestamptz,
  ride_request_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_trip public.trips;
begin
  select id into v_driver_id from public.drivers d where d.person_id = auth.uid();

  if v_driver_id is null then
    raise exception 'no drivers row for this user';
  end if;

  insert into public.trips (driver_id, airport, direction, scheduled_time)
  values (
    v_driver_id,
    create_trip_and_claim_riders.airport,
    create_trip_and_claim_riders.direction,
    create_trip_and_claim_riders.scheduled_time
  )
  returning * into v_trip;

  perform public._add_trip_riders(v_trip, create_trip_and_claim_riders.ride_request_ids);

  return v_trip.id;
end;
$$;

grant execute on function public.create_trip_and_claim_riders(text, text, timestamptz, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- unclaimed_ride_requests: widened to power the home page's global "riders
-- needing a pickup" view. All filter params are now optional (default
-- null); called with none of them, every unclaimed leg across every
-- airport/direction comes back. The return shape gains airport/direction
-- columns (a global view can't rely on the caller already knowing them the
-- way the old single-trip-scoped call could), and each ride_requests row can
-- now surface up to two candidate rows (one per unclaimed, fully-filled-in
-- leg) instead of exactly one - `create or replace` can't change a
-- function's OUT-parameter row type, so the old 3-arg version is dropped
-- first.
--
-- Sort behavior is preserved for existing callers: when p_reference_time is
-- given (the /driver/trips/:tripId candidate list always passes its trip's
-- scheduled_time), results sort by proximity to it, exactly as before.
-- When it's omitted (the new global home view), results sort chronologically
-- by each row's own relevant time, soonest first.
-- ---------------------------------------------------------------------------

drop function if exists public.unclaimed_ride_requests(text, text, timestamptz);

create or replace function public.unclaimed_ride_requests(
  p_airport text default null,
  p_direction text default null,
  p_reference_time timestamptz default null,
  p_staying_at_hotel boolean default null,
  p_start_time timestamptz default null,
  p_end_time timestamptz default null
)
returns table (
  ride_request_id uuid,
  airport text,
  direction text,
  person_name text,
  flight text,
  flight_time timestamptz,
  party_size int,
  staying_at_hotel boolean,
  staying_full_duration boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    rr.id,
    rr.airport,
    leg.direction,
    p.name,
    case leg.direction when 'arrival' then rr.arrival_flight else rr.departure_flight end,
    case leg.direction when 'arrival' then rr.arrival_time else rr.departure_time end,
    (1 + count(rc.id))::int,
    rr.staying_at_hotel,
    rr.staying_full_duration
  from public.ride_requests rr
  join public.people p on p.id = rr.person_id
  cross join (values ('arrival'), ('departure')) as leg(direction)
  left join public.ride_companions rc on rc.ride_request_id = rr.id
  where (
      exists (select 1 from public.drivers d where d.person_id = auth.uid())
      or public.is_admin()
    )
    and (p_airport is null or rr.airport = p_airport)
    and (p_direction is null or leg.direction = p_direction)
    and (p_staying_at_hotel is null or rr.staying_at_hotel = p_staying_at_hotel)
    and (case leg.direction
      when 'arrival' then
        rr.arrival_flight is not null and rr.arrival_time is not null and not rr.arrival_ride_confirmed
        and (p_start_time is null or rr.arrival_time >= p_start_time)
        and (p_end_time is null or rr.arrival_time <= p_end_time)
      else
        rr.departure_flight is not null and rr.departure_time is not null and not rr.departure_ride_confirmed
        and (p_start_time is null or rr.departure_time >= p_start_time)
        and (p_end_time is null or rr.departure_time <= p_end_time)
    end)
    and not exists (
      select 1 from public.trip_riders tr2
      where tr2.ride_request_id = rr.id and tr2.leg = leg.direction
    )
  group by rr.id, rr.airport, leg.direction, p.name, rr.staying_at_hotel, rr.staying_full_duration
  order by
    case when p_reference_time is not null then
      abs(extract(epoch from (
        (case leg.direction when 'arrival' then rr.arrival_time else rr.departure_time end) - p_reference_time
      )))
    end nulls last,
    case leg.direction when 'arrival' then rr.arrival_time else rr.departure_time end asc;
$$;
