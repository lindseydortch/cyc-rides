// @vitest-environment node

import './setup/localSupabaseEnv'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const API_URL = process.env.API_URL!
const ANON_KEY = process.env.ANON_KEY!
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY!

const PASSWORD = 'password123!'
const TABLES = [
  'people',
  'ride_requests',
  'ride_companions',
  'drivers',
  'trips',
  'trip_riders',
] as const

// service_role client: bypasses RLS entirely. Used only for fixture setup
// (creating rows the test scenario needs), never for the assertions
// themselves - those go through per-user clients so RLS is actually
// exercised.
const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface TestUser {
  id: string
  email: string
  client: SupabaseClient
}

async function createTestUser(email: string): Promise<TestUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard against the admin API's real (wider-than-inferred) error shape
  if (error || !data.user)
    throw error ?? new Error(`failed to create user ${email}`)

  const client = createClient(API_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (signInError) throw signInError

  return { id: data.user.id, email, client }
}

async function deleteTestUser(user: TestUser) {
  await admin.auth.admin.deleteUser(user.id)
}

let requesterA: TestUser
let requesterB: TestUser
let requesterC: TestUser
let driverD: TestUser
let adminE: TestUser

let rrA: string
let rrB: string
let rrC: string
let driverRowId: string
let sharedTripId: string

const userIdsToCleanUp: TestUser[] = []

beforeAll(async () => {
  requesterA = await createTestUser('requester-a@rls-test.cycrides.dev')
  requesterB = await createTestUser('requester-b@rls-test.cycrides.dev')
  requesterC = await createTestUser('requester-c@rls-test.cycrides.dev')
  driverD = await createTestUser('driver-d@rls-test.cycrides.dev')
  adminE = await createTestUser('admin-e@rls-test.cycrides.dev')
  userIdsToCleanUp.push(requesterA, requesterB, requesterC, driverD, adminE)

  // The on_auth_user_created trigger already inserted a bare `people` row
  // (role null) for each user above. Finish onboarding via the service_role
  // client - this is fixture setup, not part of what's under test.
  await admin
    .from('people')
    .update({ role: 'requester', name: 'Requester A' })
    .eq('id', requesterA.id)
  await admin
    .from('people')
    .update({ role: 'requester', name: 'Requester B' })
    .eq('id', requesterB.id)
  await admin
    .from('people')
    .update({ role: 'requester', name: 'Requester C' })
    .eq('id', requesterC.id)
  await admin
    .from('people')
    .update({ role: 'driver', name: 'Driver D' })
    .eq('id', driverD.id)
  await admin
    .from('people')
    .update({ is_admin: true, name: 'Admin E' })
    .eq('id', adminE.id)

  const { data: rrAData, error: rrAErr } = await admin
    .from('ride_requests')
    .insert({ person_id: requesterA.id, airport: 'DFW' })
    .select()
    .single()
  if (rrAErr) throw rrAErr
  rrA = rrAData.id

  const { data: rrBData, error: rrBErr } = await admin
    .from('ride_requests')
    .insert({ person_id: requesterB.id, airport: 'DFW' })
    .select()
    .single()
  if (rrBErr) throw rrBErr
  rrB = rrBData.id

  const { data: rrCData, error: rrCErr } = await admin
    .from('ride_requests')
    .insert({ person_id: requesterC.id, airport: 'DAL' })
    .select()
    .single()
  if (rrCErr) throw rrCErr
  rrC = rrCData.id

  const { data: driverRow, error: driverErr } = await admin
    .from('drivers')
    .insert({
      person_id: driverD.id,
      vehicle_make_model: 'Honda Odyssey',
      passenger_capacity: 6,
    })
    .select()
    .single()
  if (driverErr) throw driverErr
  driverRowId = driverRow.id

  const { data: tripRow, error: tripErr } = await admin
    .from('trips')
    .insert({
      driver_id: driverRowId,
      airport: 'DFW',
      direction: 'arrival',
      scheduled_time: new Date().toISOString(),
    })
    .select()
    .single()
  if (tripErr) throw tripErr
  sharedTripId = tripRow.id
})

afterAll(async () => {
  for (const user of userIdsToCleanUp) {
    await deleteTestUser(user)
  }
})

describe('ride_requests: own row access', () => {
  it('requester A can select and update their own ride_requests row', async () => {
    const { data: selectData, error: selectError } = await requesterA.client
      .from('ride_requests')
      .select('*')
      .eq('id', rrA)
    expect(selectError).toBeNull()
    expect(selectData).toHaveLength(1)

    const { data: updateData, error: updateError } = await requesterA.client
      .from('ride_requests')
      .update({ arrival_flight: 'AA100' })
      .eq('id', rrA)
      .select()
    expect(updateError).toBeNull()
    expect(updateData).toHaveLength(1)
    expect(updateData?.[0].arrival_flight).toBe('AA100')
  })

  it("requester A cannot select requester B's row before sharing a trip", async () => {
    const { data, error } = await requesterA.client
      .from('ride_requests')
      .select('*')
      .eq('id', rrB)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})

describe('ride_requests: trip-mate visibility', () => {
  it('A and B can select (but not update) each other once they share a trip', async () => {
    const { error: linkErr } = await admin.from('trip_riders').insert([
      { trip_id: sharedTripId, ride_request_id: rrA, leg: 'arrival' },
      { trip_id: sharedTripId, ride_request_id: rrB, leg: 'arrival' },
    ])
    expect(linkErr).toBeNull()

    const { data: aSeesB, error: aSeesBErr } = await requesterA.client
      .from('ride_requests')
      .select('*')
      .eq('id', rrB)
    expect(aSeesBErr).toBeNull()
    expect(aSeesB).toHaveLength(1)

    const { data: bSeesA, error: bSeesAErr } = await requesterB.client
      .from('ride_requests')
      .select('*')
      .eq('id', rrA)
    expect(bSeesAErr).toBeNull()
    expect(bSeesA).toHaveLength(1)

    // Visible, but not writable: the update matches zero rows rather than
    // erroring, because the USING clause filters the row out of the
    // updatable set - this is standard Postgres RLS UPDATE behavior.
    const { data: updateResult, error: updateErr } = await requesterA.client
      .from('ride_requests')
      .update({ arrival_flight: 'HACKED' })
      .eq('id', rrB)
      .select()
    expect(updateErr).toBeNull()
    expect(updateResult).toHaveLength(0)

    const { data: verifyUnchanged } = await admin
      .from('ride_requests')
      .select('arrival_flight')
      .eq('id', rrB)
      .single()
    expect(verifyUnchanged?.arrival_flight).not.toBe('HACKED')
  })

  it('requester A cannot select or update requester C, who shares no trip with A', async () => {
    const { data: selectData, error: selectErr } = await requesterA.client
      .from('ride_requests')
      .select('*')
      .eq('id', rrC)
    expect(selectErr).toBeNull()
    expect(selectData).toHaveLength(0)

    const { data: updateData, error: updateErr } = await requesterA.client
      .from('ride_requests')
      .update({ arrival_flight: 'HACKED' })
      .eq('id', rrC)
      .select()
    expect(updateErr).toBeNull()
    expect(updateData).toHaveLength(0)
  })
})

describe('ride_companions: owner delete (Prompt #4.5)', () => {
  it("requester A can delete their own companion, but not a companion on B's ride_requests row", async () => {
    const { data: ownCompanion, error: ownInsertErr } = await admin
      .from('ride_companions')
      .insert({ ride_request_id: rrA, name: 'A Companion' })
      .select()
      .single()
    expect(ownInsertErr).toBeNull()

    const { data: othersCompanion, error: othersInsertErr } = await admin
      .from('ride_companions')
      .insert({ ride_request_id: rrB, name: 'B Companion' })
      .select()
      .single()
    expect(othersInsertErr).toBeNull()

    const { error: deleteOthersErr, count: deleteOthersCount } =
      await requesterA.client
        .from('ride_companions')
        .delete({ count: 'exact' })
        .eq('id', othersCompanion!.id)
    expect(deleteOthersErr).toBeNull()
    expect(deleteOthersCount).toBe(0)

    const { data: othersStillThere } = await admin
      .from('ride_companions')
      .select('id')
      .eq('id', othersCompanion!.id)
    expect(othersStillThere).toHaveLength(1)

    const { error: deleteOwnErr, count: deleteOwnCount } =
      await requesterA.client
        .from('ride_companions')
        .delete({ count: 'exact' })
        .eq('id', ownCompanion!.id)
    expect(deleteOwnErr).toBeNull()
    expect(deleteOwnCount).toBe(1)

    const { data: ownGone } = await admin
      .from('ride_companions')
      .select('id')
      .eq('id', ownCompanion!.id)
    expect(ownGone).toHaveLength(0)
  })
})

describe('drivers', () => {
  it('driver D can select all ride_requests regardless of trip membership', async () => {
    const { data, error } = await driverD.client
      .from('ride_requests')
      .select('*')
    expect(error).toBeNull()
    const ids = data?.map((r) => r.id) ?? []
    expect(ids).toEqual(expect.arrayContaining([rrA, rrB, rrC]))
  })

  it('driver D can insert/update their own trips and trip_riders', async () => {
    const { data: newTrip, error: insertTripErr } = await driverD.client
      .from('trips')
      .insert({
        driver_id: driverRowId,
        airport: 'DAL',
        direction: 'departure',
      })
      .select()
      .single()
    expect(insertTripErr).toBeNull()
    expect(newTrip).not.toBeNull()

    const { data: updatedTrip, error: updateTripErr } = await driverD.client
      .from('trips')
      .update({ status: 'completed' })
      .eq('id', newTrip!.id)
      .select()
    expect(updateTripErr).toBeNull()
    expect(updatedTrip?.[0].status).toBe('completed')

    const { error: insertRiderErr } = await driverD.client
      .from('trip_riders')
      .insert({ trip_id: newTrip!.id, ride_request_id: rrC, leg: 'departure' })
    expect(insertRiderErr).toBeNull()
  })

  it('driver D cannot update a trip owned by a different driver', async () => {
    const otherDriverPerson = await createTestUser(
      'driver-other@rls-test.cycrides.dev',
    )
    userIdsToCleanUp.push(otherDriverPerson)
    await admin
      .from('people')
      .update({ role: 'driver', name: 'Other Driver' })
      .eq('id', otherDriverPerson.id)

    const { data: otherDriverRow, error: otherDriverErr } = await admin
      .from('drivers')
      .insert({
        person_id: otherDriverPerson.id,
        vehicle_make_model: 'Toyota Sienna',
        passenger_capacity: 6,
      })
      .select()
      .single()
    expect(otherDriverErr).toBeNull()

    const { data: otherTrip, error: otherTripErr } = await admin
      .from('trips')
      .insert({
        driver_id: otherDriverRow!.id,
        airport: 'DFW',
        direction: 'arrival',
      })
      .select()
      .single()
    expect(otherTripErr).toBeNull()

    const { data: updateResult, error: updateErr } = await driverD.client
      .from('trips')
      .update({ status: 'completed' })
      .eq('id', otherTrip!.id)
      .select()
    expect(updateErr).toBeNull()
    expect(updateResult).toHaveLength(0)

    const { data: verifyUnchanged } = await admin
      .from('trips')
      .select('status')
      .eq('id', otherTrip!.id)
      .single()
    expect(verifyUnchanged?.status).toBe('open')
  })
})

describe('trips: requester visibility (Prompt #4)', () => {
  it('trip-mates A and B can select the shared arrival trip, but C (no shared trip) cannot', async () => {
    const { data: aSeesTrip, error: aErr } = await requesterA.client
      .from('trips')
      .select('*')
      .eq('id', sharedTripId)
    expect(aErr).toBeNull()
    expect(aSeesTrip).toHaveLength(1)

    const { data: bSeesTrip, error: bErr } = await requesterB.client
      .from('trips')
      .select('*')
      .eq('id', sharedTripId)
    expect(bErr).toBeNull()
    expect(bSeesTrip).toHaveLength(1)

    const { data: cSeesTrip, error: cErr } = await requesterC.client
      .from('trips')
      .select('*')
      .eq('id', sharedTripId)
    expect(cErr).toBeNull()
    expect(cSeesTrip).toHaveLength(0)
  })

  it('trip_mates_for_leg returns the other rider on the shared leg, and nothing for a non-member', async () => {
    const { data: aMates, error: aErr } = await requesterA.client.rpc(
      'trip_mates_for_leg',
      { p_trip_id: sharedTripId, p_leg: 'arrival' },
    )
    expect(aErr).toBeNull()
    const aMateIds =
      aMates?.map((m: { ride_request_id: string }) => m.ride_request_id) ?? []
    expect(aMateIds).toEqual(expect.arrayContaining([rrA, rrB]))
    expect(aMateIds).not.toContain(rrC)

    const { data: cMates, error: cErr } = await requesterC.client.rpc(
      'trip_mates_for_leg',
      { p_trip_id: sharedTripId, p_leg: 'arrival' },
    )
    expect(cErr).toBeNull()
    expect(cMates).toHaveLength(0)
  })
})

describe('admin', () => {
  it('admin E can select and update everything across all tables', async () => {
    const { data: people, error: peopleErr } = await adminE.client
      .from('people')
      .select('*')
    expect(peopleErr).toBeNull()
    expect(people?.length).toBeGreaterThan(0)

    const { error: peopleUpdateErr } = await adminE.client
      .from('people')
      .update({ name: 'Renamed By Admin' })
      .eq('id', requesterC.id)
    expect(peopleUpdateErr).toBeNull()

    const { data: rideRequests, error: rrErr } = await adminE.client
      .from('ride_requests')
      .select('*')
    expect(rrErr).toBeNull()
    expect(rideRequests?.length).toBeGreaterThanOrEqual(3)

    const { error: rrUpdateErr } = await adminE.client
      .from('ride_requests')
      .update({ arrival_flight: 'ADMIN-OVERRIDE' })
      .eq('id', rrC)
    expect(rrUpdateErr).toBeNull()

    const { data: drivers, error: driversErr } = await adminE.client
      .from('drivers')
      .select('*')
    expect(driversErr).toBeNull()
    expect(drivers?.length).toBeGreaterThan(0)

    const { error: driverUpdateErr } = await adminE.client
      .from('drivers')
      .update({ vehicle_make_model: 'Admin Edited' })
      .eq('id', driverRowId)
    expect(driverUpdateErr).toBeNull()

    const { data: trips, error: tripsErr } = await adminE.client
      .from('trips')
      .select('*')
    expect(tripsErr).toBeNull()
    expect(trips?.length).toBeGreaterThan(0)

    const { error: tripUpdateErr } = await adminE.client
      .from('trips')
      .update({ status: 'completed' })
      .eq('id', sharedTripId)
    expect(tripUpdateErr).toBeNull()

    const { data: tripRiders, error: tripRidersErr } = await adminE.client
      .from('trip_riders')
      .select('*')
    expect(tripRidersErr).toBeNull()
    expect(tripRiders?.length).toBeGreaterThan(0)
  })
})

describe('anonymous access', () => {
  it('is rejected (zero rows) on every table', async () => {
    const anon = createClient(API_URL, ANON_KEY, {
      auth: { persistSession: false },
    })
    for (const table of TABLES) {
      const { data, error } = await anon.from(table).select('*')
      expect(error).toBeNull()
      expect(
        data,
        `expected zero rows for anonymous select on ${table}`,
      ).toHaveLength(0)
    }
  })
})
