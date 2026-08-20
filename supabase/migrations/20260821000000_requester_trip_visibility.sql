-- CYC Rides: fills a gap needed by the requester status page (Prompt #4).
--
-- Two things were missing from Prompt #2's RLS for a requester to see their
-- own confirmed ride's details:
--
-- 1. `trips` had no SELECT policy for requesters at all - only drivers and
--    admins could read a trips row, so a requester couldn't fetch their
--    assigned trip's `scheduled_time`.
-- 2. There was no way for a requester to list *other* riders on the same
--    trip *leg*. `trip_riders` SELECT is restricted to rows tied to the
--    caller's own `ride_request_id` (so it can't be used to enumerate other
--    riders), and the existing "requesters can select trip-mates'
--    ride_requests" policy on `ride_requests` (via `shares_trip_with`)
--    matches on *any* shared trip across both legs, not the specific leg
--    being displayed - too broad for a per-leg trip-mates list, and it would
--    also expose the trip-mate's *other* leg's flight details unnecessarily.
--
-- (2) is solved with a SECURITY DEFINER function, same pattern as
-- `shares_trip_with`/`is_admin` from Prompt #2: it bypasses RLS internally
-- to do the join, but only returns rows for a (trip_id, leg) pair the caller
-- is themselves confirmed on, and only exposes names - not the trip-mate's
-- full ride_requests row.

-- ---------------------------------------------------------------------------
-- trips: requesters can select a trip they're riding on
-- ---------------------------------------------------------------------------

-- A plain EXISTS subquery here (against trip_riders, joined to
-- ride_requests) would recurse: trip_riders' own SELECT policies query
-- `trips` (via owns_driver's join) to check driver ownership, so evaluating
-- this policy would re-trigger trip_riders' RLS, which re-triggers this
-- policy, forever ("infinite recursion detected in policy for relation
-- trips" - confirmed by the anon-access test before this fix). A SECURITY
-- DEFINER function bypasses RLS on its internal query, breaking the cycle,
-- same as `owns_driver`/`shares_trip_with` above.
create or replace function public.rides_on_trip(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.trip_riders tr
    join public.ride_requests rr on rr.id = tr.ride_request_id
    where tr.trip_id = target_trip_id and rr.person_id = auth.uid()
  );
$$;

create policy "requesters can select trips they're riding on"
on public.trips for select
using (public.rides_on_trip(id));

-- ---------------------------------------------------------------------------
-- trip_mates_for_leg: names of other riders/companions on a given trip leg
-- ---------------------------------------------------------------------------

create or replace function public.trip_mates_for_leg(p_trip_id uuid, p_leg text)
returns table (
  ride_request_id uuid,
  person_name text,
  companion_names text[]
)
language sql
security definer
set search_path = public
stable
as $$
  select
    rr.id,
    p.name,
    coalesce(array_agg(rc.name order by rc.name) filter (where rc.name is not null), '{}')
  from public.trip_riders tr
  join public.ride_requests rr on rr.id = tr.ride_request_id
  join public.people p on p.id = rr.person_id
  left join public.ride_companions rc on rc.ride_request_id = rr.id
  where tr.trip_id = p_trip_id
    and tr.leg = p_leg
    -- caller must themselves be a confirmed rider on this exact trip/leg
    and exists (
      select 1
      from public.trip_riders mine
      join public.ride_requests my_rr on my_rr.id = mine.ride_request_id
      where mine.trip_id = p_trip_id
        and mine.leg = p_leg
        and my_rr.person_id = auth.uid()
    )
  group by rr.id, p.name;
$$;

grant execute on function public.trip_mates_for_leg(uuid, text) to authenticated;
