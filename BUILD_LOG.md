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
  Postgres checks table-level privileges *before* RLS narrows rows — RLS
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
  the inner subquery blocked from seeing the *other* person's `trip_riders`
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
