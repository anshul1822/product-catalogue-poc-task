# Product catalogue proof of concept

A product catalogue where customers browse, search and view products, and send an enquiry that emails the sales inbox. It is built as a foundation that can grow: the product data source, the look and feel and the email provider can each be replaced without rewriting the rest.

> **Status:** all five acceptance criteria are built and tested. Progress, decisions and the AI log are in `roadmap/PROGRESS.md`.

## Quick start

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with Compose v2), running.

```bash
git clone -b feature/product-catalogue-poc https://github.com/anshul1822/product-catalogue-poc-task.git
cd product-catalogue-poc-task
docker compose up --build
```

No `.env` file and no accounts are needed. Compose starts PostgreSQL, applies the database migration, starts Mailpit (the sales inbox) and the API, then the web app once the API passes its health check. Then open:

| What | URL |
|---|---|
| **Web app** | http://localhost:8080 |
| **Sales inbox (Mailpit)**: every enquiry email arrives here | http://localhost:8025 |
| API health check | http://localhost:3000/api/health |

Stop with `Ctrl+C`, then `docker compose down`. Enquiries are kept in the `postgres-data` volume, so they are still there after `docker compose down` and `up`, and after a rebuild. **`docker compose down -v` deletes them.**

If a port is already in use, copy `.env.example` to `.env` and change `APP_PORT`, `API_PORT`, `MAILPIT_PORT` or `POSTGRES_PORT`.

## Try each acceptance criterion

| # | Acceptance criterion | Try it |
|---|---|---|
| F1 | The home page shows the 5 products the owner chose as "top rated" | Open http://localhost:8080 |
| F2 | A category link shows that category's top-rated products and its other products | Click **Electronics** in the header |
| F3 | Search shows only products whose text matches the term | Type `jacket` in the header and click **Search** (products 3, 15, 16, 17) |
| F4 | Clicking a product tile opens its details page | Click any tile |
| F5 | Enquire: the sales inbox receives an email and the customer sees "Thank you" | On a product page click **Enquire**, fill in your name and email, click **Send enquiry**; then open http://localhost:8025 |

The API behind them, in JSON: `/api/featured-products`, `/api/products/3`, `/api/categories`, `/api/categories/electronics/products`, `/api/search?q=jacket`, and `POST /api/enquiries`.

To see the stored enquiries:

```bash
docker compose exec postgres psql -U catalogue -d catalogue -c "SELECT created_at, product_title, customer_email, status FROM enquiries ORDER BY created_at DESC;"
```

## Stack and why

| Layer | Choice | Why |
|---|---|---|
| Client | React 19 + TypeScript (Vite, React Router), CSS modules on design tokens | The brief prefers TypeScript; a web app runs with Docker Compose, with no Xcode, Android Studio or emulator |
| Backend | Node 22 + TypeScript, Express 5, zod | One language across both tiers; zod validates every input and every upstream response |
| Product data | Fake Store API, through the backend only | Allowed by the brief; the client never calls it, and products are never copied |
| Database | PostgreSQL 16 + Prisma 7, **enquiries only** | The enquiry is the only data the app owns; it is saved before the email, so a failed email does not lose the lead |
| Email | SMTP with Nodemailer; Mailpit locally | A real inbox to check, with no accounts or paid services; Amazon SES over SMTP is a configuration change |
| Local run | Docker Compose: nginx (web app), Node (API), PostgreSQL, Mailpit | One command; the images run as non-root and are AWS-ready (ECS Fargate, RDS, SES) |
| Tests | Vitest; Supertest (API); Testing Library and MSW (web app) | Fast, TypeScript-native, no network or database needed |

## Architecture

Ports and adapters (hexagonal): the business rules depend only on interfaces, and every outside system is a replaceable adapter. Full diagrams: `docs/HLD.md`.

```text
browser --> nginx :8080 --/api--> API :3000: http/ --> services/ --> ports/ <-- adapters/
            (web app)                                                ProductSource       fakestore/ (HTTP)
                                                                     FeaturedProducts    featured-config/ (env)
                                                                     EmailSender         email-smtp/ (Mailpit, SES), email-console/
                                                                     EnquiryRepository   enquiry-postgres/ (Prisma), enquiry-memory/
```

- The browser only ever calls `/api` on its own origin. nginx (in Docker) or the Vite dev server (in development) forwards it to the API, so there is no CORS and the browser never calls Fake Store.
- Services depend only on the interfaces in `ports/`. Adapters are chosen in `server/src/main.ts` from configuration, so changing the product source, the email provider or the enquiry store means a new adapter and a setting, not a rewrite.
- **Products are never copied**, into the database or a local file. Fake Store is their single source of truth. If it is down, the API returns an error and the page offers a retry.
- **An enquiry** is validated, the product is looked up on the server, the enquiry is saved as `PENDING`, the email is sent, and the row is marked `SENT` or `FAILED`.
- Look and feel lives in `client/src/theme/tokens.css`; components use only those tokens, so the brand's design lands by editing one file.

## Local development without Docker

Prerequisites: Node.js 22 or later. Use two terminals:

```bash
# Terminal 1: the API on http://localhost:3000
cd server
npm ci
npm run dev

# Terminal 2: the web app on http://localhost:5173 (forwards /api to :3000)
cd client
npm ci
npm run dev
```

Both reload when files change. Without Docker the API needs no database or mail server: by default it keeps enquiries in memory (lost on restart) and prints each email to its console. To use a real PostgreSQL and SMTP server instead, set `ENQUIRY_STORE=postgres`, `DATABASE_URL`, `EMAIL_PROVIDER=smtp` and the `SMTP_*` keys in `.env` (the API reads it from the repository root), and run `npm run db:migrate` in `server/` once.

## Commands

| In `server/` | What it does |
|---|---|
| `npm run dev` | API with reload on file changes |
| `npm test` | 317 tests, no network or database needed |
| `npm run typecheck` | TypeScript check |
| `npm run build`, `npm start` | Compile to `dist/`, then run it |
| `npm run db:migrate` | Apply the database migrations to `DATABASE_URL` (Docker Compose does this for you) |
| `npm run snapshot` | Re-records the test fixture `src/test-support/fakestore-products.json` from the live API; the only command that calls the network |

`npm ci` also generates the Prisma client (`postinstall`). The PostgreSQL repository tests run against a real database when `TEST_DATABASE_URL` is set, for example with Docker Compose running: `TEST_DATABASE_URL=postgresql://catalogue:catalogue@localhost:55432/catalogue npx vitest run src/adapters/enquiry-postgres`.

| In `client/` | What it does |
|---|---|
| `npm run dev` | Web app with hot reload on http://localhost:5173 |
| `npm test` | 93 tests; the API is faked with MSW |
| `npm run typecheck` | TypeScript check |
| `npm run build` | Typecheck and production bundle in `dist/` |

## Configuration

Every setting has a safe default, so `.env` is optional. To override one, copy `.env.example` to `.env` (Docker Compose and the API dev server both read it). Never commit `.env`.

| Key | Default | Purpose |
|---|---|---|
| `FEATURED_PRODUCT_IDS` | `12,11,3,18,5` | The 5 "top rated" products on the home page, in display order. A category page shows the ones in that category as its "top rated" (or its top 3 by rating if none is). Edit and restart (with Compose: `docker compose up -d`) |
| `SALES_INBOX_EMAIL` | `sales@catalogue.local` | Where every enquiry is sent |
| `EMAIL_FROM` | `no-reply@catalogue.local` | Sender of the enquiry emails |
| `PUBLIC_APP_URL` | `http://localhost:8080` | Base URL of the web app, for the product link in the email |
| `ENQUIRY_STORE` | `memory` | `memory` (local only, lost on restart) or `postgres`. **Docker Compose always uses `postgres`** |
| `DATABASE_URL` | empty | PostgreSQL URL; required for `postgres` |
| `EMAIL_PROVIDER` | `console` | `console` (local only, prints the email) or `smtp`. **Docker Compose always uses `smtp` to Mailpit** |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | `localhost`, `1025`, `false` | SMTP server. For Amazon SES: its SMTP host, `465`, `true` |
| `SMTP_USER`, `SMTP_PASS` | empty | Only for a real provider; never commit real values |
| `FAKESTORE_BASE_URL` | `https://fakestoreapi.com` | Fake Store base URL |
| `UPSTREAM_TIMEOUT_MS` | `5000` | Timeout for each Fake Store request |
| `PORT` | `3000` | Port of the API process (inside its container) |
| `APP_PORT`, `API_PORT`, `MAILPIT_PORT`, `POSTGRES_PORT` | `8080`, `3000`, `8025`, `55432` | Docker Compose: ports on your machine |

The API checks its configuration at startup and refuses to start with a list of every invalid value, for example a `FEATURED_PRODUCT_IDS` that is not exactly 5 unique ids. With `NODE_ENV=production` it also refuses the local-only `memory` store and `console` email.

## Repository layout

```text
AGENTS.md            rules for the AI coding agents
TASKS.md             the challenge brief broken down into tasks
docs/HLD.md          high-level design diagrams
roadmap/             build plan: slices, progress log (decisions, AI log), HLD prompt
.env.example         configuration with safe local defaults
docker-compose.yml   web app, API, PostgreSQL, the one-off migration, Mailpit
server/
  Dockerfile         multi-stage Node image, non-root, healthcheck; the build stage also runs the migrations
  prisma/            schema.prisma (the enquiries table) and migrations/
  prisma.config.ts   Prisma CLI configuration
  scripts/           snapshot-catalogue.ts (re-records the test fixture)
  src/config.ts      environment parsing and validation
  src/main.ts        composition root: config, adapters, services, start the server
  src/app.ts         HTTP app: security headers, body limit, trusted proxy, routes, error handling
  src/http/          error shape and handler, routes (health, featured products, products, categories, search, enquiries)
  src/services/      CatalogueService (catalogue rules), EnquiryService (save, then email)
  src/domain/        Product, Category, errors, id and slug rules, search, category page split, enquiry validation, the enquiry email
  src/ports/         ProductSource, FeaturedProducts, EmailSender, EnquiryRepository
  src/adapters/      fakestore/, featured-config/, email-smtp/, email-console/, enquiry-postgres/, enquiry-memory/, in-memory/ (tests), contract test suite
  src/generated/     Prisma client, generated by `npm ci` (not committed)
  src/test-support/  test helpers and the recorded Fake Store response
client/
  Dockerfile         Vite build, served by non-root nginx
  nginx/             nginx config: /api proxy, client-side routes, security headers, caching
  src/api/           the only code that calls the API: client, typed endpoint functions, enquiry rules, useApiData hook
  src/theme/         design tokens and base styles
  src/components/    layout, header category links and search bar, product tile and grid, price, loading / error / empty states
  src/pages/         home, product details, enquiry form, category, search results, not found
  src/test-support/  test setup, fake API (MSW), render helpers
```

## Branches

| Branch | Purpose |
|---|---|
| `main` | Initial commit only. The work is reviewed through the open pull request into `main` |
| `feature/product-catalogue-poc` | **The complete application. Clone and run this branch.** |
| `setup/data-layer`, `setup/foundation` | Groundwork the features build on, each merged into the feature branch with a merge commit. Kept as history only |
| `slice/feature-home` (F1), `slice/feature-product` (F4), `slice/feature-category` (F2), `slice/feature-search` (F3), `slice/feature-enquiry` (F5) | One branch per acceptance criterion, each merged into the feature branch with a merge commit. Kept as history only |

```bash
git log --first-parent --oneline main..feature/product-catalogue-poc   # one line per slice
```

## Testing

- **No default test calls the network or a database.** The server tests replay a recorded Fake Store response through a fake `fetch` and use an in-memory enquiry store and a fake email sender; the web app tests fake the API with MSW, and a request without a fake response fails the test.
- Every acceptance criterion has a test that does what a user would do, for example clicking **Enquire**, filling in the form and seeing "Thank you".
- One contract test suite runs against every product source, so a new source (for example a PIM) is proven to behave the same before it is used.
- Failure paths are tested: timeouts, HTTP errors, invalid JSON, unexpected data, unsafe image URLs, invalid configuration, malformed or oversized request bodies, unknown routes, header injection in enquiries, the email or the database failing, the rate limit.

## Documentation

- `TASKS.md`: requirements, constraints and acceptance criteria from the brief.
- `docs/HLD.md`: high-level design (system context, containers, ports and adapters, key flows, deployment).
- `roadmap/`: the build plan and progress log (decisions and AI usage notes).
- `DECISIONS.md`: assumptions where the criteria were unclear, key design decisions and trade-offs, what was dropped or simplified, how the design grows, what comes next.
- `AI_USAGE.md`: the AI tools used, the agent instructions (`AGENTS.md`), the plan, the key moments, where the AI went wrong and how its output was checked.
