# Helpdesk Project Memory

AI-powered ticket management system. Agents manually classify and respond to
support emails; this system uses AI to auto-classify, respond to, and route
tickets.

## Project layout

```
server/   Express 5 + TypeScript API (runs directly on Bun, no compile step)
client/   React 19 + Vite + TypeScript SPA
e2e/      Playwright end-to-end tests (own workspace)
```

Monorepo uses Bun workspaces (`server`, `client`, `e2e`). Run commands from the
repo root; they forward into the workspaces.

## Commands (repo root)

- `bun run dev` — start API (:3000) and client (:5173) together via `concurrently`
- `bun run dev:server` / `bun run dev:client` — start one side only
- `bun run test:e2e` — Playwright suite; starts its own servers + test DB (see Testing below)
- `bun run test` — client component tests via Vitest + React Testing Library (jsdom, `client/src/**/*.test.tsx`)
- `bun run typecheck` — `tsc --noEmit` in server, `tsc -b` in client, `tsc --noEmit` in e2e
- `bun run build` — build both workspaces
- `bun install` — install/hoist dependencies across workspaces

## Conventions

- Bun, not npm: `bun install`, `bun run`, `bun --hot`.
- Server imports use explicit `.ts` extensions (required by Bun; enabled via
  `allowImportingTsExtensions` in `server/tsconfig.json`).
- Server runs TypeScript directly — no build/compile step for dev.
- Client dev server proxies `/api` → `http://localhost:3000` by default;
  override with `API_PROXY_TARGET` env var (`client/vite.config.ts`).
- Client uses `@/*` path alias → `client/src/*` (configured in `client/tsconfig.json`,
  `client/tsconfig.app.json`, and `client/vite.config.ts`).
- Backend specs: `project-scope.md`, `tech-stack.md`, `implementation-plan.md`.
- Before starting the API (:3000) or client (:5173) to verify changes, check
  whether it is already running (e.g. `Get-NetTCPConnection -LocalPort 3000`).
  If running, do NOT start a duplicate on another port — test against the
  existing instance (the dev servers run `bun --hot`, so file changes are
  already live). Only start it yourself when nothing is listening.

## Testing (Playwright E2E)

- **Delegate test writing to the `e2e-tester` subagent** (defined in
  `.opencode/agent/e2e-tester.md`): when asked to create, extend, or fix e2e
  tests, launch it via the Task tool (`subagent_type: "e2e-tester"`) instead
  of writing specs yourself. It may edit only `e2e/**` and run only
  playwright/test:e2e commands; it knows the environment facts below and
  reports suite status + suspected product bugs back.
- Specs live in `e2e/tests/` (`api-auth.spec.ts`, `auth-ui.spec.ts`, `users-ui.spec.ts`,
  helpers in `e2e/lib/`); run from repo root via
  `bun run test:e2e` or from `e2e/` (`bunx playwright test`, `--ui`,
  `--headed`). Chromium is the only installed browser project (add
  Firefox/WebKit projects + `playwright install <browser>` as needed).
- Tests never touch dev ports: the config spins up its own API on :3100
  (`bun src/index.ts` — NOT `bun run start`, whose script-level
  `NODE_ENV=production` prefix would override the injected env and silently
  re-enable rate limiting mid-suite → 429s) and Vite client on :5174
  (`--strictPort`), so tests can run
  while `bun run dev` is active. Ports overridable via `E2E_API_PORT` /
  `E2E_CLIENT_PORT`; `baseURL` = :5174. The API webServer gets
  `NODE_ENV=test`, `TRUSTED_ORIGIN`/`BETTER_AUTH_URL` overridden to the :5174
  origin, and `DATABASE_URL` pointing at the test DB.
- Separate DB: tests use PostgreSQL database **`helpdesk_test`**, configured in
  `server/.env.test` (gitignored) via `DATABASE_URL`. Resolution order
  (`e2e/lib/test-db.ts`): `TEST_DATABASE_URL` env > `.env.test` > derived from
  `server/.env` by swapping the db name (name overridable via
  `E2E_TEST_DB_NAME`). Both global-setup and the API webServer resolve through
  this helper, so they always agree.
- `globalSetup` (`e2e/global-setup.ts`) runs every test session: creates
  `helpdesk_test` if missing, then `bunx prisma migrate reset --force`
  (destructive full reset; Prisma 7 requires
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=Yes` for AI-triggered resets),
  then an explicit `bun prisma/seed.ts`. Note: Prisma 7 removed `--skip-seed`
  and its reset does not auto-seed. Setup fails fast if `.env.test` is
  missing/lacks `DATABASE_URL`, and refuses to run if that URL targets the dev
  database (reset is destructive).
- Seed/better-auth gotcha: better-auth >=1.7 sign-in requires the credential
  account's `issuer` to equal `local:<providerId>` (e.g. `local:credential`);
  accounts without it fail sign-in with a misleading "User not found" warn +
  INVALID_EMAIL_OR_PASSWORD. `server/prisma/seed.ts` sets it explicitly.
  Debugging tip: monkey-patch the shared Prisma instance's finders before
  importing auth.ts to log exactly what better-auth queries.
- Login form DOM: server-side auth errors render as a direct child
  `<p class="text-destructive">` of `<form>`; client-side zod errors render as
  nested `<p class="text-destructive">` inside field wrappers. Use descendant
  selector `form p.text-destructive` to match either.
- Rate limiting (`apiLimiter` in `server/src/index.ts`) is production-only:
  `skip: () => !isProduction` where `isProduction = NODE_ENV === "production"`.
  The server `start` script sets `NODE_ENV=production` (Bun applies `VAR=value`
  prefixes in package.json scripts, even on Windows); e2e pins `NODE_ENV=test`
  to keep it off during test runs.
- Gotcha: express-rate-limit v8 draft-8 headers are `RateLimit` +
  `RateLimit-Policy` — there is no `RateLimit-Limit` header.

## Component Testing (Vitest + React Testing Library)

- **What it covers**: client component/unit tests (jsdom) — distinct from Playwright
  E2E above. Focused on rendering and behavior of isolated components (e.g. a page
  given mocked data), NOT full-stack flows. Live at `client/src/**/*.test.tsx`.
- **Run**: from `client/`, `bun run test` (= `vitest run`) or `bun run test:component`;
  `bun run test:watch` for watch mode. From repo root, `bun run test` forwards into
  the client workspace. No servers or DB needed — test-only env.
- **Config**: test options live in `client/vite.config.ts` (must import
  `defineConfig` from `vitest/config` for the `test` key to typecheck):
  `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/test/setup.ts'`,
  `css: false`. Setup file (`client/src/test/setup.ts`) imports
  `@testing-library/jest-dom/vitest` for matchers like `toBeInTheDocument`.
- **TypeScript**: `vitest/globals` is added to `types` in `client/tsconfig.app.json`
  so `describe`/`it`/`expect` and DOM matchers typecheck.
- **Conventions** for writing component tests:
  - Co-locate specs next to the component: `client/src/pages/Users.test.tsx`.
  - Render React-Query consumers with the shared helper
    `renderWithQuery` from `client/src/test/render-with-query.tsx` (wraps the
    element in a fresh `QueryClientProvider` with `retry: false`) — never a bare
    `render` for components that call `useQuery`.
  - Mock HTTP: `vi.mock('axios')` + `vi.mocked(axios).get.mockResolvedValue(...)`
    (or `.mockRejectedValue(...)`); assert the call with `toHaveBeenCalledWith`.
  - Reset mocks per test: `beforeEach(() => { vi.resetAllMocks() })` (clears all
    mocked modules' call history/implementations; then re-stub what each test needs).
  - Prefer `@testing-library/user-event` for interactions and async queries
    (`findByRole`/`findByText`) over `getBy*` + `act`.
  - Use `toHaveBeenCalledWith` to pin exact request shape (URL + options) and catch
    internal API drift.

## Tech stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`),
  React Router, shadcn/ui, **Axios** for HTTP requests, **TanStack Query**
  (`@tanstack/react-query`) for server state. Use `axios.get<ResponseType>()`
  with explicit generic types; avoid `as` casts. Use `useQuery` for data
  fetching — never raw `useEffect` + `useState` for server data.
- UI: shadcn/ui with **Base UI** primitives (`@base-ui/react`), Nova preset
  (neutral theme, CSS variables). Config in `client/components.json`. Components
  live in `client/src/components/ui`, copied in via `bunx shadcn@latest add <name>`
  from `client/`. Helper `cn()` in `client/src/lib/utils.ts`. The `form` registry
  item has no files for Base UI — wire react-hook-form + zod manually (project
  already uses `react-hook-form`, `@hookform/resolvers`, `zod`). The `dialog`
  CLI add prompts to overwrite `button.tsx` (dependency on identical file), so
  `dialog.tsx` is hand-written from Base UI's `@base-ui/react/dialog` primitives
  (Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close) matching the
  base-nova style.
- Auth: Better Auth (`better-auth`) — email/password, database sessions in
  PostgreSQL (via `prismaAdapter`), cookie-based. Server wires Better Auth's
  handler at `/api/auth/*splat` via `toNodeHandler` (`server/src/index.ts`);
  instance config in `server/src/lib/auth.ts`. **Sign-up is disabled**
  (`disableSignUp: true`) — users must be seeded in the DB directly. The seed
  script (`server/prisma/seed.ts`, run via `bun run seed` from `server/`)
  creates the admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars in
  `server/.env` (hashes passwords with `hashPassword` from
  `better-auth/crypto`, creates a `credential` account) and **refuses
  passwords shorter than 12 characters**. Other users (e.g. the agent) were
  created by temporarily extending the script or direct DB inserts.
- Server auth: `requireAuth` middleware (`server/src/middleware/require-auth.ts`)
  reads the session from request headers (`auth.api.getSession` +
  `fromNodeHeaders`), returns 401 on failure, and attaches `req.session` /
  `req.user` (typed globally in `server/src/types/express.d.ts`). Route example:
  `GET /api/me` in `server/src/index.ts`.
- Client auth: `authClient` from `createAuthClient()` in
  `client/src/lib/auth-client.ts` (exposes `signIn`, `signOut`, `useSession`).
  Uses the `inferAdditionalFields` plugin (from `better-auth/client/plugins`)
  with a manual `user.role` schema so `session.user.role` is typed on the
  client (required since server + client are separate workspaces).
  Login page at `client/src/pages/Login.tsx`; session guarded by
  `client/src/components/ProtectedRoute.tsx` (redirects to `/login`).
  `TRUSTED_ORIGIN` env var (default `http://localhost:5173`) must match the
  client origin.
- Role-based routing: `client/src/components/AdminRoute.tsx` guards admin-only
  routes (checks `session.user.role === 'ADMIN'`, redirects non-admins to `/`).
  Example: `GET /users` page (`client/src/pages/Users.tsx`) is nested under
  `AdminRoute` in `client/src/App.tsx`; nav link shown only to admins in
  `client/src/components/Navbar.tsx`.
- User model has an additional `role` field (string, default `"AGENT"`,
  not writable via API) — declared in `server/src/lib/auth.ts` under
  `user.additionalFields`.
- Backend: Node.js-style Express 5 on the Bun runtime, TypeScript
- Database: PostgreSQL 18 (local, `helpdesk` db) + Prisma ORM 7
- E2E testing: Playwright (`@playwright/test`) in the `e2e` workspace — see
  "Testing (Playwright E2E)" above for DB/server conventions
- Prisma 7 notes: `prisma.config.ts` (not `.env`-based URLs in schema), new
  `prisma-client` generator outputting to `server/src/generated/prisma` (gitignored),
  driver adapter `@prisma/adapter-pg` required for `PrismaClient`. Run via
  `bunx prisma ...` from `server/`. DATABASE_URL lives in `server/.env`.
  Always pass `--no-skills` to `prisma init` — agent skills dirs are unwanted
  (context7 is used for up-to-date Prisma docs instead).
- AI: free models via OpenRouter — planned
- Email: SendGrid or Mailgun free tier — planned

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a
library, framework, SDK, API, CLI tool, or cloud service — even well-known ones
like React, Vite, Express, Prisma, PostgreSQL, Tailwind, or React Router. This
includes API syntax, configuration, version migration, library-specific
debugging, setup instructions, and CLI tool usage. Use even when you think you
know the answer — training data may not reflect recent changes. Prefer this over
web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business
logic, code review, or general programming concepts.

Steps:
1. Start with `resolve-library-id` using the library name and what to look up,
   unless the user provides an exact library ID in `/org/project` format.
2. Pick the best match (ID format: `/org/project`) by exact name match,
   description relevance, code snippet count, source reputation, and benchmark
   score. If results look wrong, try alternate names or rephrase the query.
3. `query-docs` with the selected library ID, scoped to a single concept. Make
   a separate call per concept unless the question is about how they interact.
4. Answer using the fetched docs.
<!-- context7 -->