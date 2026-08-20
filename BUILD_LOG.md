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
