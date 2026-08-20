-- CYC Rides: core schema, auth.users -> people sync trigger, and RLS policies.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.people (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  -- role is null until the person completes onboarding and picks one.
  role text check (role is null or role in ('requester', 'driver')),
  is_admin boolean not null default false,
  avatar_url text
);

create table public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  -- one ride_requests row per person.
  person_id uuid not null unique references public.people (id) on delete cascade,
  airport text check (airport in ('DFW', 'DAL')),
  arrival_flight text,
  arrival_time timestamptz,
  arrival_ride_confirmed boolean not null default false,
  departure_flight text,
  departure_time timestamptz,
  departure_ride_confirmed boolean not null default false
);

create index ride_requests_person_id_idx on public.ride_requests (person_id);

create table public.ride_companions (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests (id) on delete cascade,
  name text
);

create index ride_companions_ride_request_id_idx on public.ride_companions (ride_request_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people (id) on delete cascade,
  vehicle_make_model text,
  license_plate text,
  passenger_capacity int,
  luggage_capacity int
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  airport text check (airport in ('DFW', 'DAL')),
  direction text check (direction in ('arrival', 'departure')),
  scheduled_time timestamptz,
  status text check (status in ('open', 'completed')) not null default 'open'
);

create index trips_driver_id_idx on public.trips (driver_id);

create table public.trip_riders (
  trip_id uuid not null references public.trips (id) on delete cascade,
  ride_request_id uuid not null references public.ride_requests (id) on delete cascade,
  leg text check (leg in ('arrival', 'departure')),
  primary key (trip_id, ride_request_id, leg)
);

create index trip_riders_ride_request_id_idx on public.trip_riders (ride_request_id);

-- Table-level GRANTs. RLS policies alone don't grant access - Postgres
-- checks table-level privileges first, then RLS narrows the rows within
-- what the GRANT allows. anon/authenticated/service_role need these grants
-- for the RLS policies above to have anything to apply to; the actual
-- access control is enforced by RLS, not by these broad grants.
grant select, insert, update, delete on
  public.people,
  public.ride_requests,
  public.ride_companions,
  public.drivers,
  public.trips,
  public.trip_riders
to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- auth.users -> people sync trigger
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.people (id, name, email, role, is_admin, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.email,
    null,
    false,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helper functions
--
-- These run as SECURITY DEFINER so they bypass RLS on the tables they read
-- internally. This is required, not just an optimization: without it,
-- policies that need to check *other people's* rows (e.g. "does this ride
-- request share a trip with mine?") would themselves be blocked by RLS on
-- the table they're querying, since the querying user has no standing
-- policy granting them visibility into another person's rows in isolation.
-- ---------------------------------------------------------------------------

-- Is the current user an admin? Needed because the "admins can see
-- everything" policy on `people` itself would otherwise have to read
-- `people` under RLS to find out - infinite regress.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.people where id = auth.uid()), false);
$$;

-- Does the current user own the drivers row with this id?
create or replace function public.owns_driver(target_driver_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.drivers d
    where d.id = target_driver_id and d.person_id = auth.uid()
  );
$$;

-- Does the given ride_requests row share a trip with one of the current
-- user's own ride_requests rows? Bypasses trip_riders RLS internally so a
-- requester can discover their trip-mate's ride_requests id even though
-- trip_riders itself only lets them SELECT rows involving their own
-- request.
create or replace function public.shares_trip_with(other_ride_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.trip_riders mine
    join public.trip_riders theirs on theirs.trip_id = mine.trip_id
    join public.ride_requests my_rr on my_rr.id = mine.ride_request_id
    where my_rr.person_id = auth.uid()
      and theirs.ride_request_id = other_ride_request_id
  );
$$;

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------

alter table public.people enable row level security;

create policy "people can select own row"
on public.people for select
using (id = auth.uid());

create policy "people can update own row"
on public.people for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins can select all people"
on public.people for select
using (public.is_admin());

create policy "admins can update all people"
on public.people for update
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- ride_requests
-- ---------------------------------------------------------------------------

alter table public.ride_requests enable row level security;

create policy "requesters can insert own ride_requests"
on public.ride_requests for insert
with check (person_id = auth.uid());

create policy "requesters can select own ride_requests"
on public.ride_requests for select
using (person_id = auth.uid());

create policy "requesters can update own ride_requests"
on public.ride_requests for update
using (person_id = auth.uid())
with check (person_id = auth.uid());

-- Trip-mates: a requester can see (but not modify) the ride_requests row of
-- anyone who shares a trip with them, so the UI can show who else is on the
-- ride.
create policy "requesters can select trip-mates' ride_requests"
on public.ride_requests for select
using (public.shares_trip_with(id));

create policy "drivers can select all ride_requests"
on public.ride_requests for select
using (
  exists (select 1 from public.drivers d where d.person_id = auth.uid())
);

create policy "admins can select all ride_requests"
on public.ride_requests for select
using (public.is_admin());

create policy "admins can update all ride_requests"
on public.ride_requests for update
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- ride_companions
--
-- Visibility inherits from the parent ride_requests row: a companion row is
-- selectable by anyone who can select its parent ride_requests row (owner,
-- trip-mate, driver, or admin), via re-checking ride_requests' own RLS.
-- Insert/update is restricted to the ride_requests owner only - trip-mates
-- and drivers can see companions but shouldn't edit someone else's.
-- ---------------------------------------------------------------------------

alter table public.ride_companions enable row level security;

create policy "ride_companions inherit select from parent ride_requests"
on public.ride_companions for select
using (
  exists (
    select 1 from public.ride_requests rr where rr.id = ride_companions.ride_request_id
  )
);

create policy "ride_requests owner can insert own companions"
on public.ride_companions for insert
with check (
  exists (
    select 1 from public.ride_requests rr
    where rr.id = ride_companions.ride_request_id and rr.person_id = auth.uid()
  )
);

create policy "ride_requests owner can update own companions"
on public.ride_companions for update
using (
  exists (
    select 1 from public.ride_requests rr
    where rr.id = ride_companions.ride_request_id and rr.person_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.ride_requests rr
    where rr.id = ride_companions.ride_request_id and rr.person_id = auth.uid()
  )
);

create policy "admins can update all ride_companions"
on public.ride_companions for update
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- drivers
--
-- Kept simple for MVP per spec: any authenticated user can SELECT driver
-- rows, so a requester's UI can show their assigned driver's contact info
-- without needing a narrower "attached to my trip" check here.
-- ---------------------------------------------------------------------------

alter table public.drivers enable row level security;

create policy "drivers can insert own drivers row"
on public.drivers for insert
with check (person_id = auth.uid());

create policy "authenticated users can select all drivers"
on public.drivers for select
using (auth.role() = 'authenticated');

create policy "drivers can update own drivers row"
on public.drivers for update
using (person_id = auth.uid())
with check (person_id = auth.uid());

create policy "admins can update all drivers"
on public.drivers for update
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------

alter table public.trips enable row level security;

create policy "drivers can insert own trips"
on public.trips for insert
with check (public.owns_driver(driver_id));

create policy "drivers can select own trips"
on public.trips for select
using (public.owns_driver(driver_id));

create policy "drivers can update own trips"
on public.trips for update
using (public.owns_driver(driver_id))
with check (public.owns_driver(driver_id));

create policy "admins can select all trips"
on public.trips for select
using (public.is_admin());

create policy "admins can update all trips"
on public.trips for update
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- trip_riders
-- ---------------------------------------------------------------------------

alter table public.trip_riders enable row level security;

create policy "drivers can insert trip_riders for own trips"
on public.trip_riders for insert
with check (
  exists (
    select 1 from public.trips t
    where t.id = trip_riders.trip_id and public.owns_driver(t.driver_id)
  )
);

-- Not explicitly requested by spec, but without this a driver could add
-- riders to their own trip and then never be able to read the passenger
-- list back - added so the driver dashboard can show who's on their trip.
create policy "drivers can select trip_riders for own trips"
on public.trip_riders for select
using (
  exists (
    select 1 from public.trips t
    where t.id = trip_riders.trip_id and public.owns_driver(t.driver_id)
  )
);

create policy "requesters can select own trip_riders rows"
on public.trip_riders for select
using (
  exists (
    select 1 from public.ride_requests rr
    where rr.id = trip_riders.ride_request_id and rr.person_id = auth.uid()
  )
);

create policy "admins can select all trip_riders"
on public.trip_riders for select
using (public.is_admin());

create policy "admins can update all trip_riders"
on public.trip_riders for update
using (public.is_admin())
with check (public.is_admin());
