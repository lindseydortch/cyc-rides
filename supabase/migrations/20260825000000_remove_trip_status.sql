-- CYC Rides: remove trip completion entirely (Prompt #5.6).
--
-- A trip's "open"/"completed" status turned out not to matter for this app
-- - there's no reason to gate claiming/removing riders on whether a trip
-- has been marked complete, and nothing else reads the status either.
-- Dropping the column outright rather than keeping it as an unused/cosmetic
-- field.

-- claim_trip_riders (Prompt #5.5) no longer gates on status - claiming and
-- removing riders now work identically regardless of timing.
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

-- reopen_trip (Prompt #5.5) has nothing to reopen once there's no completed
-- state to be in.
drop function public.reopen_trip(uuid);

alter table public.trips drop column status;
