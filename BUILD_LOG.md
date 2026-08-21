# Build Log

## Prompt #1: Project scaffold + branding + Supabase setup

**Scope:** Scaffolded a new TanStack Start app (`cyc-rides`) with TypeScript and
Tailwind CSS, applied the CYC branding tokens/font/favicon, wired up a Supabase
client (browser + server), added `.env.example`, and stubbed out the route
structure and shared nav layout. No feature logic, no auth flow, no landing
page content — those come in later prompts.

**Routes/files/components introduced:**

- Scaffolded via `@tanstack/cli create` (the current TanStack Start generator;
  `create-tsrouter-app` is deprecated and now defaults to router-only mode
  without Start) — React, ESLint/Prettier toolchain, Nitro deployment
  adapter, no demo examples, git initialized.
- [src/styles.css](src/styles.css) — Tailwind v4 `@theme` block with all
  branding colors as tokens (`--color-background`, `--color-cloud`,
  `--color-navy`, `--color-navy-soft`, `--color-ink`, `--color-muted`,
  `--color-line`, `--color-blue`, `--color-blue-dark`, `--color-green`) plus
  `--font-sans` pointing at Geist Sans. These generate Tailwind utilities
  directly (`bg-cloud`, `text-ink`, `border-line`, `bg-blue`, etc.).
- Geist Sans: self-hosted via `@font-face` rather than the `geist` package's
  Next.js-style `next/font` API (this is Vite, not Next.js). Copied
  `node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2` into
  [public/fonts/Geist-Variable.woff2](public/fonts/Geist-Variable.woff2) and
  declared it as a variable-weight face in styles.css.
- Favicon: [public/favicon.svg](public/favicon.svg) built from lucide-react's
  `Car` icon path data (blue `#0868f7` stroke on a white rounded-square
  background). Rasterized fallbacks generated locally with macOS `sips`:
  [public/favicon.png](public/favicon.png) (32×32),
  [public/favicon.ico](public/favicon.ico) (32×32), and
  [public/apple-touch-icon.png](public/apple-touch-icon.png) (180×180). All
  four are linked from [src/routes/__root.tsx](src/routes/__root.tsx).
- [src/lib/supabase/client.ts](src/lib/supabase/client.ts) — browser Supabase
  client, reads `import.meta.env.SUPABASE_URL` / `SUPABASE_ANON_KEY`, throws
  a clear error if either is missing.
- [src/lib/supabase/server.ts](src/lib/supabase/server.ts) —
  `getSupabaseServerClient()` helper reading `process.env.SUPABASE_URL` /
  `SUPABASE_ANON_KEY` for use in server functions/loaders. Not yet
  cookie/session-aware — that lands with the auth flow.
- [.env.example](.env.example) — `SUPABASE_URL` and `SUPABASE_ANON_KEY`,
  matches the prompt's naming exactly. `.env` is already covered by the
  scaffold's `.gitignore`.
- [src/components/nav.tsx](src/components/nav.tsx) — shared top nav: logo
  (Car icon + "CYC Rides"), links to Request/Driver/Admin, and a
  placeholder user avatar/name + logout button (no real auth wired yet).
  Rendered globally from [src/routes/__root.tsx](src/routes/__root.tsx)
  inside `RootDocument`, so it appears on every route including `/login`.
- Route stubs, all placeholder text only: [src/routes/index.tsx](src/routes/index.tsx),
  [src/routes/login.tsx](src/routes/login.tsx),
  [src/routes/request.tsx](src/routes/request.tsx),
  [src/routes/driver.tsx](src/routes/driver.tsx),
  [src/routes/admin.tsx](src/routes/admin.tsx).

**Assumptions made:**

- `SUPABASE_URL`/`SUPABASE_ANON_KEY` have no `VITE_` prefix, but Vite only
  exposes `VITE_`-prefixed env vars to the client bundle by default. Rather
  than rename the vars (and break the prompt's exact `.env.example` naming),
  added `envPrefix: ['VITE_', 'SUPABASE_']` to
  [vite.config.ts](vite.config.ts) so these two names are exposed as-is. This
  is safe because the anon key is meant to be public. Flag if a `VITE_`
  prefix convention is preferred instead.
- Nav is rendered on every route (including `/login`) rather than only on
  authenticated routes, since there's no auth/route-guard logic yet to
  branch on. This will likely need reworking once the login flow exists (e.g.
  hide nav or swap it for a simpler header on `/login`).
- Route paths taken literally from the prompt: `/request`, `/driver`,
  `/admin` (flat, not nested under a layout route). No route-level access
  control yet — anyone can currently reach any dashboard.
- Used `npm` as the package manager (matches the environment's installed
  tooling; no lockfile or preference existed yet).

**Left as placeholder / open questions:**

- All route bodies are just a heading + "coming in a later prompt" text.
- Nav's user name/avatar/logout button are hardcoded to a "Guest User"
  placeholder — not wired to Supabase auth session state yet.
- No middleware/guards restricting `/driver` or `/admin` to the right roles.
- Server Supabase client has no cookie/session handling — will need revisiting
  once the login flow is built.
- `.cta.json`, `AGENTS.md`, and the generator's default `README.md` were left
  as scaffolded (not customized for CYC Rides) — worth trimming/rewriting
  once the project's shape is more settled.

**Verification:**

- `npx tsc --noEmit` — clean, no errors.
- `npx eslint .` — clean, no errors.
- `npm run build` — production build succeeds (client + SSR bundles).
- `npm run dev` — started locally on port 3000; loaded `/`, `/login`,
  `/request`, `/driver`, `/admin` in a real browser via the preview tool and
  confirmed each renders its placeholder heading, the nav/favicon/branding
  show correctly, and there are no console errors.

## Prompt #2: Database schema + RLS policies

**Scope:** Single SQL migration covering the full schema (`people`,
`ride_requests`, `ride_companions`, `drivers`, `trips`, `trip_riders`), the
`auth.users` → `people` sync trigger, and RLS policies for every table, plus
an automated test suite that actually exercises those policies against a
real local Postgres instance. No frontend/UI changes.

**Routes/files/components introduced:**

- [supabase/migrations/20260820000000_schema_and_rls.sql](supabase/migrations/20260820000000_schema_and_rls.sql)
  — the single migration file: tables, indexes, the `handle_new_user()`
  trigger function + trigger, three `SECURITY DEFINER` helper functions
  (`is_admin()`, `owns_driver()`, `shares_trip_with()`), table-level GRANTs,
  and every RLS policy, each with a comment explaining its intent.
- [supabase/config.toml](supabase/config.toml), `supabase/.gitignore` —
  generated by `supabase init` to run a local Supabase stack via Docker for
  development/testing. `.branches` and `.temp` are gitignored by the
  generator's own `.gitignore`.
- [tests/rls.test.ts](tests/rls.test.ts) — the RLS test suite (Vitest, see
  below for why Vitest over pgTAP).
- [tests/setup/localSupabaseEnv.ts](tests/setup/localSupabaseEnv.ts) — reads
  connection details for the locally running Supabase instance from
  `supabase status -o env` at test-import time, so the suite runs against
  whatever local stack is up without a checked-in `.env` of real credentials.
- `package.json`: added `vitest` as a dev dependency and a `test:rls` script
  (`vitest run tests/rls.test.ts`).

**Testing approach — Vitest, not pgTAP:** The project had no Supabase CLI,
no local Postgres, and no pgTAP tooling set up (this was the first prompt to
touch the database at all). Standing up pgTAP would mean adding a Postgres
extension and a separate test runner/harness on top of a stack this project
otherwise has no other use for. Vitest was already the natural fit (it's
the tool named for later prompts' component tests per CLAUDE.md's testing
strategy), and `@supabase/supabase-js` against a real local Supabase
instance (via `supabase start`) lets the suite authenticate as genuinely
distinct users and hit PostgREST exactly the way the app will — which is a
more faithful test of "can user X actually read/write row Y through the API"
than pgTAP's SQL-level `SET ROLE` simulation would be.

**Judgment calls on RLS policy intent (flagging per CLAUDE.md):**

- **Table-level GRANTs were required but not mentioned in the prompt.**
  Postgres checks table-level privileges _before_ RLS narrows rows — RLS
  alone does nothing if `anon`/`authenticated`/`service_role` have no
  baseline GRANT on the table. This wasn't obvious until the first test run
  failed with `permission denied for table ride_requests`. Added `grant
select, insert, update, delete ... to anon, authenticated, service_role`
  for all six tables; the actual access control is still enforced entirely
  by RLS, this just gives RLS something to narrow.
- **`shares_trip_with()` and `is_admin()` are `SECURITY DEFINER`, not plain
  subqueries.** A naive EXISTS-subquery version of the trip-mate check would
  itself be subject to `trip_riders`' own RLS while evaluating — meaning a
  requester querying for their trip-mate's `ride_requests` row would have
  the inner subquery blocked from seeing the _other_ person's `trip_riders`
  row (trip_riders' policy only grants a requester rows "involving their own
  ride_request"). `SECURITY DEFINER` functions bypass RLS internally (since
  they run as the function owner), which is the standard Supabase pattern
  for exactly this kind of cross-table visibility check. Same reasoning for
  `is_admin()`: a plain subquery against `people` from within `people`'s own
  "admins can select all" policy would recurse into the same RLS check
  indefinitely.
- **Added a driver SELECT policy on `trip_riders` for their own trips**,
  which isn't in the prompt's explicit list (only driver INSERT was
  specified). Without it, a driver could add riders to their own trip but
  never read the passenger list back — that seemed like an unintentional gap
  rather than an intended restriction, so I filled it. Flagging in case the
  omission was deliberate (e.g., passenger lists meant to be admin-curated).
- **`drivers` SELECT is `auth.role() = 'authenticated'`** (any signed-in
  user, any table), exactly as the prompt allowed for MVP simplicity, rather
  than scoping it to "drivers attached to a rider's actual trip." Flagging
  since this means any authenticated requester can browse every driver's
  contact info, not just their own driver's.
- **No role-match enforced at insert time.** E.g. nothing stops a `people`
  row with `role = 'driver'` from inserting a `ride_requests` row (the
  policy only checks `person_id = auth.uid()`, not `role = 'requester'`).
  The prompt described access by table ownership, not by role, so I left
  this unenforced rather than adding an unrequested constraint — but it's a
  gap if the intent was "only requesters have ride_requests, only drivers
  have drivers rows."
- **Admin UPDATE was added to every table** (people, ride_requests,
  ride_companions, drivers, trips, trip_riders), not just the tables where
  the prompt's per-table bullets explicitly said "admins can update" —
  because the test-suite requirements explicitly say "Admin E can SELECT and
  UPDATE everything across all tables." Treated the test spec as the
  authoritative statement of intent where the per-table prose was ambiguous
  (e.g. `ride_companions` and `drivers` UPDATE-by-admin weren't spelled out
  in the per-table bullets but are covered by policies now).

**Left as placeholder / open questions:**

- No `ride_companions`-specific assertions in the test suite beyond what
  "inherits visibility from parent" implies structurally — the prompt's
  explicit test list didn't call out companions directly. The policy itself
  (`ride_companions` SELECT re-checks visibility via an EXISTS against
  `ride_requests`, which composes correctly with `ride_requests`' own RLS)
  is untested by the automated suite; flagging as something to add coverage
  for before relying on it.
- `people.role` allows `null` (pre-onboarding) per the trigger's stated
  behavior, but no RLS policy or CHECK constraint prevents someone from
  never completing onboarding and still, say, owning a `drivers` row insert
  (the `drivers` insert policy only checks `person_id = auth.uid()`). Not
  fixed, since role-gating inserts wasn't asked for — see judgment call
  above.
- Local dev requires Docker + the Supabase CLI (`brew install
supabase/tap/supabase`, `docker`) to run `supabase start` /
  `npm run test:rls`. Neither was present in this environment before this
  prompt; both were installed as part of this session. No `.env` was
  created — the test suite pulls credentials from the running local
  instance instead, so there's still nothing to configure for `npm run dev`
  against a real project.

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint tests/` — clean (one line needed a targeted
  `eslint-disable-next-line` for `no-unnecessary-condition`, where the
  Supabase Admin API's inferred return type is narrower than its actual
  runtime error shape; left a comment explaining why).
- `npx prettier --check` — clean.
- `supabase start` (local Docker stack) → `supabase db reset` (applies the
  migration cleanly from scratch) → `npm run test:rls`: **9/9 tests passed**,
  run twice for repeatability. Confirmed via direct `psql` query that
  `afterAll` cleanup left zero rows in `auth.users`/`people`/`ride_requests`
  between runs.
- Explicitly confirmed scenarios (per the prompt's list): requester A
  self-select/update works; A cannot see B pre-trip; once linked via
  `trip_riders`, A and B can see but not update each other (verified via
  `psql` that the blocked update didn't actually change the row); A still
  cannot see/update C (no shared trip); driver D sees all ride_requests and
  can insert/update trips and trip_riders for their own trips but not
  another driver's trip; admin E can select and update all six tables;
  anonymous requests return zero rows on all six tables.

## Prompt #3: Public landing page, auth (LinkedIn OAuth) + onboarding

**Scope:** Public landing page, LinkedIn OIDC sign-in via Supabase Auth,
first-login profile sync, an onboarding flow that sets `people.role` (and
creates a `drivers` row for drivers), and route guards across every route.
No ride-request/driver/admin dashboard content — those routes still render
their Prompt #1 placeholder bodies, just now behind auth.

**Routes/files/components introduced:**

- [src/routes/index.tsx](src/routes/index.tsx) — public landing page: car
  icon, one-paragraph explanation, "Sign in with LinkedIn" CTA that routes to
  `/login`. `beforeLoad` redirects an already-authenticated visitor to
  `/onboarding` (no role yet) or their role's home.
- [src/routes/login.tsx](src/routes/login.tsx) — "Sign in with LinkedIn"
  button calling `supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc',
options: { redirectTo: '<origin>/auth/callback' } })`. Same
  already-authenticated redirect as `/`.
- [src/routes/auth.callback.tsx](src/routes/auth.callback.tsx) — new route,
  not in the prompt's explicit list but required for the PKCE OAuth code
  flow: exchanges the `?code=` LinkedIn redirects back with for a session
  (server-side, so the session cookie is set before any client code runs),
  then redirects to `/` to let its role-based redirect take over.
- [src/routes/onboarding.tsx](src/routes/onboarding.tsx) — "I need a ride" /
  "I can drive" choice; the driver path shows a form for
  `vehicle_make_model`, `license_plate`, `passenger_capacity`,
  `luggage_capacity`. Submits via a server function, then redirects to
  `/request` or `/driver`.
- [src/lib/auth/server-functions.ts](src/lib/auth/server-functions.ts) —
  `createServerFn` functions: `getAuthSession` (reads the request's cookies,
  returns `{ userId, person }` or `null`), `exchangeCodeForSession`,
  `signOutServer` (unused by the UI — client-side `signOut()` is used
  instead, see below; kept in case a server-triggered sign-out is needed
  later), `completeOnboarding` (updates `people.role`, inserts `drivers` row).
  Named `server-functions.ts`, not `session.server.ts`, because TanStack
  Start's Vite plugin hard-blocks any client-bundle import of files matching
  `*.server.*` — even ones that only export `createServerFn` handlers, which
  are supposed to be safely callable from the client via RPC. Discovered via
  a failed `vite build` (`[import-protection] Import denied in client
environment`).
- [src/lib/auth/route-guards.ts](src/lib/auth/route-guards.ts) —
  `requireSession()` (redirect to `/login` if signed out) and
  `requireOnboardedSession()` (also redirect to `/onboarding` if
  `role` is null), both `throw redirect(...)` for use in a route's
  `beforeLoad`. Used by `/request`, `/driver`, `/admin`, `/onboarding`.
- [src/lib/auth/auth-context.tsx](src/lib/auth/auth-context.tsx) —
  `AuthProvider` + `useAuth()`. Wraps a TanStack Query `useQuery` around
  `getAuthSession` (query key `authSessionQueryKey`), and subscribes to
  `supabase.auth.onAuthStateChange` to invalidate that query + the router on
  sign-in/out (needed because the OAuth callback's redirect happens outside
  React state, so the client needs to notice the session changed).
- [src/lib/auth/types.ts](src/lib/auth/types.ts) — `Person`/`AuthSession`
  types mirroring the `people` row, plus `homeRouteForPerson()`
  (`is_admin` → `/admin`, `role === 'driver'` → `/driver`, else `/request`).
- [src/lib/supabase/client.ts](src/lib/supabase/client.ts) and
  [src/lib/supabase/server.ts](src/lib/supabase/server.ts) — rewritten to use
  `@supabase/ssr`'s `createBrowserClient`/`createServerClient` instead of
  plain `createClient`, so the session lives in cookies readable by both.
  The server client's cookie adapter uses `getCookies`/`setCookie` from
  `@tanstack/react-start/server` — this is what makes SSR `beforeLoad` route
  guards possible (they run before any client JS, so they need the session
  server-side).
- [src/components/nav.tsx](src/components/nav.tsx) — now reads `useAuth()`
  for the real user (avatar, name/initials, working sign-out) instead of the
  Prompt #1 placeholder, and renders `null` entirely on `/`, `/login`,
  `/auth/callback`, `/onboarding` (signed out or mid-onboarding shouldn't
  show a dashboard nav).
- [src/router.tsx](src/router.tsx) creates one `QueryClient` per router
  instance and passes it through router context;
  [src/routes/__root.tsx](src/routes/__root.tsx) reads that context
  (`Route.useRouteContext()`) and wraps the app in `QueryClientProvider` +
  `AuthProvider`.
- [supabase/config.toml](supabase/config.toml) — added the
  `[auth.external.linkedin_oidc]` provider block (`enabled = true`,
  `client_id`/`secret` via `env()` substitution), since it wasn't in the
  Prompt #1/#2 scaffold at all.
- [.env.example](.env.example) — added
  `SUPABASE_AUTH_EXTERNAL_LINKEDIN_OIDC_CLIENT_ID` /
  `_SECRET`, needed by `supabase/config.toml` for local dev only (hosted
  Supabase configures this in the dashboard instead).
- `package.json`: added `@supabase/ssr` and `@tanstack/react-query`.
- [.claude/launch.json](.claude/launch.json) — added so `npm run dev` can be
  previewed via the browser tool (`preview_start`); didn't exist before this
  prompt.

**Assumptions made:**

- **"Your call, pick one" on landing-page sign-in:** went with the CTA
  routing to `/login` rather than triggering `signInWithOAuth` directly from
  `/`, so there's one dedicated page that owns loading/error state for the
  sign-in attempt and matches the prompt's explicit `/login` spec (item 1).
- **Route guards check "signed in + has a role," not "has the right role for
  this specific page."** A requester who manually navigates to `/driver`
  currently isn't blocked — CLAUDE.md's guard spec only says "redirect users
  without a role to /onboarding," not "enforce role-to-route matching."
  Flagging since `/driver` and `/admin` will need real role checks once they
  have actual driver/admin functionality (right now they're still Prompt #1
  placeholder text, so the blast radius of this gap is currently zero).
- **`getAuthSession` re-validates via `supabase.auth.getUser()`** (a network
  round-trip to Supabase Auth) rather than trusting `getSession()`'s
  locally-decoded JWT, per Supabase's own guidance that `getSession()` is
  spoofable server-side. This makes every guarded page load do one extra
  auth call; acceptable for this app's traffic but worth knowing if `/admin`
  etc. ever need to feel snappier.
- **First-login profile sync uses the existing Prompt #2 trigger as-is** —
  `handle_new_user()` already pulls `name`/`avatar_url` from
  `raw_user_meta_data` and `email` from `auth.users`. LinkedIn's OIDC claims
  map to `name` and `picture`; Supabase's LinkedIn OIDC integration is
  documented to normalize `picture` into `avatar_url` in
  `raw_user_meta_data`, so no trigger changes were needed — flagging in case
  the real provider's payload doesn't match and `avatar_url` comes back null
  in practice.

**Left as placeholder / open questions:**

- `/request`, `/driver`, `/admin` still render only their Prompt #1
  placeholder heading — this prompt only added the guards in front of them.
- No role-to-route enforcement (see assumption above) — a signed-in
  requester can currently view `/driver`'s and `/admin`'s placeholder text.
- `signOutServer` (server function) is defined but unused; sign-out is done
  client-side via `supabaseBrowserClient.auth.signOut()` in
  [auth-context.tsx](src/lib/auth/auth-context.tsx) so the browser's cookie
  store updates immediately without a round trip. Remove `signOutServer` if
  nothing ends up needing a server-triggered sign-out.
- **Not live-tested against real LinkedIn OAuth.** No real LinkedIn OAuth app
  exists for this project yet, so local `supabase/config.toml` has
  placeholder `client_id`/`secret` values. Verified as far as: clicking
  "Sign in with LinkedIn" correctly redirects to LinkedIn's real
  `https://api.linkedin.com/oauth/v2/authorization` endpoint with the
  correct `redirect_uri` (Supabase's `/auth/v1/callback`) and `redirect_to`
  (this app's `/auth/callback`) — i.e., the client-side wiring is right up to
  the point LinkedIn takes over. The rest of the flow (LinkedIn login →
  `/auth/callback` code exchange → onboarding → role home) is implemented
  per Supabase's documented PKCE pattern but not exercised end-to-end.
  **Needs a real LinkedIn OAuth app (client ID/secret, configured redirect
  URI) before this can be fully verified**, either locally via
  `supabase/config.toml`/`.env` or in a hosted Supabase project's dashboard.

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint src tests` — clean.
- `npx prettier --check` — clean on all files touched by this prompt (a few
  pre-existing repo files — `README.md`, `CLAUDE.md`, `.cta.json`,
  `tsconfig.json`, `prettier.config.js`, `src/styles.css` — were already
  failing `--check` before this prompt; left untouched, not this prompt's
  scope).
- `npm run build` — production build (client + SSR) succeeds.
- Live-checked in a real browser via the preview tool, local Supabase stack
  (`supabase start`) with `[auth.external.linkedin_oidc]` enabled:
  - `/` renders the landing page with no nav, correct branding/copy, working
    "Sign in with LinkedIn" → `/login` navigation.
  - Unauthenticated `/request`, `/driver`, `/admin`, `/onboarding` all
    redirect to `/login` (confirmed via `location.href` after navigation).
  - Clicking "Sign in with LinkedIn" on `/login` redirects to LinkedIn's
    real authorization endpoint with correct query params (see open
    question above for what wasn't verifiable without real credentials).
  - No console errors other than a one-time Vite cold-start dep-optimize
    warning on first load (unrelated, resolved itself on reconnect).

## Prompt #3.5: Temporary dev auth bypass (until real LinkedIn OAuth is wired)

**Scope:** A local-dev-only sign-in bypass so `/driver` and `/admin` can be
exercised against real Supabase sessions (and therefore real RLS) before a
real LinkedIn OAuth app exists. Purely additive: no changes to RLS policies
or the Prompt #3 LinkedIn auth code.

**Routes/files/components introduced:**

- [scripts/seed-dev-users.ts](scripts/seed-dev-users.ts) — one-off seed
  script, not run automatically. Run it with:
  ```
  supabase start   # if not already running
  npm run seed:dev
  ```
  Pulls the local instance's `service_role` key from `supabase status -o
env` (same pattern as [tests/setup/localSupabaseEnv.ts](tests/setup/localSupabaseEnv.ts)
  — never a checked-in secret) and uses the Admin API to create/update three
  accounts: `dev-requester@example.com` (role `requester`),
  `dev-driver@example.com` (role `driver`, with a placeholder `drivers`
  row), `dev-admin@example.com` (role `driver` **and** `is_admin=true`, also
  with a placeholder `drivers` row, so it can exercise both driver and admin
  views). Idempotent — re-running detects existing accounts by email,
  resets their password to the known dev default, and upserts
  role/`drivers` row, rather than erroring or duplicating.
- [src/lib/auth/dev-accounts.ts](src/lib/auth/dev-accounts.ts) — the shared
  source of truth for the three accounts' emails/roles/driver info and the
  dev password, imported by both the seed script and `/login`, so the two
  can't drift out of sync.
- [src/routes/login.tsx](src/routes/login.tsx) — added a dev-only panel
  below the LinkedIn button, gated on `import.meta.env.DEV` (Vite's
  build-time constant, statically replaced and dead-code-eliminated in
  production builds — not a runtime env-var check, so it's structurally
  impossible for this to ship). Three buttons call
  `supabase.auth.signInWithPassword()` against the seeded accounts, then
  navigate to `/` and let the existing role-based redirect (from Prompt #3)
  take over — same landing behavior as a real login.
- `package.json`: added a `seed:dev` script (`node
scripts/seed-dev-users.ts`). No new dependency — Node 24's built-in
  TypeScript support runs the `.ts` file directly.

**Assumptions made:**

- **Visual distinction:** the dev panel is a dashed amber/orange box with a
  "DEV ONLY — NOT REAL AUTH" warning-icon label and amber-outlined buttons
  (`Dev: sign in as ___`), placed below and visually separated from the
  solid blue LinkedIn button — chosen so it reads as clearly non-production
  even in a cropped screenshot, per the prompt's requirement.
- **Password reuse across re-seeds:** re-running the seed script resets the
  seeded accounts' passwords to the same known dev default rather than
  leaving a possibly-drifted password in place — treated "if they don't
  already exist" as "get them into a known-good state," since the whole
  point is a predictable local fixture.
- **Admin account gets a `drivers` row too** (not just `is_admin=true`),
  matching the prompt's explicit note that this should "exercise both
  driver and admin views, matching how the real admin account works" — a
  real admin who is also a driver would have gone through the driver
  onboarding form and have a `drivers` row.

**Left as placeholder / open questions:**

- The seed script's `findUserByEmail` pages through `listUsers()` since the
  Admin API has no get-by-email lookup — fine at this scale (a handful of
  local accounts) but would need a different approach if ever reused
  against an instance with many users.
- This whole prompt is explicitly temporary — once a real LinkedIn OAuth
  app is set up (Final step A), the dev panel and seed script can be
  deleted along with this BUILD_LOG entry's relevance, though nothing
  requires deleting them (the `import.meta.env.DEV` gate means they're
  inert in any deployed build regardless).

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint src scripts tests` — clean (one
  `eslint-disable-next-line @typescript-eslint/no-unnecessary-condition` in
  the seed script, same justification as the existing one in
  `tests/rls.test.ts` — the Admin API's inferred return type is narrower
  than its real runtime error shape).
- `npx prettier --write` — clean.
- `npm run build` — production build succeeds. Grepped the built
  `dist/client` and `dist/server` output for `"Dev: sign in"`,
  `DEV_PASSWORD`, and the seeded email addresses — **zero matches**,
  confirming the dev panel is fully stripped from production output, not
  just hidden.
- `npm run seed:dev` against the local Supabase stack — ran twice
  (confirmed idempotent: second run reports "already existed" for all
  three and resets passwords rather than erroring). Verified via direct
  `psql` query that all three `people` rows and both `drivers` rows
  (driver, admin) landed with the expected `role`/`is_admin`/vehicle values.
- Live-checked in a real browser via the preview tool: `/login` renders the
  dashed amber dev panel below the LinkedIn button; clicking "Dev: sign in
  as Driver" signs in with a real Supabase session and lands on `/driver`
  with the nav showing "Dev Driver"/"DD" (real session data, not a
  placeholder); "Log out" correctly clears the session and redirects back
  to `/login` (via the existing route guard re-running on `router.invalidate()`,
  not new logout logic); "Dev: sign in as Admin" lands on `/admin` (correct
  `is_admin` → `/admin` routing from `homeRouteForPerson`).

## Prompt #4: Requester flow

**Scope:** The requester-facing `/request` page: a ride-request form (shown
until the requester has a `ride_requests` row) that folds into two status
cards (Arrival/Departure) once submitted, per the prompt's "fold into
`/request`" option — no separate `/status` route. Also closed an RLS gap
(below) that Prompt #4 needs but Prompt #2 didn't provide. No driver/admin
dashboard work — those routes are untouched.

**Routes/files/components introduced:**

- [supabase/migrations/20260821000000_requester_trip_visibility.sql](supabase/migrations/20260821000000_requester_trip_visibility.sql)
  — see "RLS gap" below.
- [src/lib/rides/types.ts](src/lib/rides/types.ts) — shared `Airport`,
  `Leg`, `RideRequestStatus`, `LegStatus`, `TripMate` types.
- [src/lib/rides/query-keys.ts](src/lib/rides/query-keys.ts) —
  `rideStatusQueryKey`, shared between the query and the form's
  invalidate-on-success.
- [src/lib/rides/server-functions.ts](src/lib/rides/server-functions.ts) —
  `getMyRideStatus` (GET: own `ride_requests` row + companions, and for each
  confirmed leg, the trip's `scheduled_time` + trip-mates; returns `null` if
  the requester hasn't submitted yet) and `createRideRequest` (POST: inserts
  `ride_requests` + `ride_companions` rows). Also exports `mapTripMates`, a
  pure function pulled out specifically so trip-mate shaping/self-exclusion
  has direct unit-test coverage without needing a real request/cookie
  context (see testing notes below).
- [src/components/rides/RequestForm.tsx](src/components/rides/RequestForm.tsx)
  — airport select, arrival/departure flight+datetime fields, repeatable
  companion name fields (add/remove), client-side required-field validation
  before calling `createRideRequest`.
- [src/components/rides/StatusCards.tsx](src/components/rides/StatusCards.tsx)
  — Arrival/Departure cards; confirmed legs show "Ride confirmed" + scheduled
  time + a trip-mates list (only rendered when non-empty); unconfirmed legs
  show "Still needs a ride".
- [src/routes/request.tsx](src/routes/request.tsx) — `useQuery(getMyRideStatus)`
  and renders `RequestForm` or `StatusCards` based on whether a
  `ride_requests` row exists yet.
- [vitest.config.ts](vitest.config.ts) — new: `jsdom` environment,
  `globals: true` (required for `@testing-library/react`'s auto-cleanup
  between tests — without it, DOM nodes leaked across tests in the same
  file and caused false "multiple elements found" failures), and a setup
  file for jest-dom matchers. `tests/rls.test.ts` is unaffected: tagged
  `// @vitest-environment node` so it keeps running under plain Node against
  the real local Supabase stack, not jsdom.
- [tests/setup/rtl.ts](tests/setup/rtl.ts) — imports
  `@testing-library/jest-dom/vitest`.
- [tests/rides/RequestForm.test.tsx](tests/rides/RequestForm.test.tsx),
  [tests/rides/StatusCards.test.tsx](tests/rides/StatusCards.test.tsx),
  [tests/rides/mapTripMates.test.ts](tests/rides/mapTripMates.test.ts) — see
  Verification below for what each covers.
- `package.json`: added `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event`, `jsdom` as dev dependencies; added `test`
  (all vitest files) and `test:components` (`tests/rides` only) scripts.
  `test:rls` untouched.

**RLS gap found and closed (flagging per CLAUDE.md):** Prompt #2's RLS,
as written, couldn't actually support what Prompt #4 asks for:

- `trips` had **no SELECT policy for requesters at all** — only drivers and
  admins could read a `trips` row, so a requester had no way to fetch their
  own assigned trip's `scheduled_time`.
- The existing "requesters can select trip-mates' ride_requests" policy
  (via `shares_trip_with`) matches on _any_ shared trip across _both_ legs,
  not the specific leg being displayed — using it directly would either
  under-scope (can't tell which leg a visible trip-mate row belongs to) or
  over-expose (their other leg's flight details, which they only see because
  of unrelated trip overlap). And `trip_riders` SELECT is restricted to rows
  tied to the caller's _own_ `ride_request_id`, so it can't be queried to
  enumerate _other_ riders on a trip at all — confirmed by trying the literal
  "query trip_riders joined to ride_requests" approach the prompt describes
  and watching RLS filter it down to just the caller's own row.

  Fixed both with [supabase/migrations/20260821000000_requester_trip_visibility.sql](supabase/migrations/20260821000000_requester_trip_visibility.sql):
  a `requesters can select trips they're riding on` SELECT policy on
  `trips`, and a `trip_mates_for_leg(trip_id, leg)` SECURITY DEFINER
  function (same pattern as Prompt #2's `shares_trip_with`/`is_admin`) that
  returns only _names_ (not full `ride_requests` rows) for riders/companions
  on one specific trip+leg, and only if the caller is themselves confirmed
  on that exact trip+leg. This is narrower than the existing ride_requests
  trip-mate policy, not a replacement for it.
  - **First version of the `trips` policy caused infinite recursion**
    (`infinite recursion detected in policy for relation "trips"`, caught by
    the existing anonymous-access RLS test): a plain EXISTS subquery against
    `trip_riders` re-triggers `trip_riders`' own SELECT policies, which query
    `trips` via `owns_driver`, which re-triggers the policy under test,
    forever. Fixed by wrapping it in a new SECURITY DEFINER function
    (`rides_on_trip`), same fix pattern Prompt #2 already used for
    `shares_trip_with`/`is_admin` and for the same reason.
  - Added RLS test coverage for both the new policy and the new RPC to
    [tests/rls.test.ts](tests/rls.test.ts) (trip-mates can select the shared
    trip, a non-member can't; `trip_mates_for_leg` returns the right rider
    for a member and nothing for a non-member) — this is schema/security
    surface, so per CLAUDE.md's testing strategy it belongs in the
    non-negotiable RLS tier, not left to the component tests.

**Assumptions made:**

- **All five request-form fields are required** (airport, arrival
  flight+datetime, departure flight+datetime) — the prompt lists these as
  "the form" without saying any are optional. Went with "collect both legs
  up front" rather than "let a requester submit with only one leg filled
  in," since CLAUDE.md's testing requirement ("the request form validates
  required fields before submit") reads as expecting a real required-field
  set to test against. Flagging in case some attendees only need one leg
  and should be able to submit a partial request.
- **Companions are optional** and blank-named companion fields are silently
  dropped on submit (trimmed, filtered) rather than blocking submission —
  the prompt frames this as an "add if needed" field, not a required one.
- **Trip-mates list only shows _other_ riders**, not the requester
  themselves — `mapTripMates` explicitly excludes the caller's own
  `ride_request_id` from the RPC result. "List the other riders" in the
  prompt read as excluding self.
- **No edit/resubmit flow** — once a `ride_requests` row exists, the page
  always shows `StatusCards`, with no way to go back and change flight
  details from the UI. Not mentioned in the prompt; flagging as a likely
  future need (e.g. a flight delay).

**Left as placeholder / open questions:**

- No `/status` route was added — folded into `/request` per the prompt's
  explicit "or fold into /request once submitted" option. If a dedicated
  `/status` URL is wanted later (e.g. to link to from a confirmation email),
  it'd just be a thin route around the same `getMyRideStatus` query.
- `RequestForm`'s date/time inputs are plain `<input type="datetime-local">`
  with no timezone selector — submitted as `new Date(value).toISOString()`,
  i.e. interpreted in the browser's local timezone. Fine for a single-city
  conference audience but worth flagging if riders are expected to enter
  flight times while still in a different timezone.
- The new `trip_mates_for_leg` RPC's authorization check (`exists (select 1
from trip_riders mine join ride_requests my_rr ...)`) duplicates the shape
  of `rides_on_trip`/`shares_trip_with`; didn't consolidate into one shared
  helper since the two check slightly different things (leg-specific vs.
  leg-agnostic) and the RLS helper functions in Prompt #2 were already kept
  one-purpose-each rather than parameterized.

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint src tests vitest.config.ts` — clean.
- `npx prettier --check` — clean on all files touched by this prompt.
- `npm run build` — production build (client + SSR) succeeds.
- `supabase db reset` (applies both migrations cleanly from scratch) →
  `npm run test:rls`: **11/11 passed** (9 from Prompt #2 + 2 new for this
  prompt's RLS fix), confirming the recursion bug is actually fixed and
  the old scenarios still hold.
- `npx vitest run` (`tests/rides/*`): **9/9 passed** —
  `RequestForm.test.tsx`: required-field validation blocks submit and shows
  per-field errors; a fully-filled form calls `createRideRequest` with the
  right payload; adding/removing a companion field works (typed value is
  gone after removal, remaining field re-indexes correctly).
  `StatusCards.test.tsx`: unconfirmed legs show "Still needs a ride" and no
  "Ride confirmed" anywhere; a confirmed leg shows "Ride confirmed" +
  trip-mate name + trip-mate's companion name, while the _other_, still
  unconfirmed leg correctly still shows "Still needs a ride" next to it (i.e.
  the two cards render independently); a confirmed leg with an empty
  trip-mates array renders no "Riding with" section at all.
  `mapTripMates.test.ts`: given a raw RPC row set, correctly excludes the
  caller's own `ride_request_id`, maps the remaining rows to the UI shape,
  and defaults a `null` `companion_names` to `[]` — this is the "right
  people, no extra broadening query" coverage CLAUDE.md's testing strategy
  asks for; it's a pure-function test specifically so it doesn't depend on
  mocking Supabase/cookies to exercise the exclusion logic.
- Live-checked in a real browser via the preview tool against the local
  Supabase stack, signed in as the seeded dev requester
  (`npm run seed:dev`):
  - Fresh account with no `ride_requests` row → sees `RequestForm`; filled
    in airport/flights/dates + one companion, submitted, page re-rendered
    as `StatusCards` with both legs "Still needs a ride" (confirmed the
    `getMyRideStatus` query invalidation on submit works).
  - Manually confirmed the arrival leg via direct SQL (inserted a
    `trips`/`trip_riders` row, matching what the driver flow will do once
    built) → reloaded `/request` → arrival card correctly flipped to "Ride
    confirmed" with the scheduled time, departure card stayed "Still needs a
    ride" independently.
  - Added a second rider (the seeded admin account, itself given a
    `ride_requests` row + companion) to the same trip/leg via SQL → reloaded
    → arrival card's "Riding with" list correctly showed that rider's name
    and their companion's name, confirming `trip_mates_for_leg` and the UI
    wiring work end-to-end, not just against mocked data. Test fixture rows
    were deleted afterward and `supabase db reset` re-run to leave the local
    DB clean for the next session.

## Prompt #4.5: Allow partial ride requests + edit flow

**Scope:** Two changes to the Prompt #4 requester flow: (1) a `ride_requests`
row can now have only one leg filled in (arrival OR departure, not both
required), with a new "Not requested" status-card state distinct from
"Still needs a ride"; (2) an edit flow that reuses `RequestForm` in an "edit"
mode to update an existing request (airport, both legs, companions),
including a warning banner when editing a leg a driver is already assigned
to. No driver/admin dashboard changes.

**Routes/files/components introduced or changed:**

- [supabase/migrations/20260822000000_ride_companions_delete.sql](supabase/migrations/20260822000000_ride_companions_delete.sql)
  — see "RLS gap" below.
- [src/lib/rides/types.ts](src/lib/rides/types.ts) — added `LegStatus.requested`
  (distinct from `confirmed`): true once a leg's flight+time are both set,
  regardless of whether a driver has been assigned yet.
- [src/lib/rides/server-functions.ts](src/lib/rides/server-functions.ts) —
  `getMyRideStatus` now computes `requested` per leg (`arrival_flight !==
null && arrival_time !== null`, same for departure) and threads it through
  `loadLegStatus`. `CreateRideRequestInput` was replaced by
  `RideRequestFormInput`, shared between create and update, with
  `arrivalFlight`/`arrivalTime`/`departureFlight`/`departureTime` all
  `string | null` (a leg is only non-null as a matched pair). Added
  `updateRideRequest` (POST: updates the caller's existing `ride_requests`
  row by `person_id`, deliberately does not touch `trip_riders`/`trips` even
  if a leg being edited is already confirmed - see the prompt's explicit "no
  reassignment logic" instruction). Added `replaceCompanions` (delete-all,
  then re-insert non-blank names), used by both `createRideRequest` (was a
  no-op insert-if-any-names before, functionally unchanged) and the new
  `updateRideRequest`.
- [src/components/rides/RequestForm.tsx](src/components/rides/RequestForm.tsx)
  — reworked substantially:
  - `legFillState(flight, time)` classifies each leg as `empty` / `partial`
    / `complete`; validation now only errors on `partial` (mismatched
    pair) or on both legs being `empty` (form-level "Add at least one leg"
    error) — airport is still unconditionally required.
  - New `mode`/`initialData`/`confirmedLegs`/`focusLeg`/`onSuccess`/
    `onCancel` props. `mode: 'edit'` prefills all fields from `initialData`,
    calls `updateRideRequest` instead of `createRideRequest`, renders a
    "Cancel" button, and shows the warning banner
    ("A driver is already assigned to this leg...") above whichever
    fieldset(s) `confirmedLegs` marks true.
  - `focusLeg` autofocuses that leg's flight-number input on mount (used
    when entering edit mode from a "Not requested" leg's "+ Add this leg"
    action, so the requester lands on the field they meant to fill in).
- [src/components/rides/StatusCards.tsx](src/components/rides/StatusCards.tsx)
  — `LegCard` now has three states instead of two: `confirmed` → "Ride
  confirmed" (unchanged), `requested && !confirmed` → "Still needs a ride"
  (unchanged), `!requested` → new "Not requested" state with a "+ Add this
  leg" button. Added an "Edit request" button (`onEditRequest`) above both
  cards.
- [src/routes/request.tsx](src/routes/request.tsx) — now owns `isEditing`/
  `focusLeg` state and switches between `StatusCards` and `RequestForm
mode="edit"`. Added `toDatetimeLocalValue()` (ISO → the browser-local
  `yyyy-MM-ddTHH:mm` string `<input type="datetime-local">` expects - not
  the same as `toISOString()`, which is UTC) and `toInitialData()` to build
  `RequestForm`'s `initialData` from `getMyRideStatus`'s result.

**RLS gap found and closed (flagging per CLAUDE.md, same pattern as Prompt
#4's fix):** `ride_companions` had SELECT/INSERT/UPDATE policies from
Prompt #2 but **no DELETE policy at all**. The table-level GRANT already
covers DELETE for `authenticated`, but RLS defaults to denying any operation
without an explicit permissive policy, so removing a companion during edit
would have silently deleted zero rows. Added
[supabase/migrations/20260822000000_ride_companions_delete.sql](supabase/migrations/20260822000000_ride_companions_delete.sql):
an owner-only DELETE policy, matching the existing owner
INSERT/UPDATE policies on the same table exactly. Added RLS test coverage:
requester A can delete their own companion; the same delete against B's
companion matches zero rows (confirmed both via the delete response's
`count` and by re-selecting the row with the service-role client).

**Migration check per the prompt's explicit instruction:** confirmed
`ride_requests.arrival_flight` / `arrival_time` / `departure_flight` /
`departure_time` were already nullable in Prompt #2's original migration (no
`not null` constraint) — no schema change needed for partial requests
themselves, only the `ride_companions` DELETE gap above.

**Assumptions made:**

- **A leg counts as "requested" only when both flight and time are
  non-null** (`arrivalRequested = arrival_flight !== null && arrival_time
!== null`), not "either one." Since `RequestForm` only ever submits a leg
  as a matched pair (both-null or both-filled), these should never
  disagree in practice; used the stricter AND so a hypothetical
  direct-DB edit leaving one field null doesn't get miscounted as
  "requested."
- **Companion edits are a full replace, not a diff** (delete all existing,
  re-insert the current list) rather than tracking companion ids through
  the form — the repeatable-field UI Prompt #4 built only ever tracked
  companions as a flat name list with no ids, and the prompt says to reuse
  that UI rather than rebuild it. Flagging in case a future prompt wants
  companion identity preserved across edits (e.g. per-companion trip
  assignment) — this replace-based approach doesn't preserve any companion
  `id` across a save.
- **"Add this leg" and "Edit request" open the same form/mode** — both set
  `isEditing = true`; "Add this leg" additionally passes `focusLeg` so the
  requester's cursor lands on the leg they clicked, but the form itself
  doesn't have a separate reduced "just this leg" view. Simpler than
  building two different edit surfaces, and the prompt's wording ("routes
  into the edit flow below, pre-filling just that leg") reads as compatible
  with this — the _other_ leg's existing data is preserved either way,
  which is the part that actually matters.
- **The warning banner is per-leg-fieldset, not a single page-level
  banner** — shown above the Arrival fieldset when `confirmedLegs.arrival`
  is true, and independently above Departure when `confirmedLegs.departure`
  is true, so a request with only one confirmed leg doesn't show a
  misleading blanket warning next to the unconfirmed leg's fields.
- **No confirmation step before submitting a change to a confirmed leg** —
  the warning banner is informational only; saving still goes through in
  one click, per the prompt's explicit "simple for MVP" instruction.

**Left as placeholder / open questions:**

- Editing a confirmed leg's time doesn't do anything beyond the warning —
  no driver notification, no visible "you changed this after confirmation"
  marker on the driver/admin side (those dashboards don't exist yet). Purely
  informational per the prompt's instruction not to build reassignment
  logic.
- No character/format validation on flight numbers beyond "non-empty" —
  unchanged from Prompt #4, not in scope for this prompt either.
- `RequestForm`'s `focusLeg` only autofocuses on mount; if a requester is
  already mid-edit and clicks a different "Add this leg" entry point (not
  currently possible from the UI, since `StatusCards` isn't rendered while
  editing), it wouldn't re-focus. Not reachable through the current UI, so
  left as-is rather than adding an effect dependency for a state that can't
  occur.

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint src tests vitest.config.ts` — clean.
- `npx prettier --check` — clean on all files touched by this prompt.
- `npm run build` — production build (client + SSR) succeeds.
- `supabase db reset` (applies all three migrations cleanly from scratch) →
  `npm run test:rls`: **12/12 passed** (11 from Prompts #2/#4 + 1 new for
  the `ride_companions` DELETE policy).
- `npx vitest run` (`tests/rides/*`): **18/18 passed** (up from 9) —
  `RequestForm.test.tsx`: airport + "at least one leg" required when
  nothing is filled in; a partially-filled leg (flight without a
  date/time) is flagged as incomplete rather than silently accepted or
  silently dropped; submitting with only one leg filled succeeds and sends
  the other leg's fields as `null`; both-legs-filled still works; companion
  add/remove unchanged from Prompt #4; edit-mode prefill from
  `initialData` + changing a value + submit calls `updateRideRequest` (not
  `createRideRequest`) with the updated payload and fires `onSuccess`;
  Cancel calls `onCancel`; the confirmed-leg warning banner appears exactly
  once when only `confirmedLegs.arrival` is true, and not at all when
  neither leg is confirmed.
  `StatusCards.test.tsx`: "Not requested" renders (with a working "+ Add
  this leg" button that calls `onAddLeg` with the correct leg) for legs
  with no flight info; "Still needs a ride" is shown once a leg is
  requested but unconfirmed, and is distinguishable from "Not requested" on
  the _other_ leg rendered alongside it; confirmed-leg rendering (scheduled
  time, trip-mates) unchanged from Prompt #4; "Edit request" click fires
  `onEditRequest`.
- Live-checked in a real browser via the preview tool against the local
  Supabase stack, signed in as the seeded dev requester:
  - Submitted a request with only the arrival leg filled in (departure left
    entirely blank) → correctly landed on `StatusCards` showing Arrival
    "Still needs a ride" and Departure "Not requested" with a "+ Add this
    leg" button — confirming partial requests work end-to-end, not just in
    the mocked component tests.
  - Clicked "+ Add this leg" on the Departure card → edit form opened with
    Arrival's existing AA123/date prefilled and the Departure flight-number
    field auto-focused and empty, exactly as intended → filled in the
    departure leg and saved → both legs correctly showed "Still needs a
    ride" afterward.
  - Confirmed the arrival leg via direct SQL (same pattern as Prompt #4's
    verification) → reopened "Edit request" → confirmed the warning banner
    rendered above the Arrival fieldset only, with the Departure fieldset
    (still unconfirmed) showing no banner, both legs' current values still
    correctly prefilled from the prior edit → clicked Cancel → returned to
    `StatusCards` unchanged. Test fixture rows were deleted afterward and
    `supabase db reset` re-run to leave the local DB clean for the next
    session.

## Prompt #5: Driver flow

**Scope:** The driver-facing `/driver` dashboard, `/driver/trips/new` (create
a trip), and `/driver/trips/:tripId` (add riders + mark complete), plus a
role-specific route guard on top of Prompt #3's "signed in + has a role"
guards. No requester/admin changes beyond the RLS/RPC additions this flow
needed.

**Routes/files/components introduced:**

- [src/lib/auth/route-guards.ts](src/lib/auth/route-guards.ts) —
  `requireDriverSession()`: calls `requireOnboardedSession()`, then redirects
  to `homeRouteForPerson(person)` if `role !== 'driver'` and `!is_admin`.
  Used by the `/driver` layout route only (its children inherit the guard
  via TanStack Router's parent `beforeLoad`, so they don't call it again).
- [supabase/migrations/20260823000000_driver_trip_flow.sql](supabase/migrations/20260823000000_driver_trip_flow.sql)
  — see "RLS/RPC gaps" below.
- [src/lib/driver/types.ts](src/lib/driver/types.ts) — `Trip`, `TripRider`,
  `DriverCapacity`, `DriverTripsOverview`, `RideCandidate`, `TripDetail`.
- [src/lib/driver/query-keys.ts](src/lib/driver/query-keys.ts) —
  `driverTripsQueryKey`, `driverTripDetailQueryKey(tripId)`.
- [src/lib/driver/server-functions.ts](src/lib/driver/server-functions.ts) —
  `getMyDriverTrips` (GET: own trips grouped by `status`, each with its
  riders via the new `driver_trip_riders` RPC), `createTrip` (POST: inserts
  into `trips` with `driver_id` from the caller's own `drivers` row),
  `getTripDetail` (GET: one trip + its current riders + unclaimed candidates
  via the new `unclaimed_ride_requests` RPC, skipped for a completed trip),
  `addTripRiders` (POST: inserts `trip_riders` rows + flips the leg-correct
  `ride_requests` confirmed flag), `completeTrip` (POST: sets
  `trips.status = 'completed'`). Also exports four pure helpers pulled out
  specifically for direct unit-test coverage without a real Supabase/cookie
  context, same reasoning as Prompt #4's `mapTripMates`: `ridersForTrip`
  (groups the RPC's flat rows by trip), `buildTripInsert` (driver_id +
  form fields → insert payload), `confirmedColumnForLeg` (leg →
  `arrival_ride_confirmed`/`departure_ride_confirmed`), `buildTripRiderInserts`
  (selected ids → `trip_riders` insert rows).
- [src/components/driver/TripForm.tsx](src/components/driver/TripForm.tsx),
  [AddRidersForm.tsx](src/components/driver/AddRidersForm.tsx),
  [CompleteTripButton.tsx](src/components/driver/CompleteTripButton.tsx),
  [DriverTripCard.tsx](src/components/driver/DriverTripCard.tsx) — presentational
  components, each owning its own mutation (`useMutation`), matching the
  RequestForm/StatusCards split from Prompt #4.
- [src/routes/driver.tsx](src/routes/driver.tsx) — now a **pathless layout**
  (`beforeLoad` + `<Outlet />` only); the actual dashboard moved to
  [src/routes/driver.index.tsx](src/routes/driver.index.tsx). See "layout
  restructure" below for why.
- [src/routes/driver.trips.new.tsx](src/routes/driver.trips.new.tsx),
  [src/routes/driver.trips.$tripId.tsx](src/routes/driver.trips.$tripId.tsx)
  — the create-trip and trip-detail/add-riders pages, both children of the
  `/driver` layout (no `beforeLoad` of their own).
- [package.json](package.json) — `test:components` now also runs
  `tests/driver`.

**RLS/RPC gaps found and closed (flagging per CLAUDE.md, same pattern as
Prompts #4/#4.5):** the existing RLS from Prompts #2/#4 couldn't support what
this prompt asks for:

- **No policy let a driver UPDATE a `ride_requests` row they don't own** —
  needed to flip `arrival_ride_confirmed`/`departure_ride_confirmed` when
  claiming a rider. Added a broad "drivers can update ride_requests" policy
  (any driver, any row/column), matching the same MVP-simplicity precedent
  already set by Prompt #2's "drivers can select all ride_requests" and
  "authenticated users can select all drivers" - not scoped to "only the
  leg/columns being confirmed."
- **Reading rider names requires joining `people`**, which drivers have no
  SELECT policy for beyond their own row - same gap Prompt #4 hit for
  trip-mates. Fixed the same way (a narrow `SECURITY DEFINER` RPC rather than
  a broad "drivers can select all people" policy): `driver_trip_riders()`
  returns rider name/companions/flight/flight-time for every trip owned by
  the caller (via `owns_driver`), and `unclaimed_ride_requests(airport,
  direction, reference_time)` returns unclaimed candidates for a leg,
  restricted to callers who own a `drivers` row (a non-driver caller gets
  zero rows back, not an error), sorted by proximity of flight time to the
  trip's `scheduled_time`.
- Added RLS test coverage for both RPCs and the new policy to
  [tests/rls.test.ts](tests/rls.test.ts): a driver sees a fully-requested
  unclaimed leg as a candidate, a non-driver gets nothing back from either
  RPC, claiming a rider (insert `trip_riders` + update the confirmed flag as
  the app's `addTripRiders` does) removes them from future candidate lists,
  and `driver_trip_riders()` returns the claimed rider's correct
  name/flight/time scoped to the calling driver's own trips.

**Layout restructure (flagging - not something the prompt anticipated):**
`driver.trips.new.tsx` and `driver.trips.$tripId.tsx` are TanStack Router
children of `/driver` under the flat-file dot convention (same convention
this project already used for `auth.callback.tsx`, but this is the first time
a *parent* route file for that prefix also exists). A child route only
renders inside its parent's `<Outlet />` - the original `driver.tsx` rendered
full dashboard content with no Outlet, so `/driver/trips/new` would have
silently rendered nothing. Fixed by moving the dashboard into
`driver.index.tsx` (the `/driver` index child) and reducing `driver.tsx` to a
pathless layout (`beforeLoad` + `<Outlet />`). This also let the child routes
drop their own redundant `requireDriverSession()` call, since the layout's
`beforeLoad` already covers the whole section - one less auth round-trip per
navigation within `/driver/*`.

**Build-breaking discovery (flagging - not obvious from any error message):**
a top-level type alias `type SupabaseServerClient = ReturnType<typeof
getSupabaseServerClient>` in
[server-functions.ts](src/lib/driver/server-functions.ts) caused
`npm run build` to fail with `[import-protection] Import denied in client
environment` - TanStack Start's client/server code-splitting transform
apparently doesn't handle a *named* top-level type alias built from
`typeof <server-only import>` the same way it handles the type expression
inlined directly in each function's parameter position (which is what
[rides/server-functions.ts](src/lib/rides/server-functions.ts) already does
and always has). Bisected by trimming the file down to progressively smaller
reproductions until isolating this one line; fixed by inlining
`ReturnType<typeof getSupabaseServerClient>` at each use site instead of a
named alias. Flagging this as a real footgun for future server-functions
files in this codebase - stick to the inline form.

**Assumptions made:**

- **Dashboard grouping is "upcoming" = `status = 'open'`, "completed" =
  `status = 'completed'`** - the schema only has those two states, so
  "upcoming" isn't actually time-based (a past-dated open trip still shows as
  upcoming). Matches the schema as given rather than adding an unrequested
  third state or time-based filtering.
- **The passenger-capacity "running counter" sums `RideCandidate.partySize`
  (1 + companion count) for selected candidates; luggage capacity is shown as
  a static reference number, not a counter** - the schema has no per-request
  luggage estimate to sum against, only a driver-level `luggage_capacity`
  total. Interpreted "running counter against passenger_capacity and
  luggage_capacity" as "show both numbers for reference, but only passengers
  actually have a per-rider quantity to run a counter against."
- **`unclaimed_ride_requests` requires both the flight number and time to be
  set AND the confirmed flag false AND no existing `trip_riders` row for that
  leg** - the prompt listed all of these explicitly ("where the relevant
  confirmed flag is false and there's no existing trip_riders row"); using
  the same both-fields-set definition of "requested" that Prompt #4.5
  established for `getMyRideStatus`.
- **A completed trip's detail page skips the `unclaimed_ride_requests` RPC
  call entirely** (returns an empty candidates list) rather than querying and
  discarding the result - a completed trip has no "Add riders" section in the
  UI, so querying for candidates would be wasted work. Not explicitly asked
  for, but follows from "mark complete" being presented as a terminal state
  in this MVP (no reopening).
- **Capacity is informational only, never hard-blocking** - per the prompt's
  explicit instruction; the submit button only disables on zero-selected, not
  on over-capacity.

**Left as placeholder / open questions:**

- The "drivers can update ride_requests" policy is as broad as the existing
  "drivers can select all ride_requests" policy - any driver can flip any
  ride_request's confirmed flags (or any other column) via a crafted direct
  API call, not just through the intended add-riders flow. Same tradeoff
  already accepted elsewhere in this schema; flagging again since this is the
  first *write* access of that breadth (the earlier ones were read-only).
- No UI for removing/reassigning a rider from a trip once added, and no way
  to reopen a completed trip - both are one-way actions in this MVP, matching
  "don't hard-block... simple for MVP" framing but worth confirming before
  a real event where flight delays or driver cancellations happen.
- `unclaimed_ride_requests`'s proximity sort compares against the trip's own
  `scheduled_time` as the reference - reasonable for "how close is this
  candidate's flight to when I'm already driving," but if a driver creates a
  trip with no real plan yet and picks a rough placeholder time, the sort
  order may not reflect actual usefulness. Not configurable from the UI.

**Verification:**

- `npx tsc --noEmit` - clean.
- `npx eslint src tests vitest.config.ts` - clean.
- `npx prettier --check src tests` - clean on all files touched by this
  prompt (`src/styles.css` was already failing `--check` before this prompt,
  per Prompt #3's build log entry - untouched, not this prompt's scope).
- `npm run build` - production build (client + SSR) succeeds, after the
  type-alias fix described above.
- `supabase db reset` (applies all four migrations cleanly from scratch,
  including this prompt's) → `npm run test:rls`: **13/13 passed** (12 from
  Prompts #2/#4/#4.5 + 1 new scenario covering both new RPCs and the new
  update policy), run twice for repeatability.
- `npx vitest run` (`tests/rides/*` + `tests/driver/*`): **46/46 passed**
  (33 unchanged from Prompt #4.5 + 13 new) -
  `tripHelpers.test.ts`: `buildTripInsert` uses the given driver id (not
  anything from the form); `confirmedColumnForLeg` maps arrival/departure to
  the correct, distinct column; `buildTripRiderInserts` tags every row with
  the trip's leg; `ridersForTrip` scopes to one trip and defaults null
  companions to `[]`.
  `TripForm.test.tsx`: required-field validation; submits
  airport/direction/scheduledTime as ISO and calls `onSuccess` with the new
  trip id.
  `AddRidersForm.test.tsx`: only renders the candidates it's given (the
  actual airport/direction filtering is server-side, covered by the RLS
  suite); shows a no-candidates message when empty; the passenger counter
  updates on select/deselect; submit sends only the selected
  `rideRequestIds` for the given trip; submit is disabled with nothing
  selected.
  `CompleteTripButton.test.tsx`: calls `completeTrip` with the trip id and
  fires `onCompleted`.
- Live-checked in a real browser via the preview tool against the local
  Supabase stack, signed in as the seeded dev driver
  (`npm run seed:dev`; a fresh `dev-requester` ride request with a full
  arrival leg was inserted via direct SQL to have a real candidate to claim):
  - `/driver` with no trips yet showed the empty-state text for both
    sections; created a DFW/arrival trip via `/driver/trips/new`, which
    correctly redirected to the new trip's `/driver/trips/:tripId`.
  - The seeded requester appeared as the only candidate on the add-riders
    screen (name, flight, flight time, party of 1); selecting them updated
    the counter to "1 / 4 passengers selected" against the driver's real
    `passenger_capacity`; submitting moved them into "Current riders" and
    correctly emptied the candidate list.
  - Confirmed via direct SQL: `arrival_ride_confirmed` flipped to `true` on
    the claimed `ride_requests` row, `departure_ride_confirmed` stayed
    `false`, and the `trip_riders` row was tagged `leg = 'arrival'`.
  - `/driver` dashboard showed the trip under "Upcoming trips" with the
    rider's name and flight time; clicking "Mark trip complete" on the trip
    detail page swapped the button for a "Completed" badge, hid the add-riders
    section, and the dashboard subsequently listed it under "Completed
    trips" instead.
  - Signed in as the seeded dev requester and confirmed their own
    `/request` page independently showed the arrival leg as "Ride
    confirmed" with the correct scheduled time - the full request → claim
    → confirm loop works end-to-end, not just in isolation.
  - Signed in as the seeded dev requester and confirmed direct navigation to
    both `/driver` and `/driver/trips/new` redirected back to `/request`
    (the new role guard), rather than the Prompt #3 guards' "signed in + has
    a role" check letting them through.
  - Test fixture rows were deleted afterward and `supabase db reset`
    re-run (`npm run test:rls` confirmed 13/13 still passing against the
    clean schema) to leave the local DB clean for the next session.

## Prompt #5.5: Tighten driver write access, add un-claim + reopen

**Scope:** Two changes to the Prompt #5 driver flow: (1) replaced the broad
"drivers can update ride_requests" RLS policy with three SECURITY DEFINER
RPCs (`claim_trip_riders`, `unclaim_trip_rider`, `reopen_trip`), and rewrote
`addTripRiders` to call the first one instead of doing a direct insert+
update; (2) added a "Remove" button per current rider and a "Reopen trip"
button on a completed trip's detail page. No requester/admin changes.

**Routes/files/components introduced or changed:**

- [supabase/migrations/20260824000000_driver_write_tightening.sql](supabase/migrations/20260824000000_driver_write_tightening.sql)
  — the three new RPCs and the `drop policy "drivers can update
  ride_requests"` statement. Each RPC does its own ownership check
  (`owns_driver(trips.driver_id)`, or `owns_driver(...) or is_admin()` for
  `reopen_trip`) and raises an exception (not a silent no-op) when the
  caller doesn't own the trip - a rejected RPC call surfaces as a normal
  Supabase `error`, same shape as any other RPC failure the app already
  handles with `if (error) throw error`. `claim_trip_riders` additionally
  checks `status = 'open'` before claiming, since driver writes to
  ride_requests should never happen against a trip that isn't accepting
  riders. All three are plpgsql (not plain `sql`) since they read a row,
  branch on it, then write - `claim_trip_riders`/`unclaim_trip_rider` each
  do their insert/delete + confirmed-flag flip as two statements inside one
  function call, which Postgres already runs atomically per function
  invocation, so "can't partially apply" falls out of using a function at
  all rather than needing an explicit transaction block.
- [src/lib/driver/server-functions.ts](src/lib/driver/server-functions.ts) —
  `addTripRiders` now calls `supabase.rpc('claim_trip_riders', ...)` instead
  of inserting into `trip_riders` and updating `ride_requests` directly (and
  no longer needs its own `trips` select to find the leg - the RPC looks
  that up itself from `trips.direction`). Added `removeTripRider` (POST →
  `unclaim_trip_rider` RPC) and `reopenTrip` (POST → `reopen_trip` RPC).
  Removed `confirmedColumnForLeg` and `buildTripRiderInserts` - both were
  pure helpers that existed only to build the direct-write payload
  `addTripRiders` no longer sends; that logic now lives in the SQL RPC
  instead, so the JS-side helpers and their tests in
  [tests/driver/tripHelpers.test.ts](tests/driver/tripHelpers.test.ts) were
  deleted rather than left as dead code.
- [src/components/driver/RemoveTripRiderButton.tsx](src/components/driver/RemoveTripRiderButton.tsx),
  [ReopenTripButton.tsx](src/components/driver/ReopenTripButton.tsx) — new,
  same shape as [CompleteTripButton.tsx](src/components/driver/CompleteTripButton.tsx):
  own `useMutation`, calls an `onRemoved`/`onReopened` callback prop on
  success rather than invalidating queries itself, leaving that to the
  route's existing `refresh()`.
- [src/routes/driver.trips.$tripId.tsx](src/routes/driver.trips.$tripId.tsx)
  — each current-rider `<li>` now renders a `RemoveTripRiderButton`
  (unconditionally, on both open and completed trips - see assumptions);
  the "Completed" badge now sits next to a `ReopenTripButton` instead of
  standing alone. Both wire into the page's existing `refresh()` (which
  invalidates both the trip-detail and driver-trips-list queries), so
  removing a rider or reopening a trip updates the UI without a reload -
  reopening in particular causes `getTripDetail` to refetch with
  `status: 'open'`, which brings the "Add riders" section back since that
  section (and the `unclaimed_ride_requests` call backing it) was already
  conditioned on `trip.status !== 'completed'` from Prompt #5.

**Assumptions made:**

- **Unauthorized RPC calls raise a Postgres exception ("rejected"), not a
  silent no-op.** The prompt allowed either ("gets rejected/no-op on all
  three"); picked exceptions because it's the one behavior that's
  identical and unambiguous across all three RPCs (an UPDATE-based no-op
  wouldn't naturally apply to `claim_trip_riders`, which INSERTs), and
  because it matches how the app already surfaces RPC failures
  (`if (error) throw error`) - the driver sees a real error rather than a
  click that silently did nothing.
- **The Remove button is shown on a completed trip's riders too, not just
  an open one.** Neither the RPC nor the prompt restricts unclaiming to
  open trips (unlike `claim_trip_riders`, which does check `status =
  'open'`), so read that as intentionally asymmetric - a driver correcting
  a mistake after marking a trip complete shouldn't be blocked. Flagging in
  case removing a rider from a completed trip should actually be
  disallowed or should force a reopen first.
- **`reopen_trip` allows an admin as well as the trip's own driver** ("same
  ownership check (or admin)" from the prompt, read literally) - no admin
  UI calls it yet, but the RLS test covers an admin-authorized path isn't
  needed since the app itself never calls it as admin; only the
  driver-vs-different-driver case is exercised end-to-end through the UI.

**Left as placeholder / open questions:**

- No confirmation dialog before Remove or Reopen - both fire immediately on
  click, consistent with Complete's existing one-click pattern from Prompt
  #5 and CLAUDE.md's "simple for MVP" framing elsewhere in this build, but
  worth reconsidering for Remove specifically since it's the first
  irreversible-feeling driver action with no undo path other than the
  rider re-adding themselves as a candidate.
- Removing a rider from a trip does not notify the requester in any way -
  their `/request` page will just flip back to "Still needs a ride" next
  time they load it. Same no-notifications posture as every other prompt so
  far.

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint src tests vitest.config.ts` — clean.
- `npx prettier --check` on every file touched this prompt — clean (did
  **not** run `prettier --write`/`--check` against the whole repo or
  `CLAUDE.md` as a single file - doing so once during this prompt reflowed
  unrelated pre-existing content in `CLAUDE.md`'s Branding section in a way
  that changed a paragraph's list-nesting under markdown's lazy-continuation
  rules; reverted that and hand-appended just the new section instead, to
  avoid touching content outside this prompt's scope. `CLAUDE.md` and
  `src/styles.css` remain pre-existing `--check` failures per Prompt #3's
  build log, unchanged by this prompt).
- `npm run build` — production build (client + SSR) succeeds.
- `supabase db reset` (applies all five migrations cleanly from scratch,
  including this prompt's) → `npm run test:rls`: **14/14 passed** (13 from
  Prompts #2/#4/#4.5/#5 + 1 new scenario covering all three RPCs' ownership
  checks, the unclaim-frees-the-candidate behavior, and the old direct-write
  policy's removal), run twice for repeatability. Also had to update one
  *existing* Prompt #5 test that claimed a rider via a direct
  `ride_requests` update (the now-removed path) to go through
  `claim_trip_riders()` instead - it was failing after the policy drop,
  which is expected and confirms the drop actually took effect.
- `npx vitest run` (`tests/rides/*` + `tests/driver/*`): **31/31 passed**
  (18 unchanged in `tests/rides`, 13 in `tests/driver` - down from Prompt
  #5's 15 there after deleting the 4 `confirmedColumnForLeg`/
  `buildTripRiderInserts` tests and adding 2 new ones, one each for
  `RemoveTripRiderButton` and `ReopenTripButton`).
- Live-checked in a real browser via the preview tool against the local
  Supabase stack, signed in as the seeded dev driver (`npm run seed:dev`;
  a `dev-requester` ride request with a full arrival leg was inserted via
  direct SQL):
  - Created a DFW/arrival trip, selected the seeded requester as a
    candidate, clicked "Add selected riders" - claimed via
    `claim_trip_riders()`, appeared in "Current riders" with a "Remove"
    button.
  - Clicked "Remove" - the rider disappeared from "Current riders" and
    immediately reappeared in the "Add riders" candidate list, with no page
    reload (confirmed via `unclaim_trip_rider()`'s effect and the route's
    query invalidation).
  - Marked the trip complete (badge changed to "Completed" next to a new
    "Reopen trip" button, "Add riders" section disappeared) - clicked
    "Reopen trip" - the badge and button were replaced by "Mark trip
    complete" again and the "Add riders" section reappeared immediately,
    confirming `reopen_trip()` and the query invalidation work end-to-end.
  - No console errors at any point in the flow.
  - Test fixture rows were deleted afterward and `supabase db reset`
    re-run (`npm run test:rls` confirmed 14/14 still passing against the
    clean schema) to leave the local DB clean for the next session.

## Prompt #5.6: Remove trip completion entirely

**Scope:** Removed the `trips.status` column and every feature built on it -
trip completion turned out not to matter for this app. This is a partial
*reversal* of Prompt #5 (which introduced `status`, the open/completed
dashboard grouping, and the "Add riders" `status !== 'completed'` gate) and
Prompt #5.5 (which added `reopen_trip()` and the `status = 'open'` claim
gate specifically to manage that column) - see "Reversed from Prompts #5/
#5.5" below for the exact list of what got removed. No requester/admin
changes.

**Routes/files/components introduced or changed:**

- [supabase/migrations/20260825000000_remove_trip_status.sql](supabase/migrations/20260825000000_remove_trip_status.sql)
  — `alter table public.trips drop column status`, a `create or replace` of
  `claim_trip_riders()` with the `status = 'open'` check removed (redefined
  *before* the column drop, since the old body still referenced
  `v_trip.status` - dropping the column first would have broken it), and
  `drop function public.reopen_trip(uuid)`. `unclaim_trip_rider()` needed no
  changes - it was never gated on status.
- [src/lib/driver/server-functions.ts](src/lib/driver/server-functions.ts) —
  `TripRow` and the `trips` select lists in `getMyDriverTrips`/
  `getTripDetail` no longer include `status`; `getMyDriverTrips` returns a
  single `trips` array (still sorted `scheduled_time ascending` server-side,
  unchanged) instead of `{ upcoming, completed }`; `getTripDetail` always
  calls `unclaimed_ride_requests` instead of skipping it for a completed
  trip. Deleted `completeTrip` and `reopenTrip`.
- [src/lib/driver/types.ts](src/lib/driver/types.ts) — deleted `TripStatus`
  and `Trip.status`; `DriverTripsOverview` now has one `trips: Trip[]`
  instead of `upcoming`/`completed`.
- [src/routes/driver.index.tsx](src/routes/driver.index.tsx) — replaced the
  two `<section>`s ("Upcoming trips"/"Completed trips") with one flat
  `data.trips.map(...)` grid, plus a single "No trips yet." empty state.
- [src/routes/driver.trips.$tripId.tsx](src/routes/driver.trips.$tripId.tsx)
  — removed the `trip.status === 'open'` ternary around the header (no more
  Complete/Reopen button or "Completed" badge - just the airport/direction
  heading and scheduled time), and removed the `trip.status === 'open' &&`
  guard around the "Add riders" section so it always renders.
  `RemoveTripRiderButton` needed no changes - it already worked
  unconditionally, and removing the status column just means the
  open/completed asymmetry it used to live under (Prompt #5.5's "Left as
  placeholder" note about whether Remove should be blocked on a completed
  trip) no longer exists as a question at all.

**Reversed from Prompts #5/#5.5 (deleted, not just changed):**

- `trips.status` column and its `check (status in ('open', 'completed'))`
  constraint from [20260820000000_schema_and_rls.sql](supabase/migrations/20260820000000_schema_and_rls.sql)
  (Prompt #2) - dropped by this prompt's migration rather than editing the
  original file, per standard migration practice (never rewrite an applied
  migration).
- `reopen_trip()` RPC, added by
  [20260824000000_driver_write_tightening.sql](supabase/migrations/20260824000000_driver_write_tightening.sql)
  (Prompt #5.5) - dropped outright, no replacement.
- `src/components/driver/CompleteTripButton.tsx` (Prompt #5) and
  `src/components/driver/ReopenTripButton.tsx` (Prompt #5.5) - deleted,
  along with `tests/driver/CompleteTripButton.test.tsx` and
  `tests/driver/ReopenTripButton.test.tsx`.
- `completeTrip`/`reopenTrip` server functions (Prompt #5/#5.5) - deleted
  from `src/lib/driver/server-functions.ts`.
- RLS test coverage: the reopen half of Prompt #5.5's "driver write
  tightening" test in [tests/rls.test.ts](tests/rls.test.ts) (the
  mark-completed → reopen-rejected-for-other-driver → reopen-succeeds
  sequence) - removed, and that describe block's title/wording trimmed from
  "claim/unclaim/reopen" to "claim/unclaim" accordingly. Two *unrelated*
  Prompt #5/#2 tests that happened to use `status` as a convenient "update
  some column" target (`driver D can insert/update their own trips`, `driver
  D cannot update a trip owned by a different driver`, and the admin
  all-tables-update test) were repointed to update `scheduled_time` instead
  - those tests are about update permissions in general, not about status
  specifically, so they needed a different column, not deletion.

**Assumptions made:**

- **No confirmation/undo step was needed for the destructive migration
  itself** beyond the standard `supabase db reset` verification - the
  prompt was explicit ("drop the status column... delete reopen_trip
  entirely") and this is local dev data, not a hosted project with real
  rows.
- **The "Add riders" section's `unclaimed_ride_requests` RPC call is now
  unconditional in `getTripDetail`** rather than kept behind some other
  condition - there's no longer any trip state to condition it on, so this
  follows directly from removing `status`, not a new judgment call.

**Left as placeholder / open questions:**

- No RTL component tests exist for `driver.index.tsx` (`DriverDashboard`)
  or `driver.trips.$tripId.tsx` (`TripDetailPage`) themselves, in this
  prompt or any prior one - every previous prompt verified these two route
  files live in the browser only (see Prompts #5's and #5.5's Verification
  sections), never via Vitest/RTL, unlike the presentational components
  they render (`DriverTripCard`, `AddRidersForm`, `RemoveTripRiderButton`,
  etc.), which do have direct tests. This prompt's instructions asked to
  "update the driver-dashboard test" and "update the trip-detail test" for
  the flat-ordering and always-renders-Add-riders behavior, but no such
  tests exist to update - both files are route components wired to
  `createFileRoute`/`Route.useParams()`, and building a router-backed RTL
  harness for them would be new test infrastructure this codebase has never
  used, not a update to something existing. Verified both behaviors live in
  the browser instead (see Verification below), consistent with how these
  two files have always been checked. Flagging in case a router-testing
  harness is actually wanted going forward - it would need to land as its
  own scoped effort, not folded into this prompt.

**Verification:**

- `npx tsc --noEmit` — clean.
- `npx eslint src tests vitest.config.ts` — clean.
- `npx prettier --check` on every file touched this prompt — clean (ran
  `--write` only on the specific files this prompt touched, not the whole
  repo/`CLAUDE.md`, per the note added to Prompt #5.5's build log entry).
- `npm run build` — production build (client + SSR) succeeds.
- `supabase db reset` (applies all six migrations cleanly from scratch,
  including this prompt's) → `npm run test:rls`: **14/14 passed** (same
  count as after Prompt #5.5 - one reopen scenario was removed but no new
  scenario was added this prompt), run twice for repeatability. Two
  existing tests needed a follow-up fix unrelated to status removal
  directly: they compared a Postgres `timestamptz` update's returned string
  against a hand-built ISO string with `.toBe()`, which fails because
  Postgres formats the offset as `+00:00` rather than `Z` - switched to
  comparing `Date` values (or, for the "update should be rejected" case,
  asserting the column stayed `null`, which is a strictly stronger check
  than the original format-mismatch-prone string comparison anyway).
- `npx vitest run` (`tests/rides/*` + `tests/driver/*`): **29/29 passed**
  (31 from Prompt #5.5 minus the 2 deleted `CompleteTripButton`/
  `ReopenTripButton` tests).
- Live-checked in a real browser via the preview tool against the local
  Supabase stack, signed in as the seeded dev driver (`npm run seed:dev`):
  - Created a DFW/arrival trip scheduled Aug 22 6:00 PM - its detail page
    showed no "Completed" badge, no Complete/Reopen button, and the "Add
    riders" section rendered immediately on a brand-new trip (confirming
    the section is no longer gated on any trip state).
  - Created a second trip, DAL/departure scheduled *earlier* (Aug 21, 9:00
    AM), deliberately created *after* the first one - back on `/driver`,
    the dashboard rendered one flat, unheaded list with the DAL/Aug 21
    trip listed first and the DFW/Aug 22 trip second, confirming the
    dashboard sorts by `scheduled_time` rather than creation order or any
    status grouping.
  - No app console errors or server errors (`preview_logs`) at any point;
    a batch of `net::ERR_CONNECTION_REFUSED` console entries were Vite's
    HMR websocket reconnect noise from the preview tab being idle across
    navigations, unrelated to the app.
  - Test fixture rows were deleted afterward and `supabase db reset`
    re-run (`npm run test:rls` confirmed 14/14 still passing against the
    clean schema) to leave the local DB clean for the next session.
