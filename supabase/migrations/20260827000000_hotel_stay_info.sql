-- CYC Rides: conference hotel stay info (Prompt #8).
--
-- Display-only fields on a ride request - whether the attendee is staying
-- at the conference hotel, and if so, for the full conference. Neither
-- column affects ride matching, capacity, or claim logic. No RLS changes:
-- both columns are plain ride_requests columns already covered by the
-- per-row policies from Prompts #2/#5.5.

alter table public.ride_requests
  add column staying_at_hotel boolean,
  add column staying_full_duration boolean;

-- driver_trip_riders / unclaimed_ride_requests are redefined (from Prompt
-- #6's admin-bypass versions) to surface the two new columns so the driver
-- add-riders and current-riders screens can show a per-rider hotel badge.
-- `create or replace` can't change a function's OUT-parameter row type, so
-- each is dropped first.

drop function if exists public.driver_trip_riders();
drop function if exists public.unclaimed_ride_requests(text, text, timestamptz);

create or replace function public.driver_trip_riders()
returns table (
  trip_id uuid,
  ride_request_id uuid,
  person_name text,
  companion_names text[],
  flight text,
  flight_time timestamptz,
  staying_at_hotel boolean,
  staying_full_duration boolean
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
    case tr.leg when 'arrival' then rr.arrival_time else rr.departure_time end,
    rr.staying_at_hotel,
    rr.staying_full_duration
  from public.trip_riders tr
  join public.trips t on t.id = tr.trip_id
  join public.ride_requests rr on rr.id = tr.ride_request_id
  join public.people p on p.id = rr.person_id
  left join public.ride_companions rc on rc.ride_request_id = rr.id
  where public.owns_driver(t.driver_id) or public.is_admin()
  group by tr.trip_id, rr.id, p.name, tr.leg, rr.staying_at_hotel, rr.staying_full_duration;
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
    p.name,
    case p_direction when 'arrival' then rr.arrival_flight else rr.departure_flight end,
    case p_direction when 'arrival' then rr.arrival_time else rr.departure_time end,
    (1 + count(rc.id))::int,
    rr.staying_at_hotel,
    rr.staying_full_duration
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
  group by rr.id, p.name, rr.staying_at_hotel, rr.staying_full_duration
  order by abs(extract(epoch from (
    (case p_direction when 'arrival' then rr.arrival_time else rr.departure_time end) - p_reference_time
  )));
$$;
