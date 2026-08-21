-- CYC Rides: tighten driver write access to ride_requests (Prompt #5.5).
--
-- Prompt #5 added "drivers can update ride_requests" - any driver, any row,
-- any column - as the only way to flip the confirmed flags when claiming a
-- rider. That was fine as a read-all precedent (drivers already had
-- unrestricted SELECT on ride_requests since Prompt #2) but too broad for a
-- write path: nothing stopped a driver from updating a stranger's row via a
-- direct API call, not just through the add-riders flow.
--
-- Replaced with three SECURITY DEFINER RPCs, the same pattern already used
-- for driver_trip_riders()/unclaimed_ride_requests() in Prompt #5. Each RPC
-- checks the caller owns the trip (via owns_driver(trips.driver_id)) before
-- touching anything, and does its insert/delete + confirmed-flag flip in one
-- function call so it can't partially apply. The broad update policy is
-- dropped entirely - driver writes to ride_requests now only ever happen
-- through these RPCs.

-- ---------------------------------------------------------------------------
-- claim_trip_riders: atomically adds a batch of riders to a trip and flips
-- the matching confirmed column on each of their ride_requests rows. Only
-- the trip's own driver can call this, and only while the trip is open.
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

  if not public.owns_driver(v_trip.driver_id) then
    raise exception 'not authorized to claim riders for this trip';
  end if;

  if v_trip.status <> 'open' then
    raise exception 'trip is not open';
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

grant execute on function public.claim_trip_riders(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- unclaim_trip_rider: removes one rider from a trip and resets the matching
-- confirmed column back to false, freeing them up as a candidate again.
-- Same ownership check as claim_trip_riders.
-- ---------------------------------------------------------------------------

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

  if not public.owns_driver(v_trip.driver_id) then
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

grant execute on function public.unclaim_trip_rider(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- reopen_trip: sets a trip's status back to 'open'. Its own driver or an
-- admin can call this.
-- ---------------------------------------------------------------------------

create or replace function public.reopen_trip(trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
begin
  select t.driver_id into v_driver_id from public.trips t where t.id = reopen_trip.trip_id;

  if v_driver_id is null then
    raise exception 'trip not found';
  end if;

  if not (public.owns_driver(v_driver_id) or public.is_admin()) then
    raise exception 'not authorized to reopen this trip';
  end if;

  update public.trips set status = 'open' where id = reopen_trip.trip_id;
end;
$$;

grant execute on function public.reopen_trip(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Drop the broad direct-write policy - all driver writes to ride_requests
-- now go through the RPCs above.
-- ---------------------------------------------------------------------------

drop policy "drivers can update ride_requests" on public.ride_requests;
