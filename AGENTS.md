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
- Backend specs: `project-scope.md`, `tech-stack.md`, `implementation-plan.md`.

## Tech stack

- Frontend: React 19, Vite, TypeScript (Tailwind CSS and React Router planned)
- Backend: Node.js-style Express 5 on the Bun runtime, TypeScript
- Database: PostgreSQL + Prisma ORM (planned; DATABASE_URL in server `.env`)
- Auth: database sessions (PostgreSQL, cookie-based) — planned
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