# Helpdesk Project Memory

AI-powered ticket management system. Agents manually classify and respond to
support emails; this system uses AI to auto-classify, respond to, and route
tickets.

## Project layout

```
server/   Express 5 + TypeScript API (runs directly on Bun, no compile step)
client/   React 19 + Vite + TypeScript SPA
```

Monorepo uses Bun workspaces (`server`, `client`). Run commands from the repo
root; they forward into the workspaces.

## Commands (repo root)

- `bun run dev` — start API (:3000) and client (:5173) together via `concurrently`
- `bun run dev:server` / `bun run dev:client` — start one side only
- `bun run typecheck` — `tsc --noEmit` in server, `tsc -b` in client
- `bun run build` — build both workspaces
- `bun install` — install/hoist dependencies across workspaces

## Conventions

- Bun, not npm: `bun install`, `bun run`, `bun --hot`.
- Server imports use explicit `.ts` extensions (required by Bun; enabled via
  `allowImportingTsExtensions` in `server/tsconfig.json`).
- Server runs TypeScript directly — no build/compile step for dev.
- Client dev server proxies `/api` → `http://localhost:3000` (`client/vite.config.ts`).
- Client uses `@/*` path alias → `client/src/*` (configured in `client/tsconfig.json`,
  `client/tsconfig.app.json`, and `client/vite.config.ts`).
- Backend specs: `project-scope.md`, `tech-stack.md`, `implementation-plan.md`.

## Tech stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`),
  React Router, shadcn/ui
- UI: shadcn/ui with **Base UI** primitives (`@base-ui/react`), Nova preset
  (neutral theme, CSS variables). Config in `client/components.json`. Components
  live in `client/src/components/ui`, copied in via `bunx shadcn@latest add <name>`
  from `client/`. Helper `cn()` in `client/src/lib/utils.ts`. The `form` registry
  item has no files for Base UI — wire react-hook-form + zod manually (project
  already uses `react-hook-form`, `@hookform/resolvers`, `zod`).
- Auth: Better Auth (`better-auth`) — email/password, database sessions in
  PostgreSQL (via `prismaAdapter`), cookie-based. Server wires Better Auth's
  handler at `/api/auth/*splat` via `toNodeHandler` (`server/src/index.ts`);
  instance config in `server/src/lib/auth.ts`. **Sign-up is disabled**
  (`disableSignUp: true`) — users must be seeded in the DB directly. The seed
  script (`server/prisma/seed.ts`, run via `bun run seed` from `server/`)
  creates an admin and an agent user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` and
  `AGENT_EMAIL`/`AGENT_PASSWORD` env vars in `server/.env` (hashes passwords
  with `hashPassword` from `better-auth/crypto`, creates `credential` accounts).
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