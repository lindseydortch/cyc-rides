import '../setup/localSupabaseEnv'

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

// End-to-end smoke test (Prompt #7): walks the full request -> claim ->
// confirm flow across all three roles, rather than re-testing individual
// pieces already covered by tests/rls.test.ts (RLS) and
// tests/{rides,driver,admin} (component behavior). Runs against a real
// local Supabase instance (`supabase start`) and the Vite dev server -
// nothing here is mocked.
//
// Auth note: this app's only sign-in paths are real LinkedIn OAuth (can't
// be automated) and the fixed 3-account dev bypass on /login (Prompt
// #3.5). Neither lets a test sign in as an arbitrary fresh user, so this
// test creates auth users directly via the service_role client (same
// pattern tests/rls.test.ts uses for its fixture users) and then signs
// each one into the browser by dynamically importing the app's own
// supabaseBrowserClient module from the running Vite dev server and
// calling signInWithPassword() in-page. That's the same code path (and
// therefore the same cookie-based session) a real sign-in produces - no
// hand-rolled cookie format.

const API_URL = process.env.API_URL!
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY!

const PASSWORD = 'e2e-password-123!'
const RUN_ID = Date.now().toString()

const admin = createClient(API_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface FixtureUser {
  id: string
  email: string
}

const createdUserIds: string[] = []

async function createUser(emailPrefix: string): Promise<FixtureUser> {
  const email = `${emailPrefix}-${RUN_ID}@e2e-smoke.cycrides.dev`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard against the admin API's real (wider-than-inferred) error shape
  if (error || !data.user) {
    throw error ?? new Error(`failed to create user ${email}`)
  }
  createdUserIds.push(data.user.id)
  return { id: data.user.id, email }
}

async function setPersonName(id: string, name: string) {
  const { error } = await admin.from('people').update({ name }).eq('id', id)
  if (error) throw error
}

// Signs the browser into `email`/PASSWORD by calling the app's own
// supabaseBrowserClient.auth.signInWithPassword() in-page (see file header
// for why). Requires the Vite dev server to already be serving `/login`
// (or any app route) so the dynamic import resolves against the right
// origin.
async function signInAsUser(page: Page, email: string) {
  await page.goto('/login')
  const errorMessage = await page.evaluate(
    async ({ email: signInEmail, password }) => {
      // Non-literal specifier so tsc doesn't try (and fail) to resolve this
      // as a real module path - it's a browser-side dynamic import served
      // directly by the Vite dev server at runtime, not a Node import.
      const clientModulePath = '/src/lib/supabase/client.ts'
      const mod = (await import(clientModulePath)) as {
        supabaseBrowserClient: {
          auth: {
            signInWithPassword: (creds: {
              email: string
              password: string
            }) => Promise<{ error: { message: string } | null }>
          }
        }
      }
      const { error } = await mod.supabaseBrowserClient.auth.signInWithPassword(
        {
          email: signInEmail,
          password,
        },
      )
      return error ? error.message : null
    },
    { email, password: PASSWORD },
  )
  if (errorMessage)
    throw new Error(`Sign-in failed for ${email}: ${errorMessage}`)
}

test.afterAll(async () => {
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id)
  }
})

test('requester + driver + admin: full request -> claim -> confirm flow', async ({
  browser,
}) => {
  const requesterName = `E2E Requester ${RUN_ID}`
  const driverName = `E2E Driver ${RUN_ID}`
  const arrivalFlight = `CYC${RUN_ID.slice(-4)}`
  const companionName = `E2E Companion ${RUN_ID}`

  // Arrival time far enough in the future to be unambiguous, and distinct
  // per run so the test is safe to re-run without clashing with leftover
  // data from a previous run.
  const arrivalTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  arrivalTime.setSeconds(0, 0)
  const arrivalTimeLocalValue = toDatetimeLocalValue(arrivalTime)

  const requesterUser = await createUser('requester')
  await setPersonName(requesterUser.id, requesterName)

  const driverUser = await createUser('driver')
  await setPersonName(driverUser.id, driverName)

  // Each stage below opens its own context and closes it before the next
  // one starts - only one browser tab is ever open at a time. Running the
  // requester's and driver's tabs concurrently (open side by side for the
  // whole test) overloaded the Vite dev server in practice (fetches
  // aborting, eventual renderer crash); signing back in as the requester
  // for step 3 is functionally equivalent to "reload the status page" -
  // same account, same cookie-based session mechanism, freshly loaded from
  // the database.

  // --- 1. Requester signs up, onboards, submits a ride request with one
  // companion ---
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsUser(page, requesterUser.email)

    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding$/)
    await page.getByRole('button', { name: 'I need a ride' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/request$/)

    await page.getByLabel('Airport').selectOption('DFW')
    const arrivalFieldset = page.locator('fieldset', { hasText: 'Arrival' })
    await arrivalFieldset.getByLabel('Flight number').fill(arrivalFlight)
    await arrivalFieldset
      .getByLabel('Arrival date & time')
      .fill(arrivalTimeLocalValue)
    await page.getByRole('button', { name: '+ Add a companion' }).click()
    await page.getByLabel('Companion 1 name').fill(companionName)
    await page.getByRole('button', { name: 'Submit ride request' }).click()

    // Form is replaced by StatusCards once the request round-trips.
    await expect(page.getByText('Still needs a ride')).toBeVisible()
    await context.close()
  }

  // --- 2. Driver signs up, onboards with vehicle info, creates a matching
  // trip, and adds the requester to it ---
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsUser(page, driverUser.email)

    await page.goto('/')
    await expect(page).toHaveURL(/\/onboarding$/)
    await page.getByRole('button', { name: 'I can drive' }).click()
    await page.getByLabel('Vehicle make & model').fill('Honda CR-V')
    await page.getByLabel('License plate').fill(`E2E-${RUN_ID.slice(-4)}`)
    await page.getByLabel('Passenger capacity').fill('4')
    await page.getByLabel('Luggage capacity').fill('3')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/driver$/)

    await page.getByRole('link', { name: '+ New trip' }).click()
    await expect(page).toHaveURL(/\/driver\/trips\/new$/)
    await page.getByLabel('Airport').selectOption('DFW')
    await page.getByLabel('Direction').selectOption('arrival')
    await page.getByLabel('Scheduled time').fill(arrivalTimeLocalValue)
    await page.getByRole('button', { name: 'Create trip' }).click()
    await expect(page).toHaveURL(/\/driver\/trips\/[^/]+$/)

    const candidateRow = page.locator('li', { hasText: arrivalFlight })
    await expect(candidateRow).toBeVisible()
    await candidateRow.getByRole('checkbox').check()
    await page.getByRole('button', { name: /Add selected riders/ }).click()

    // Confirms the claim round-tripped before moving on, so a failure here
    // doesn't get mis-attributed to the next step.
    await expect(page.getByText(companionName, { exact: false })).toBeVisible()
    await context.close()
  }

  // --- 3. Requester reloads their status page and sees "Ride confirmed"
  // with the correct trip time. (The companion-as-trip-mate check happened
  // in step 2 above, on the driver's trip page - StatusCards' "Riding
  // with:" list is other riders sharing the trip, deliberately excluding
  // the viewer's own ride_request's companions, so a solo requester never
  // sees it populated on their own status page. See mapTripMates in
  // src/lib/rides/server-functions.ts.) ---
  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsUser(page, requesterUser.email)
    await page.goto('/request')

    // Several ancestor <div>s also contain the "Arrival" heading - .last()
    // picks the innermost one, the actual LegCard.
    const arrivalCard = page
      .locator('div', { has: page.getByRole('heading', { name: 'Arrival' }) })
      .last()
    await expect(arrivalCard.getByText('Ride confirmed')).toBeVisible()
    const expectedScheduledTime = arrivalTime.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    await expect(arrivalCard).toContainText(expectedScheduledTime)
    await context.close()
  }

  // --- 4. Admin logs in and sees the request no longer in the
  // "unconfirmed" view, and sees the trip with the rider attached ---
  const adminUser = await createUser('admin')
  const adminName = `E2E Admin ${RUN_ID}`
  const { error: adminPeopleError } = await admin
    .from('people')
    .update({ name: adminName, role: 'driver', is_admin: true })
    .eq('id', adminUser.id)
  if (adminPeopleError) throw adminPeopleError
  const { error: adminDriverError } = await admin.from('drivers').insert({
    person_id: adminUser.id,
    vehicle_make_model: 'Toyota Sienna',
    license_plate: `E2E-ADMIN-${RUN_ID.slice(-4)}`,
    passenger_capacity: 6,
    luggage_capacity: 5,
  })
  if (adminDriverError) throw adminDriverError

  {
    const context = await browser.newContext()
    const page = await context.newPage()
    await signInAsUser(page, adminUser.email)
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin$/)

    // Scoped to each section's own wrapper div (via its heading) rather
    // than indexing raw <table> elements - the ride-requests table doesn't
    // render at all (a "Nothing needs attention." message stands in for
    // it) once its default "needs attention" filter has zero rows, which
    // is exactly the state this test expects to land in.
    const rideRequestsSection = page
      .locator('div', {
        has: page.getByRole('heading', { name: 'Ride requests' }),
      })
      .last()
    const tripsSection = page
      .locator('div', { has: page.getByRole('heading', { name: 'Trips' }) })
      .last()

    await expect(rideRequestsSection).not.toContainText(requesterName)
    await expect(tripsSection).toContainText(driverName)
    await context.close()
  }
})

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
