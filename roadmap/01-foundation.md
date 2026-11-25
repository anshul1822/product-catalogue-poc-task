# Slice 01: Foundation (`setup/foundation`)

**Goal:** the empty skeleton every feature slice plugs into: a running API with config, error handling and a health check, a running React app with routing, layout, API client and theme, and Docker Compose for both. **No acceptance criterion is delivered here.**

**Covers:** `TASKS.md` tasks 1.2, 1.10 (error middleware only), 1.11 (headers and body limit), 2.1–2.6, 2.8, 5.1, 5.2, 5.3 (server + client), 5.4, 5.5.

**Before you start:** read `PROGRESS.md`. Branch from `feature/product-catalogue-poc` after `setup/data-layer` is merged.

## Backend

### Design

```text
server/src/
  config.ts       zod-parsed env; one clear error listing every bad key (uses parseFeaturedIds)
  app.ts          createApp(deps): builds the HTTP app from injected services, no listen (tests use it)
  main.ts         composition root: config -> adapters -> services -> createApp -> listen; graceful shutdown
  http/errors.ts  error middleware -> { "error": { "code", "message", "details" } }; 404 for unknown routes
  http/routes/health.ts   GET /api/health -> 200 { "status": "ok" }
```

Rules:

- `UpstreamError` maps to 502 (every upstream failure, including timeouts: D-17); `ApiError` renders its own status (400 validation, 404 unknown id); malformed JSON 400; body over 10 kB 413; unknown routes 404; anything else 500 with a generic message. Never send a stack trace or an upstream message.
- Each feature slice adds one service method and one route file; `main.ts` wires them.

### Tasks

- [x] **FND-1** Dependencies approved and pinned: `express` 5.3.0, `helmet` 8.3.0; dev `supertest` 7.3.2, `tsx` 4.23.15, `@types/express` 5.0.6, `@types/supertest` 7.2.1. `npm audit`: 0 vulnerabilities.
- [x] **FND-2** `config.ts`: zod-parsed env, one `ConfigError` listing every bad key, defaults in `CONFIG_DEFAULTS` kept equal to `.env.example` by a test.
- [x] **FND-3** `app.ts` (`createApp(deps)`, no listen), `main.ts` (composition root, graceful shutdown, clean exit on bad config), `http/errors.ts` (`ApiError`, `notFoundHandler`, `errorHandler`), `http/routes/health.ts`, `logger.ts`.
- [x] **FND-4** Security basics: helmet, JSON body limit 10 kB, `x-powered-by` off. No CORS: the client is same-origin through the Vite proxy and nginx.
- [x] **FND-5** Scripts: `dev` (`tsx watch`), `start` (`node dist/src/main.js`); both load `../.env` only if it exists.
- [x] **FND-6** Tests (Supertest): health 200, helmet headers, unknown route and wrong method 404 in the error shape, malformed JSON 400, oversized body 413; `errorHandler` maps `ApiError`, `UpstreamError` (502, upstream message not sent, logged) and unexpected errors (500, details logged only).
- [x] **FND-7** `server/Dockerfile` + `server/.dockerignore`: multi-stage on `node:22-alpine`, `npm ci --omit=dev` in the runtime stage, runs as the `node` user, `HEALTHCHECK` on `/api/health`, `CMD node` (not npm) so SIGTERM reaches the shutdown handler. Checked: image 258 MB, healthy, no dev packages or test files inside, `docker stop` exits 0 in under 1 s, a bad config exits 1.

### Env keys added in this slice

| Key | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `FAKESTORE_BASE_URL`, `UPSTREAM_TIMEOUT_MS`, `FEATURED_PRODUCT_IDS` | as in `.env.example` | already defined in slice 00, now parsed by `config.ts` |

## Frontend

### Design

```text
client/
  index.html, vite.config.ts (dev proxy /api -> :3000, Vitest config), tsconfig.json (strict)
  src/main.tsx           createBrowserRouter(routes) + RouterProvider
  src/routes.tsx         every page; shared by the browser router and tests. Feature slices add routes here
  src/api/client.ts      the only file that calls fetch: getJson / postJson on /api, ApiError (status, code,
                         message, details; NETWORK_ERROR when unreachable), isAbortError
  src/api/types.ts       Product, Category, Rating, ApiErrorBody (mirror the server's domain model)
  src/theme/tokens.css   all colours, fonts, spacing, radii, shadows as CSS custom properties
  src/theme/global.css   base element styles, visible focus, .visually-hidden (tokens only)
  src/components/        Layout (skip link, header, main, footer), ProductTile, ProductGrid, Price (AUD),
                         StatusMessages (LoadingState, ErrorState with retry, EmptyState); CSS modules, tokens only
  src/pages/             HomePage (placeholder until F1), NotFoundPage
  src/test-support/      setup.ts (jest-dom, MSW, fail on unhandled requests), server.ts, render.tsx
```

Rules:

- The client never calls Fake Store; `grep -ri fakestoreapi client/src` must find nothing.
- No brand styling inside components; everything visual comes from `tokens.css`.
- Client imports are extensionless (Vite and `moduleResolution: Bundler`); the `.js` extension rule is for the server (NodeNext).

### Tasks

- [x] **FND-8** Client dependencies approved and pinned: `react` 19.3.1, `react-dom` 19.3.1, `react-router` 8.5.2; dev `vite` 8.3.8, `@vitejs/plugin-react` 6.3.0, `typescript` 7.0.2, `@types/react` 19.3.0, `@types/react-dom` 19.3.0, `vitest` 5.1.1, `jsdom` 31.0.1, `@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event` 14.6.13, `@testing-library/jest-dom` 8.0.0, `msw` 3.0.7. `npm audit`: 0 vulnerabilities.
- [x] **FND-9** Vite + React + TypeScript (strict, `exactOptionalPropertyTypes`). Dev proxy `/api` -> `http://localhost:3000`, checked against the running API.
- [x] **FND-10** API client and types, theme tokens and global styles, shared components, `HomePage` placeholder, `NotFoundPage`, routes with `*` -> not found. Production build: 100 kB JS gzipped.
- [x] **FND-11** Accessibility basics: skip link, landmarks (header, main, footer), visible `:focus-visible` outline, status/alert roles for loading and errors, product tiles announced once as "{title} {price}" (decorative image, `alt=""`).
- [x] **FND-12** Vitest + jsdom + RTL + MSW; a request with no MSW handler fails the test. 23 tests: API client (success, error shape, non-JSON error, network error, abort, POST body), `Price`, `ProductTile`, `ProductGrid`, status messages, routes (home, skip link, not found, navigation).
- [x] **FND-13** `client/Dockerfile` + `client/.dockerignore` + `client/nginx/`: Vite build on `node:22-alpine`, served by `nginxinc/nginx-unprivileged:1.30-alpine` (non-root `nginx` user, port 8080). `API_UPSTREAM` (default `http://server:3000`) is filled into the nginx template at start. `/api/` is proxied; `/assets/` is cached for a year and a missing file is 404; every other path serves `index.html`, never cached. Security headers (CSP, nosniff, frame and referrer policy) on the web app, not on `/api` (the API sets its own). Checked: image 90.6 MB, healthy, the app renders in headless Edge under the CSP on `/` and an unknown route.

## Shared

- [x] **FND-14** `docker-compose.yml` with `server` (:3000) and `client` (:8080); the client waits for the server's health check. Every value has a `${VAR:-default}` fallback, so it runs without `.env`; `APP_PORT` / `API_PORT` change the host ports. Checked with no `.env`: both healthy, the app and `/api/health` work through nginx and directly, `docker compose down` cleans up; a cold build (no Docker cache) takes about 11 s once the base images are pulled.
- [x] **FND-15** `README.md`: quick start (clone the feature branch, `docker compose up --build`), URLs, local development without Docker, commands for both packages, every configuration key, repository layout.

## Definition of done

- [x] `npm run typecheck` and `npm test` pass in `server/` and `client/`; `npm run build` passes in `client/`.
- [x] `docker compose up --build` serves http://localhost:8080 (placeholder home page) and http://localhost:3000/api/health.
- [x] `PROGRESS.md` updated.
- [x] Merged into `feature/product-catalogue-poc` with a merge commit: PR #2, `1c68fba`. The README (FND-15) is merged with the docs instead (D-33).
