# AGENTS.md: instructions for AI coding agents

## Start here (every session)

1. Read `roadmap/README.md` (slice order, branches, conventions).
2. Read `roadmap/PROGRESS.md` (what is done, decisions made, what is next).
3. Read the plan for the slice you are working on: `roadmap/00-data-layer.md`, `roadmap/01-foundation.md`, or its section in `roadmap/02-features.md`. Git steps are in `roadmap/03-pull-request.md`.
4. `TASKS.md` is the full task breakdown of the challenge brief. Use it for detail; the roadmap is the execution order.
5. Work on **one slice per session**, on its own branch (`setup/...` for groundwork, `slice/...` for features). Check with `git branch --show-current` before changing files. Do not commit, merge or push unless the user asks.
6. At the end, update `roadmap/PROGRESS.md` (status, decisions, AI log entries), the matching `TODO(slice ...)` sections of `roadmap/PR_DESCRIPTION.md`, and the status colours and tables in `docs/HLD.md` for what the slice built. Only write what is true of the code; never fill a `TODO(author)` section. At wrap-up, regenerate `docs/HLD.md` with `roadmap/HLD_PROMPT.md`.

## Goal and scope

- A product catalogue proof of concept: home (5 chosen "top rated" products), category page, search, product page, enquiry form that emails a sales inbox and shows "Thank you".
- Build only what the five acceptance criteria need. No extra features. A small, well-reasoned solution beats a large one.

## Architecture rules (do not break)

- The client never calls the Fake Store API. It only calls the backend (`/api/...`).
- Backend layers: `http/` -> `services/` -> `ports/` (interfaces) <- `adapters/` (implementations). Services depend only on ports and `domain/` types.
- The Fake Store response shape never leaves `server/src/adapters/fakestore/`. The API returns the domain model.
- **Products are never stored**, in the database or in a local file. Fake Store is their single source of truth; test fixtures are never read at runtime. The database (PostgreSQL + Prisma, slice F5) holds enquiries only. Prisma types never leave `server/src/adapters/enquiry-postgres/`.
- One adapter per product data source, email provider and enquiry store. Adapters are chosen in the composition root from env config.
- Look and feel lives in one theme file of design tokens. Components contain no hard-coded brand styling.

## Stack and commands

- Server: Node 22, TypeScript (strict, ESM, `NodeNext`), Vitest, zod. Lives in `server/`.
  - `npm test` (Vitest), `npm run typecheck` (tsc --noEmit), `npm run build`, `npm run snapshot` (re-records the test fixture `src/test-support/fakestore-products.json` from the live API), `npm run db:migrate` (`prisma migrate deploy`).
  - `npm ci` runs `prisma generate` (postinstall) into `src/generated/prisma/` (git-ignored). After changing `prisma/schema.prisma`, add a migration with `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script` into a new `prisma/migrations/<timestamp>_<name>/migration.sql`.
  - Postgres repository tests run only when `TEST_DATABASE_URL` is set (e.g. `postgresql://catalogue:catalogue@localhost:55432/catalogue` with Compose running).
- Client: React 19 + TypeScript (Vite 8, React Router 8), CSS modules using theme tokens. Lives in `client/`.
  - `npm run dev` (Vite on :5173, proxies `/api` to :3000), `npm test` (Vitest + RTL + MSW), `npm run typecheck`, `npm run build`.
- Docker: `docker compose up --build` from the repo root runs the web app (nginx, :8080), the API (:3000), PostgreSQL (host :55432, volume `postgres-data`), a one-off `migrate` service and Mailpit (:8025); no `.env` needed. Images: `server/Dockerfile` (runtime: `--omit=dev --omit=optional`, no Prisma CLI), `client/Dockerfile` (nginx config in `client/nginx/`, per-request DNS for the API).
- Database: PostgreSQL 16 + Prisma 7 (pinned `7.10.1`), the `enquiries` table only.
- Without Docker the defaults are `ENQUIRY_STORE=memory` and `EMAIL_PROVIDER=console`; both are refused when `NODE_ENV=production`.

## Conventions

- TypeScript strict, no `any`. Server: relative imports use the `.js` extension (NodeNext). Client: extensionless imports (Vite, `moduleResolution: Bundler`).
- Small modules with one responsibility. Tests sit next to the code as `*.test.ts`.
- Expected "not found" is `null` or an empty list; failures of an external system (Fake Store, email, database) throw `UpstreamError`.
- Server feature pattern: one `CatalogueService` (or `EnquiryService`) method, one route file in `http/routes/` mounted in `app.ts`, wired in `main.ts`; API tests use `testApp()` from `src/test-support/test-app.ts`.
- Client page pattern: a typed function in `api/catalogue.ts`, loaded with `useApiData(key, load)`, and the shared `LoadingState` / `ErrorState` (with retry) / `EmptyState`.
- Commit messages reference task IDs, e.g. `feat(server): category page split rule (F2-2)`.

## Testing

- Every acceptance criterion has at least one automated test.
- No real network calls in tests. Server: inject a fake `fetch` (`fakeStoreServer()` replays the recorded response), or use an in-memory adapter. Client: register MSW handlers with `server.use(...)`; a request without a handler fails the test. `/api/categories` has a default handler (the header loads it on every page); override it with `server.use(...)` when a test needs something else.
- Tests must fail when behaviour breaks. Do not write tests that only assert a mock was called.

## Security

- Validate all input on the server. Never build a regex, HTML or an email header from unescaped user input.
- Never commit secrets or a `.env` file. Configuration goes in `.env.example` with safe local defaults.
- Do not log personal data (enquiry email, phone, message); log ids and status only.
- Ask before adding a dependency. Pin exact versions.
