-- CYC Rides: fills a gap needed by the requester edit flow (Prompt #4.5).
--
-- Prompt #4.5 lets a requester remove a companion while editing their ride
-- request. Prompt #2's RLS never granted a DELETE policy on
-- `ride_companions` at all (only SELECT/INSERT/UPDATE), so - despite the
-- table-level GRANT already covering DELETE for `authenticated` - RLS
-- defaults to denying it. Adding the owner-only DELETE policy, matching the
-- existing owner INSERT/UPDATE policies on this table exactly.

create policy "ride_requests owner can delete own companions"
on public.ride_companions for delete
using (
  exists (
    select 1 from public.ride_requests rr
    where rr.id = ride_companions.ride_request_id and rr.person_id = auth.uid()
  )
);
