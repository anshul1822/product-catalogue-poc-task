# Progress

Update this file at the end of every session. `DECISIONS.md`, `AI_USAGE.md` and the time report are written from it at wrap-up.

## Status

| Slice | Branch | Status | Notes |
|---|---|---|---|
| Plan and docs (`README.md`, `AGENTS.md`, `TASKS.md`, `roadmap/`, `docs/`) | `slice/feature-enquiry` | Done, **not committed anywhere** | Not in PRs #2 to #6 (D-33, D-38, D-45). The user chose "later" again before F5; they must be committed on this branch before PR #7: `03-pull-request.md`, "F5 and the docs" |
| 00 Data layer | `setup/data-layer` | **Done, merged** | Commit `948ee7d`; merged by PR #1 (merge commit `d02988e`); 92 tests |
| 01 Foundation | `setup/foundation` | **Done, merged** (FND-1 to FND-14) | 8 commits `c11027c` to `c0cdd8c`; merged by PR #2 (merge commit `1c68fba`); server 118 tests, client 23. FND-15 (README) arrives with the docs |
| F1 Home | `slice/feature-home` | **Done, merged** | Commits `4957f5f` (server, F1-1 and F1-2) and `b7c68d4` (client, F1-3); merged by PR #3 (merge commit `79c6cbf`); server 128 tests, client 35; checked live against the real Fake Store |
| F4 Product | `slice/feature-product` | **Done, merged** | Commits `e6175e5` (server, F4-1) and `f2dffde` (client, F4-2); merged by PR #4 (merge commit `82965b8`); server 159 tests, client 42; checked live against the real Fake Store |
| F2 Category | `slice/feature-category` | **Done, merged** | Commits `89b6a65` (domain rules), `c2a22c8` (service and routes), `76667be` (client); merged by PR #5 (merge commit `03e6992`); server 206 tests, client 52; checked live against the real Fake Store |
| F3 Search | `slice/feature-search` | **Done, merged** | Commits `77b2248` (server, F3-1) and `0c1dcf6` (client, F3-2, F3-3); merged by PR #6 (merge commit `22e2daf`); server 233 tests, client 70; checked live against the real Fake Store |
| F5 Enquiry (+ PostgreSQL, Prisma) | `slice/feature-enquiry` | **Code committed and pushed** (`0e3ff6e`, `6f4fca8`, `d578472`); docs commit and PR #7 to do | Server 317 tests (+4 gated on a real database), client 93 at `d578472`; checked live end to end. Intermediate commits do not all build (AI log) |
| Wrap-up and PR | `feature/product-catalogue-poc` | **Next** | All 5 ACs built. `DECISIONS.md`, `AI_USAGE.md`, regenerate `docs/HLD.md`, fresh-clone test, the PR into `main` |

**Git state (2026-11-24):** `https://github.com/anshul1822/product-catalogue-poc-task`.

```text
main                          a205e8c  .gitignore only
feature/product-catalogue-poc 22e2daf  merge of slice/feature-search (PR #6)
                              03e6992  merge of slice/feature-category (PR #5)
                              82965b8  merge of slice/feature-product (PR #4)
                              79c6cbf  merge of slice/feature-home (PR #3)
                              1c68fba  merge of setup/foundation (PR #2)
                              d02988e  merge of setup/data-layer (PR #1)
slice/feature-enquiry         d578472  client: Enquire button, form, Thank you (F5-10, F5-11), pushed
                              6f4fca8  server: route, config, wiring, Compose with Postgres and Mailpit, nginx fix
                              0e3ff6e  server: Prisma, email, validation, ports and adapters
                                       (both intermediate commits fail to typecheck on their own; see the AI log)
slice/feature-search          0c1dcf6  client: search bar and results page (F3-2, F3-3)
                              77b2248  server: search service and route (F3-1)
slice/feature-category        76667be  client: header category links, category page, product page link (F2-3..F2-5)
                              c2a22c8  server: category service and routes (F2-1, F2-2)
                              89b6a65  server: category slug rule and category page split (F2-2)
slice/feature-product         f2dffde  client: product page (F4-2)
                              e6175e5  server: product service and route (F4-1)
slice/feature-home            b7c68d4  client: home page (F1-3)
                              4957f5f  server: featured products service and route (F1-1, F1-2);
                                       also drops a trailing blank line from server/vitest.config.ts
setup/data-layer              948ee7d  data layer (29 files)
setup/foundation              c0cdd8c  8 commits on top of d02988e:
                              c0cdd8c  docker-compose.yml, .env.example ports (FND-14)
                              2a5ffbd  client nginx image (FND-13)
                              c11027c  server packages and scripts (FND-1, FND-5)
                              629162c  config test (config.ts itself landed in the next commit)
                              e345cb4  config.ts + app skeleton, errors, health (FND-2..FND-4, FND-6)
                              f20b2b5  server Dockerfile (FND-7); message lost its "build(server):" prefix
                              e0308b9  client scaffold + API client (FND-8, FND-9, FND-11, part of FND-10)
                              e8ebe93  client shared components + tests (rest of FND-10, FND-12); the message
                                       also names the API client, which is in e0308b9
```

Commit-message notes are cosmetic and pushed, so they stay as they are (no force push); every commit from `e345cb4` on typechecks and passes its tests.

Still untracked: `README.md`, `AGENTS.md`, `TASKS.md`, `roadmap/`, `docs/` (the last commit on `slice/feature-enquiry`, before PR #7, D-45), and `fvs` (never commit; delete). Branch prefixes: `setup/` for the two groundwork branches, `slice/feature-<name>` for the feature branches (the pattern used for F1), `docs/` for the docs branch. Every branch is merged into the feature branch with a GitHub PR using "Create a merge commit" (PRs #1 to #6 so far).

**Environment notes:**
- The Docker CLI is not installed on this machine. Install Docker Desktop before slice 01's Docker Compose check.
- Windows services `postgresql-x64-15` and `postgresql-x64-16` are running locally, so port 5432 may be taken. The F5 plan maps the container to host port 55432.
- The GitHub CLI (`gh`) is not installed; open the PR in the web UI, or install `gh`.

## Slice 00: what was built

```text
server/
  package.json, tsconfig.json, tsconfig.build.json, vitest.config.ts
  scripts/snapshot-catalogue.ts  `npm run snapshot` re-records the test fixture (only network call in the repo)
  src/domain/                    product.ts, errors.ts, category.ts, search.ts, catalogue-queries.ts
  src/ports/                     product-source.ts, featured-products.ts
  src/adapters/fakestore/        schema.ts (zod), mapper.ts, fakestore-product-source.ts  (the only runtime source)
  src/adapters/in-memory/        in-memory-product-source.ts (tests only)
  src/adapters/featured-config/  config-featured-products.ts (parseFeaturedIds)
  src/adapters/product-source.contract.ts     shared contract suite, run against fakestore and in-memory
  src/test-support/fixtures.ts                fake fetch, fake Fake Store server, snapshotProducts(), product builder
  src/test-support/fakestore-products.json    raw GET /products response (20 products), test fixture only
.env.example                     data-layer keys
.gitignore
```

Commands (in `server/`): `npm test`, `npm run typecheck`, `npm run build`, `npm run snapshot`.

Dependencies (slice 00): runtime `zod` 4.6; dev `typescript` 7.0, `vitest` 5.1, `@types/node` 22.
Added in slice 01: runtime `express` 5.3.0, `helmet` 8.3.0; dev `supertest` 7.3.2, `tsx` 4.23.15, `@types/express` 5.0.6, `@types/supertest` 7.2.1.
Client (slice 01): runtime `react` 19.3.1, `react-dom` 19.3.1, `react-router` 8.5.2; dev `vite` 8.3.8, `@vitejs/plugin-react` 6.3.0, `typescript` 7.0.2, `@types/react` / `@types/react-dom` 19.3.0, `vitest` 5.1.1, `jsdom` 31.0.1, Testing Library (`react` 16.3.3, `dom` 10.4.2, `user-event` 14.6.13, `jest-dom` 8.0.0), `msw` 3.0.7.
Added in F5 (server): runtime `@prisma/client` 7.10.1, `@prisma/adapter-pg` 7.10.1, `nodemailer` 10.6.1, `express-rate-limit` 8.7.5; dev `prisma` 7.10.1, `@types/nodemailer` 8.0.2. `npm audit`: 3 high (one advisory, `effect` through the Prisma CLI, dev tree only; D-56).

### What slice 01 should import

- Ports: `ProductSource`, `FeaturedProducts`. Domain: `Product`, `Category`, `Rating`, `UpstreamError`, `ConfigError`, `MAX_SEARCH_TERM_LENGTH` (100).
- Composition root: `new FakeStoreProductSource({ baseUrl, timeoutMs })`, `parseFeaturedIds(env.FEATURED_PRODUCT_IDS)`, `new ConfigFeaturedProducts(ids)`.
- Tests: `InMemoryProductSource`, `snapshotProducts()`, `fakeStoreServer()`, `makeProduct()` from `src/test-support/fixtures.ts`.

## Decisions (feed `DECISIONS.md`)

| # | Decision | Why |
|---|---|---|
| D-01 | The data layer is a `ProductSource` port. Fake Store over HTTP is the only runtime adapter; an in-memory adapter serves tests. Both pass one contract suite. | Services do not know where products come from; a new source is one adapter that passes the contract suite. |
| D-02 | Tests replay a recorded Fake Store response (`src/test-support/fakestore-products.json`) through a fake `fetch`. The running app never reads it. | Tests are offline and deterministic; the fixture is test data, not a copy of the catalogue. |
| D-03 | Domain `Product.id` is a string; category is `{ slug, name }`; `rating` is `null` when missing; `price` is a number, currency assumed AUD. | Source-agnostic types; the source has no currency. |
| D-04 | Category display names: title case, and Fake Store's misspelt `jewelery` becomes `Jewellery` (slug `jewellery`). | Users see correct spelling; slugs are derived from display names. The source's spelling stays inside the adapter. |
| D-05 | Categories are derived from `GET /products` (first-seen order), not `GET /products/categories`. Category filtering and search also run over `GET /products`. | One upstream call per query (cacheable later), no slug-to-source-name reverse mapping, and a category without products cannot exist. |
| D-06 | Search: case-insensitive, apostrophes ignored, every word must appear (any order) in title, description or category name; substring match; blank term matches nothing. | Matches the AC "only products that have text matching". Plain `includes`, no regex from input. Known effect: substring means `mens` also matches `Women's`; acceptable for a PoC. |
| D-07 | Fake Store adapter: non-numeric id -> `null` without calling upstream; HTTP 200 + empty body -> `null`; non-2xx (including 404), network error, timeout, invalid JSON, schema mismatch -> `UpstreamError`. A whole list fails if one item is invalid. | Not-found and failure stay distinct; no path injection; strict validation is simpler than partial results for a 20-product PoC. |
| D-08 | Image URLs must be `http`/`https` (validated in the Fake Store schema). | Stops `javascript:` URLs reaching the client. |
| D-09 | `FEATURED_PRODUCT_IDS` must have exactly 5 unique, safe ids, else `ConfigError` at startup. Whether they exist is checked at request time (F1 skips missing ones and logs a warning). | The AC says 5; fail fast on typos. A test checks the `.env.example` default ids all exist. |
| D-10 | No source factory and no `PRODUCT_SOURCE` setting: the composition root constructs `FakeStoreProductSource` directly. | With one runtime source a switch is speculative; it comes back when a second real source exists. |
| D-11 | Work in 7 branches, built in order and merged with `--no-ff` into `feature/product-catalogue-poc`: `setup/data-layer` and `setup/foundation` (groundwork), then one `slice/` branch per acceptance criterion. One PR, into `main`, left open. The 7 branches are kept as frozen history. | Each AC is built and tested end to end before the next, so running out of time still leaves working features; the merge commits show where each slice ends. |
| D-12 | **Products are not stored in a database.** | Fake Store is their single source of truth. A Postgres copy would duplicate it, need a sync job, and could disagree with the source. |
| D-13 | **PostgreSQL + Prisma for enquiries only, in slice F5.** Each enquiry is saved as `PENDING` before the email, then marked `SENT` or `FAILED`. It stores a snapshot of the product's id, title and price, with no foreign key. | The enquiry is the only data the business owns; a failed email no longer loses the lead. The snapshot keeps the record meaningful without copying the catalogue. |
| D-14 | Prisma pinned to `7.10.1`. | On 2026-11-23 npm's `latest` tag for `prisma` pointed to `8.0.0-rc.35`, a release candidate; `7.10.1` is the stable line. |
| D-16 | Architecture style: **ports and adapters (hexagonal)**, kept over a controller-service-repository naming after comparing the two. Documented in `docs/HLD.md`; `roadmap/HLD_PROMPT.md` regenerates it from the code at wrap-up. | The same layering as controller-service-repository, but every outside system (Fake Store, email, database, HTTP) is uniformly an adapter behind a core-owned port, which is what lets the data source and email provider change. |
| D-17 | Every upstream failure (HTTP error, network error, timeout, invalid data) returns **502** `UPSTREAM_UNAVAILABLE` with a generic message; the upstream message is logged, never sent. The planned "503 on timeout" was dropped. | One code keeps the client simple (show an error with a retry). Strictly a timeout is 504, not 503; distinguishing it needs a reason on `UpstreamError`, which can come later. |
| D-18 | Config defaults live in `CONFIG_DEFAULTS` in `config.ts`, so `.env` is optional; `.env.example` lists the same values and a test fails if they drift. `dev` and `start` load `../.env` only if it exists. | The server and Docker Compose start with no setup; one place to read every default. |
| D-19 | `GET /api/health` does not call Fake Store. | It is a liveness check: an upstream outage must not get the container restarted. |
| D-20 | Logging goes through a `Logger` type (`console` today); `errorHandler` logs upstream failures as warnings and unexpected errors as errors, with details on the server only. | Swappable for a structured logger later; tests use a recording logger to check what was logged. |
| D-21 | Server image: multi-stage `node:22-alpine`, production dependencies only, non-root `node` user, `HEALTHCHECK`, `CMD node` rather than `npm start`. | Small attack surface; `node` as PID 1 receives SIGTERM directly, so `docker stop` shuts down cleanly (checked: under 1 s, exit 0). |
| D-22 | Client styling: CSS modules per component that use only `var(--token)` values from `theme/tokens.css`. No CSS framework. | The brand's look and feel lands by editing one file; no extra dependency. |
| D-23 | Product tiles: the whole tile is one link; the image has `alt=""` because the title below says the same. Product pages (F4) will use the title as alt text. | A screen reader announces each tile once, as "{title} {price}", instead of reading the title twice. |
| D-24 | Client tests: MSW fakes `/api` at the network level; a request with no handler fails the test. The API client builds absolute same-origin URLs. | Tests exercise the real API client; no test can reach a real server, even if it swallows the error. |
| D-25 | Prices: one `Intl.NumberFormat('en-AU', AUD)` formatter in `components/Price.tsx` (F5 later added a second, for the email, in `server/src/domain/enquiry-email.ts`). | The source has no currency (D-03); changing it is one line. |
| D-26 | Web app image: `nginxinc/nginx-unprivileged:1.30-alpine` (non-root, port 8080). The `/api` upstream is the env value `API_UPSTREAM`, filled into an nginx template at start. | Same non-root rule as the server; the image runs unchanged on Compose or ECS, only the upstream changes. |
| D-27 | nginx serves the app with a strict CSP (`script-src 'self'`, `connect-src 'self'`; images from any https host, because product image URLs come from the product source), nosniff, `X-Frame-Options: DENY`, a referrer policy and a permissions policy. `/api` responses keep only the API's own headers. Headers live in one included file. | nginx drops inherited `add_header` in any block that sets its own, so an included file keeps every location consistent. Verified the bundle has no inline script or `eval`, and the app renders in headless Edge under the CSP. |
| D-28 | Caching: hashed `/assets/` for a year, `index.html` never cached; a missing asset is 404, not the app shell. | A new release is picked up on the next page load, without serving HTML as JavaScript. |
| D-29 | Compose: the client waits for the server's health check (`service_healthy`); host ports are `APP_PORT` / `API_PORT` with defaults. | The first page load can reach the API; a reviewer with a busy port changes one value. |
| D-30 | Pages load data with a small `useApiData(key, load)` hook (loading / success / error, retry, cancel on leave or key change), not React Router loaders. | The layout renders straight away and each page shows its own loading and error states; one hook, easy to read and test (7 tests). Loaders would need a pending-navigation UI and a revalidator for retry. |
| D-31 | No server-side cache yet: each `/api/featured-products` call fetches `GET /products` from Fake Store (about 0.7 s live). | Correct and simple; a TTL cache around `ProductSource` (`TASKS.md` 1.12, P2) is the next step if latency matters. |
| D-32 | The home page heading is "Top rated products"; the header link stays "Product catalogue". A configured id that is missing is skipped with a warning (D-09), so the page may show fewer than 5. | The AC is about the 5 chosen products; one stale id should not take the page down, and the log says which id to fix. |
| D-33 | F1 was built before the foundation docs were committed and merged (user chose "start coding, git later"). Foundation (PR #2) and F1 (PR #3) were then merged as code only; where the docs went instead is D-38. | Each slice still has its own branch and merge commit. The trade-off: the README (FND-15) and the plan reach the feature branch after F1, not before it; the PR description can say so if asked. |
| D-34 | The product-id rule (`[A-Za-z0-9_-]{1,64}`) lives in the domain as `isValidProductId`, used by `CatalogueService.getProduct` and the featured-products config. The Fake Store adapter keeps its own stricter numeric check. | One rule for "could this be a product id" across the app; an impossible id gets 404 without asking any source. The numeric rule is a Fake Store fact, so it stays in its adapter. |
| D-35 | An impossible id answers 404 `PRODUCT_NOT_FOUND`, not 400. | To the user it is the same as an unknown product: there is nothing at that URL. One code keeps the page logic simple. |
| D-36 | Product page: a 404 shows "Product not found" (with a link home); any other error shows the message with "Try again". The image's alt text is the title (unlike tiles, D-23). | Not found is final, so no retry; a 502 is temporary, so retry. On the details page the image is the main content, not a duplicate of nearby text. |
| D-37 | The category on the product page is plain text until F2 builds category pages. | No link to a page that does not exist yet; F2-5 turns it into a link. |
| D-38 | The docs (README, AGENTS, TASKS, roadmap, HLD) were planned as the last commit of the F4 branch, but PR #4 was merged with the code only; the separate docs PR planned next was not made before F2 started. They were then planned as the last commit of the F2 branch, but PR #5 was also merged with the code only. A separate docs branch was planned next, but it was not made before F3 either; see D-45 for where they went. | Without the README on the feature branch, a reviewer cloning it has no run instructions, and `AGENTS.md` plus the plan are required deliverables. A docs-only PR is one commit and cannot be merged without its content. |
| D-45 | The docs PR planned before F3 was not made either, and PR #6 (F3) was also merged with code only, although the plan put the docs first. The docs are now to be the **first** commit of the F5 branch, made before any F5 code is written; F5 does not start until that commit is pushed. | Five merges went in without them. Committing them on a branch that has no other changes yet is one step, with nothing to separate; the README, `AGENTS.md` and the plan are required deliverables. |
| D-50 | Enquiry flow: validate -> look up the product on the server -> save `PENDING` -> email -> mark `SENT` (201) or `FAILED` (502). Store failure sends no email; if only marking `SENT` fails, the customer still gets 201. | Every email has a record, a failed email keeps the lead, and the customer is never asked to retry something that was already sent (that would duplicate it). |
| D-51 | Single-line fields (name, email, phone) reject every control character, CR and LF included; the message allows line breaks only. The email is plain text; the subject uses the product title from the source, cleaned to one line. | Rules out header injection and HTML injection by construction, instead of by escaping. |
| D-52 | A filled honeypot gets 201 like a real enquiry, but nothing is saved or sent. | A bot cannot tell it was caught; a person never sees the field (off screen, `aria-hidden`, `tabindex=-1`). |
| D-53 | Rate limit only on `POST /api/enquiries` (`express-rate-limit`, 10 per client per 15 minutes, in memory); `trust proxy` = loopback and private networks, so the client address forwarded by nginx counts. | Protects the inbox and the table from scripts without affecting browsing. In-memory counts reset on restart and are per instance; a shared store (e.g. Redis) is the next step for several API instances. |
| D-54 | Local defaults without Docker: `ENQUIRY_STORE=memory`, `EMAIL_PROVIDER=console`. Docker Compose always sets PostgreSQL and Mailpit. Config refuses both local-only adapters when `NODE_ENV=production`. | The API still runs with no setup and no `.env` (D-18); production cannot silently lose enquiries or log personal data. |
| D-55 | Migrations run in a one-off `migrate` Compose service (the server image's build stage, `prisma migrate deploy`), which the server waits for. The runtime image has no Prisma CLI. | The server starts only on a migrated database; the running container cannot change the schema, and the CLI's ~130 packages stay out of it. |
| D-56 | Runtime image installs with `npm ci --omit=dev --omit=optional`. `@prisma/client` lists the Prisma CLI as an optional peer, so npm otherwise installs it. | Image 670 MB -> 368 MB, 101 packages, and it removes `effect` (GHSA-7589-6fvf-x4pw, high, ReDoS in `Schema.TemplateLiteral`) from the running container. The advisory remains in the dev tree (Prisma CLI, build stage and migrate container only), where it parses our own config file, not user input; the only fix npm offers is a downgrade to Prisma 6. |
| D-57 | nginx resolves the API's name per request (`resolver 127.0.0.11 valid=10s`, `set $api_upstream`); `NGINX_RESOLVER` is configurable (`169.254.169.253` on ECS). | Without it nginx keeps the API container's first IP and answers 502 after the API is recreated (found live in F5). |
| D-58 | Postgres repository tests run only when `TEST_DATABASE_URL` is set; PGlite was not added. | `npm test` needs no database; the adapter is still tested against a real PostgreSQL (the Compose one), with no extra dependencies. |
| D-59 | Prices are stored as `decimal(10,2)` and the product title and price are a snapshot, with no foreign key. | Exact money values; the enquiry stays meaningful if the catalogue changes, without copying products (D-12). |
| D-46 | Search: `GET /api/search?q=` validates the query with zod (exactly one `q`, 1 to 100 characters trimmed) and answers 400 `INVALID_SEARCH_TERM` with `details: { field: 'q' }` otherwise; nothing matching is 200 `[]`, not 404. | Bad input is the client's error (400); an empty result is a valid answer. A repeated `q` is rejected so the term is never ambiguous. |
| D-47 | Search results are in source order, not ranked. | The AC asks only that non-matching products are excluded; ranking needs a relevance rule nobody asked for. Listed as a next step. |
| D-48 | The search box is an uncontrolled input keyed by the URL term: it shows the term on the results page and clears when leaving search; a blank submit does nothing and keeps focus. `maxlength=100` mirrors the server. | The URL is the single source of truth for the term, so back/forward and deep links stay in step without syncing state. |
| D-49 | The results page with no term shows a prompt and makes no request; a 400 shows the API message without "Try again" (retrying cannot fix it); other errors offer a retry. | Same rule as not found (D-36, D-42): retry only what can change. |
| D-39 | The category slug rule (`isValidCategorySlug`: what `slugify` produces, 64 characters max) lives in the domain next to `slugify`; an impossible slug is a 404 without any upstream call. | Same pattern as product ids (D-34); the rule is defined by the slug generator, so it cannot drift from it. |
| D-40 | The category page split is a pure domain function, `splitCategoryPage`: the featured products of that category, in configured order; if none, the top 3 by rating (ties by count, then source order; unrated never picked); everything else in `others`, source order. | "Top rated" keeps one meaning across the home and category pages (D3), the fallback avoids an empty section, and a pure function is easy to test exhaustively (every category times several featured sets). |
| D-41 | Header category links (`CategoryNav`) render nothing while loading or on error, instead of an error message. | The header is shared by every page; the page below shows its own loading and error states, so a second error in the header would only repeat it. |
| D-42 | The category page hides a section with no products, and a 404 shows "Category not found" (no retry), like the product page (D-36). | No empty headings; a missing category is final, a 502 is temporary. |
| D-43 | Client tests: the MSW server answers `/api/categories` by default (four categories), restored after every test; everything else is registered per test. | The header asks for categories on every page, so every page test would otherwise repeat the same handler. Any test can still override it (e.g. the "categories fail" test). |
| D-44 | No cache yet (D-31) now means the home page makes two upstream `GET /products` calls (featured products, categories) and a category page two (its products, categories). | Still correct and simple; the TTL cache around `ProductSource` (`TASKS.md` 1.12) would make these one call per TTL. |
| D-15 | **No local copy of the products either, and no offline mode.** The local JSON catalogue source and its `server/data/catalogue.json` were removed. If Fake Store is down, the API returns 502 and the page shows an error with a retry (known limitation). | Same reason as D-12: a snapshot used at runtime is a second copy that goes stale and needs syncing. |

## AI log (feed `AI_USAGE.md`)

Tools: a terminal-based AI coding agent, model Claude Opus 5.5 (`claude-opus-5-5`).

| When | What happened | How it was caught / outcome |
|---|---|---|
| Plan | Checked the live Fake Store API before writing tasks instead of trusting assumptions. Found: no search endpoint; unknown id returns HTTP 200 with an empty body (not 404); category `jewelery` is misspelt. | `Invoke-WebRequest` on `/products/999` showed status 200, body length 0. These facts drive D-05 and D-07. |
| Slice 00 | The AI's hand-written expectation for search `cotton jacket` was `['3', '16']`. | The contract test failed with `['3', '16', '17']`: product 17's description says "Attached Cotton Lined Hood". The code was right, the expectation wrong. Fixed the test and added a comment. |
| Slice 00 | While designing the category-name overrides, an object literal lookup was the obvious choice. | Rejected before writing it: `obj['constructor']` returns a function, so a category named "constructor" would break. Used a `Map` and added a test for `constructor`. |
| Slice 00 | Mutation check: made `matchesSearch` always return `true`. | 8 tests failed across 3 files, so the tests do guard the search AC. Restored; all pass. Re-checked after D-15: still 8 of 92 fail. |
| Slice 00 | npm installed TypeScript 7.0 (latest). | Removed `esModuleInterop` from `tsconfig.json` to avoid deprecated-option errors; typecheck and build pass. |
| Plan | Asked for PostgreSQL + Prisma in the data layer, the AI started installing Prisma (and PGlite for tests) to store products, without restating its own earlier argument against storing products. | **The author caught it:** storing products duplicates Fake Store and breaks the single source of truth; only enquiries need a database. The packages were removed (`package.json` and lockfile clean, 102 tests still pass) and the database moved to F5 (D-12, D-13). |
| Plan | A PowerShell script used to tick the checkboxes in the old `01-database.md` re-encoded the file and garbled the diagram's box-drawing characters. | Seen when re-reading the file. Replaced by `00-data-layer.md` with an ASCII diagram; file edits now go through the editor tools, not shell rewrites. |
| Slice 01 | Smoke test of `npm run dev`: the first `curl` to `/api/health` returned nothing. | Not assumed to be fine: re-ran with status output and checked the port listener. It was a timing race (request sent while the watcher was still starting); the second run returned 200. Also checked a bad config exits with code 1 and lists every problem. |
| Slice 01 | Commit `629162c` (config) was pushed with `config.test.ts` but without `config.ts`, so the tests fail at that commit. | Caught by the agent comparing `git status` with the commit's file list. Already pushed, so not amended (that would need a force push); `config.ts` landed in the next commit, `e345cb4`, where all 118 tests pass. Lesson: check `git diff --cached --name-only` before each commit. |
| Slice 01 | The AI wrote `server.listen({ onUnhandledRequest: 'error' })`, the MSW 2 option. | The typecheck failed: MSW 3 renamed it `onUnhandledFrame`. Read the installed type definitions instead of guessing, then fixed it. |
| Slice 01 | The AI's comment claimed an unhandled request "fails the test". | A probe test showed it did not: MSW blocks the request, the API client turns it into `NETWORK_ERROR`, and the test still passed. Added a `request:unhandled` listener that fails the test in `afterEach`; re-ran the probe to prove it now fails, then deleted it (D-24). |
| Slice 01 | `ProductTile` test failed: the link's accessible name was "Mens Cotton Jacket$55.99". | A real accessibility bug, not a test bug: inline spans had no space between them, so a screen reader would run the words together. Added a space between title and price (D-23). |
| Slice 01 | Mutation check on the client: ignored the API's error body. | 1 test failed (`turns the API error shape into an ApiError`), so the error mapping is guarded. Restored. |
| Slice 01 | Adding a CSP to nginx risked a blank page that `curl` cannot detect. | Not assumed safe: checked the built `index.html` (external script and stylesheet only) and the bundle (no `eval` / `new Function`), then rendered the page in headless Edge through nginx: the React app renders on `/` and on an unknown route. |
| Slice 01 | The first Compose timing (15 s) was reported by the AI as "built from scratch". | Corrected before reporting: removing image tags leaves Docker's build cache. Re-measured with `docker compose build --no-cache`: about 11 s once the base images are pulled. |
| F1 | The AI's first version of the "upstream fails" service test built a fake source by spreading an `InMemoryProductSource` and casting it to `ProductSource`. | Caught on re-reading, before running: a spread does not copy class methods, and the cast hid that from the compiler. Replaced with a small subclass that overrides `getByIds`; no cast. |
| F1 | Mutation checks: (1) sorted the featured products by id instead of the configured order; (2) rendered only the first 3 tiles. | (1) failed 7 server tests (service and API); (2) failed the home page test. Both restored. |
| F1 | Live checks instead of trusting the tests: rebuilt Compose, called `/api/featured-products` against the real Fake Store, screenshotted the page in headless Edge, then pointed the API at an unreachable address. | 12, 11, 3, 18, 5 in order with images; unreachable upstream gave 502, the page's error with "Try again", and a server log line naming the cause. Restored the real URL. |
| F4 | Mutation checks: (1) the route treated an unknown product as found (200 with `null`); (2) the page treated a 404 like any other error. | (1) failed 7 server tests; (2) failed the "Product not found" test. Both restored. |
| F4 | A live probe of `/api/products/..%2F..%2Fetc` through nginx returned the app page with 200 instead of the API's 404, which looked like a routing bug. | Not assumed either way: probed both layers. nginx decodes and resolves `..` before routing (that URL becomes `/etc`, served as the app shell, which shows "Page not found"), and rejects anything above the web root with 400; no file is ever served. The API, called directly, answers 404 without calling Fake Store. Safe, recorded here instead of changed. |
| F2 | Mutation checks: (1) `others` repeated the top-rated products; (2) the rating fallback was switched off; (3) the page showed the top-rated list under "More in". | (1) failed 6 tests, (2) 5 tests, (3) 2 tests. All restored. |
| F2 | The first headless Edge render run hung until the shell timeout (a stuck browser instance holding its profile). | A tooling problem, not the app: stopped the stuck process, then rendered one page at a time with a fresh profile and a 45 s limit each; all pages rendered. |
| F2 | The render check reported "no category link" on the product page. | Not taken at face value: the markup showed the link is there; the check's pattern missed React Router's `data-discover` attribute. The unit test `on a product page opens that product's category` covers it too. |
| F3 | Two of the AI's hand-written expectations were wrong: `men's` was expected to match only the 10 clothing products, and `%` was expected to match nothing. | The tests failed and the data explained both: product 5's title "John Hardy Women's ..." contains "mens" (substring search, D-06), and five descriptions contain "100%". The code was right; the expectations were corrected, with a comment on the first. |
| F3 | Mutation checks: (1) search returned every product; (2) the 100-character limit was lifted; (3) a blank search navigated. | (1) failed the service and API tests, (2) the over-100 test, (3) both blank-term tests. All restored. |
| F5 | The first live enquiry through nginx returned nginx's own HTML 502, though the API answered 201 directly. | Diagnosed instead of retried: the nginx log showed it connecting to the API's old IP. nginx resolves `proxy_pass` hosts once at startup, and the API container had been recreated. Fixed with a per-request resolver (D-57), and proved it by forcing the API onto a new IP (holding the old one with a dummy container) without restarting nginx. A latent bug since slice 01, invisible until containers were recreated independently. |
| F5 | `npm audit` reported 3 high-severity advisories after installing Prisma. | Traced instead of `--force`-fixed (which would downgrade to Prisma 6): `effect` through the Prisma CLI. Found the CLI was also in the runtime image (optional peer of `@prisma/client`); `--omit=optional` removed it, cutting the image from 670 to 368 MB (D-56). |
| F5 | The AI's first "body is not a JSON object" test sent a bare JSON string and expected field errors. | It got `INVALID_JSON`: Express's strict JSON parser rejects non-object bodies first. Both behaviours are correct; split into two tests (a JSON array reaches validation, a bare string does not). |
| F5 | The browser check script failed waiting for field errors. | The script was wrong, not the app: it waited for "a form" and the header's search form matched before the enquiry page loaded. Waited for the enquiry heading instead; the run passed. |
| F5 | Mutation checks: CR/LF allowed in name and email; honeypot ignored; email failure not recorded as FAILED; the client's product title trusted; the form cleared after a failure; the button not disabled while sending. | All six caught (the CR/LF one by 3 tests: 2 in the domain, 1 in the API). Restored. |
| F5 | The F5 commits were made with a different split from the checked plan: `0e3ff6e` includes `services/enquiry-service.test.ts` (needs `test-app.ts` from `6f4fca8`) and the client's `api/enquiries.test.ts` (needs `api/enquiries.ts` from `d578472`). | Found by the agent comparing each commit's file list with the plan, then checking out each commit in a clean worktree: `0e3ff6e` fails the server typecheck (9 service tests fail); `6f4fca8` passes the server (317) but fails the client typecheck; `d578472` passes everything. Already pushed, so not rewritten (no force push), same as `629162c` in slice 01. Lesson, again: check `git diff --cached --name-only` against the plan before each commit. |
| Plan | Checking Prisma versions showed npm's `latest` tag pointing to a release candidate. | Caught by reading the dist-tags; pinned the stable `7.10.1` in the F5 plan (D-14). |
| Slice 00 | The AI had added a local JSON catalogue as an "offline fallback" source (`PRODUCT_SOURCE=local`), and defended keeping it. | **The author caught it:** a runtime snapshot is another copy of the products that needs syncing, the same problem as the database. Removed the source, its data file, the factory and the setting; kept only the recorded response as a test fixture (D-15). 102 -> 92 tests; typecheck and build pass. |

## Time spent

Record your real time; the AI cannot measure it for you.

| Activity | Plan | 00 | 01 | F1 | F4 | F2 | F3 | F5 | Wrap-up |
|---|---|---|---|---|---|---|---|---|---|
| Planning | | | | | | | | | |
| Building | | | | | | | | | |
| Testing | | | | | | | | | |
| Reviewing | | | | | | | | | |

## Next session (wrap-up)

1. Commit the docs on `slice/feature-enquiry` (F5 code is already pushed), push, merge (PR #7): `roadmap/03-pull-request.md`, "F5 and the docs", step 4. Then check the feature branch has `README.md`, `AGENTS.md`, `TASKS.md`.
2. `DECISIONS.md` written on 2026-11-25 (assumptions per AC, key decisions and trade-offs, dropped or simplified, growth, next steps). `AI_USAGE.md` written the same day from the AI log; its two `TODO(author)` lines (other tools used, the ownership statement) are the user's.
3. `docs/HLD.md` was regenerated from the code on 2026-11-25; after PR #7 merges, only its F5 status row and status line need updating. Fill the time table.
   When writing `DECISIONS.md`, include as decisions (not as "changes from the plan"): no runtime copy of the products (D-10, D-15), database for enquiries only (D-12, D-13), 502 for every outside-system failure (D-17), 404 for an impossible id (D-35), migrations in a one-off service and no Prisma CLI at runtime (D-55, D-56), local defaults memory/console refused in production (D-54), nginx per-request DNS (D-57), no cache yet (D-31, D-44).
4. Fresh-clone test: clone the feature branch into a new folder, `docker compose up --build`, time it, click through all 5 ACs.
5. Finish `roadmap/PR_DESCRIPTION.md` and open the PR from `feature/product-catalogue-poc` into `main`; leave it open.
