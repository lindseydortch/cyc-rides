-- CYC Rides: admin dashboard override support (Prompt #6).
--
-- The driver-flow RPCs added in Prompts #5/#5.5 (driver_trip_riders,
-- unclaimed_ride_requests, claim_trip_riders, unclaim_trip_rider) all scope
-- themselves to "the calling driver's own trips" via owns_driver(). The
-- admin dashboard needs to reuse the exact same driver trip-detail
-- component/screen to add/remove riders on *any* trip, regardless of who
-- owns it - RLS on the underlying tables already grants admins full access
-- (see the "admins can select/update all ..." policies from Prompt #2), but
-- these four SECURITY DEFINER RPCs do their own authorization internally
-- and need the same admin bypass added explicitly.
--
-- claim_trip_riders is redefined from its Prompt #5.6 body (no `status`
-- check - the trips.status column was dropped that prompt), not the
-- earlier Prompt #5.5 one, so this migration doesn't resurrect it.

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
  where public.owns_driver(t.driver_id) or public.is_admin()
  group by tr.trip_id, rr.id, p.name, tr.leg;
$$;

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
  where (
      exists (select 1 from public.drivers d where d.person_id = auth.uid())
      or public.is_admin()
    )
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

  insert into public.trip_riders (trip_id, ride_request_id, leg)
  select claim_trip_riders.trip_id, rid, v_trip.direction
  from unnest(claim_trip_riders.ride_request_ids) as rid;

  update public.ride_requests
  set
    arrival_ride_confirmed = case
      when v_trip.direction = 'arrival' then true
      else arrival_ride_confirmed
    end,
    departure_ride_confirmed = case
      when v_trip.direction = 'departure' then true
      else departure_ride_confirmed
    end
  where id = any(claim_trip_riders.ride_request_ids);
end;
$$;

create or replace function public.unclaim_trip_rider(
  trip_id uuid,
  ride_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips;
begin
  select * into v_trip from public.trips t where t.id = unclaim_trip_rider.trip_id;

  if v_trip.id is null then
    raise exception 'trip not found';
  end if;

  if not (public.owns_driver(v_trip.driver_id) or public.is_admin()) then
    raise exception 'not authorized to unclaim riders for this trip';
  end if;

  delete from public.trip_riders tr
  where tr.trip_id = unclaim_trip_rider.trip_id
    and tr.ride_request_id = unclaim_trip_rider.ride_request_id
    and tr.leg = v_trip.direction;

  update public.ride_requests
  set
    arrival_ride_confirmed = case
      when v_trip.direction = 'arrival' then false
      else arrival_ride_confirmed
    end,
    departure_ride_confirmed = case
      when v_trip.direction = 'departure' then false
      else departure_ride_confirmed
    end
  where id = unclaim_trip_rider.ride_request_id;
end;
$$;
