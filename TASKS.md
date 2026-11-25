# Code Challenge: AI-Native Engineer — Task Breakdown

> **Source:** `Code Challenge - AI-Native Engineer 1.pdf` (4 pages)
> **Purpose:** the brief turned into precise, checkable tasks. Use it as the plan/spec for your AI tools, commit it (e.g. `docs/TASKS.md`) and link it from `AI_USAGE.md`, which asks for "your plan or spec, if you used one".
>
> Items marked **(brief)** are requirements stated in the PDF. Everything else is a recommended way to meet them: change anything, but record what you changed and why in `DECISIONS.md`.
>
> **Execution order:** this file is the reference breakdown, grouped by layer. The build runs in 7 slice branches (data layer, foundation, then one per acceptance criterion); see `roadmap/README.md`. Where the two differ, the decisions in `roadmap/PROGRESS.md` win.

**Priority:** **P0** required by the brief · **P1** expected by the selection criteria (quality, security basics, tests) · **P2** stretch; if skipped, list it under "What I'd do next" in `DECISIONS.md`.

---

## 1. Objective

Build a **product catalogue proof of concept** (web or mobile) for an entrepreneur, where customers can:

1. see 5 featured "top rated" products on the home page;
2. browse products by category;
3. search for products;
4. open a product details page;
5. send an enquiry about a product, after which the **sales inbox receives an email** and the customer sees a **"Thank you"** message.

What the brief stresses:

- **Not a throwaway prototype (brief).** Build a foundation that can grow. The **product data source**, **look and feel** and **email provider** are all expected to change, so each needs a clear boundary.
- **Fake Store API is acceptable (brief)** because product metadata does not matter yet.
- **Judgement over feature count (brief).** "A small, well-reasoned solution beats a large, unexplained one." Stay on the critical path.
- **Use AI to plan and build; you own every line (brief).** In the follow-up you must explain and defend every decision, including those the AI made.
- **The acceptance criteria deliberately leave gaps (brief).** Make a reasonable assumption, record it, move on. Do not email to ask.
- **Time-box 2–3 hours (brief).** If you drop or simplify a requirement, say why. Report actual time honestly; going over is fine.

## 2. Hard constraints (brief)

| # | Constraint | How to meet and verify |
|---|---|---|
| C1 | Choose **one client and one backend**, any combination. Client: React web app (TypeScript preferred), iOS (Swift or Objective-C), Android (Kotlin or Java). Backend: Node.js (TypeScript preferred), PHP with Laravel. **State the choice and why in the README.** | README section "Stack and why" (see D1). |
| C2 | **The client must not call the Fake Store API**; all product data goes through your backend. | Client code calls only `/api/...` and contains no Fake Store URL. See D4 for images. |
| C3 | Any infrastructure must be **AWS-compatible**. | Plain Docker images (run on ECS/Fargate). No other-cloud-specific services. IaC is optional. |
| C4 | A reviewer can **run it locally in under 10 minutes** from the README. Web: **one or two commands** where possible (e.g. `docker compose up`). Mobile: builds and runs on the iOS Simulator or Android Emulator against the **locally running backend**. | Fresh-clone test, timed (task 5.6). |
| C5 | **No secrets committed.** Use an example env file (e.g. `.env.example`) for configuration. | `.env` is git-ignored; `.env.example` holds safe local defaults. |
| C6 | **No paid services or accounts** the reviewer would have to create. | A local mail catcher is the sales inbox (D5); Fake Store needs no key. |

## 3. Fake Store API facts that drive the design (checked 2026-11-23)

- Base URL `https://fakestoreapi.com`. Useful endpoints: `GET /products`, `GET /products/{id}`, `GET /products/categories`, `GET /products/category/{category}`.
- 20 products in 4 categories: `electronics` (6), `jewelery` (4, misspelt in the source), `men's clothing` (4), `women's clothing` (6).
- Product shape: `{ id: number, title, price: number, description, category: string, image: url, rating: { rate, count } }`. There is no currency field.
- **There is no search endpoint**, so the backend must implement search.
- **An unknown id (`GET /products/999`) returns HTTP 200 with an empty body, not 404.** The adapter must treat an empty body as "not found"; calling `.json()` on it throws.
- Category names contain spaces and apostrophes. The backend should expose URL-safe **slugs** (e.g. `mens-clothing`) and display names (e.g. "Jewellery") instead of leaking source values, and URL-encode names when calling the source.
- Product images are hosted on `fakestoreapi.com/img/...` (see D4).

## 4. Decisions to make before building

Record each decision and its reason: D1 in the README (C1), the rest in `DECISIONS.md`.

**D1. Client and backend**
- Recommended: React + TypeScript (Vite) client; Node.js + TypeScript backend (Express or Fastify).
- Why: TypeScript is preferred in both rows; one language across both tiers; web plus Docker Compose is the most reliable way to meet C4, whereas a mobile client needs Xcode or Android Studio and an emulator on the reviewer's machine.
- If you choose mobile: the Android Emulator reaches the host at `10.0.2.2` and the iOS Simulator at `localhost`; pin tool/SDK versions, give exact build steps, and still run the backend with Docker Compose.

**D2. Where the 5 "top rated" products come from (home page)**
- Options: (a) a curated list of product IDs in configuration; (b) computed from Fake Store `rating.rate`; (c) an admin UI.
- Recommended: (a), via `FEATURED_PRODUCT_IDS` behind a `FeaturedProducts` port, e.g. `12,11,3,18,5` (today's five highest-rated, covering all four categories).
- Why: the AC says "I have **chosen** 5 products", which is a business choice, not a computed metric. An admin UI is out of scope; the port lets a CMS or database replace the config later.

**D3. "Top rated" on a category page**
- Options: (a) the chosen products that belong to that category; (b) the top N by `rating.rate` in that category; (c) a separate curated list per category.
- Recommended: (a), falling back to the top 3 by `rating.rate` when no chosen product is in the category.
- Why: "top rated" keeps one meaning across pages; the fallback avoids an empty section.

**D4. Product images versus C2**
- Options: (a) the client loads the image URLs returned by the backend; (b) the backend proxies images.
- Recommended: (a), recorded as an assumption. The client never calls Fake Store's API or builds its URLs; images are static assets, as a CDN would serve them. (b) is the strictest reading of C2; mention it as the alternative.

**D5. Sales inbox without accounts (C6)**
- Recommended: a Mailpit container (SMTP on 1025, inbox UI on http://localhost:8025) and an SMTP adapter (e.g. Nodemailer).
- Why: the reviewer can see the email without signing up for anything. Moving to a real provider (e.g. Amazon SES via SMTP, or an API-based provider adapter) is a configuration or adapter change only.

**D6. What goes in a database (decided)**
- Products: **not stored**. Fake Store is their single source of truth; a copy would duplicate it and need a sync job.
- Featured products: configuration (D2).
- Enquiries: **PostgreSQL + Prisma**, in slice F5. The enquiry is the only data the app owns; saving it before the email means a failed email does not lose the lead. Details in `roadmap/02-features.md`.

## 5. Recommended architecture

The selection criteria look for **clear boundaries between frontend, backend and the product data source**; the email provider gets the same treatment.

```text
client/ (React)  --HTTP /api-->  server/ (Node + TS)
                                   http/       routes, request validation, error mapping
                                   services/   CatalogueService, EnquiryService (business rules)
                                   ports/      ProductSource, FeaturedProducts, EmailSender, EnquiryRepository (interfaces)
                                   adapters/   fakestore/, in-memory/ (tests), featured-config/, email-smtp/, email-console/,
                                               enquiry-postgres/ (Prisma), enquiry-memory/
                                   domain/     Product, Category, Enquiry (source-agnostic types)
                                   config.ts   env parsing and validation (fail fast)
                                   main.ts     composition root: chooses adapters from env
```

Rules:

- Services depend only on **ports** and the **domain model**, never on Fake Store response types or an email SDK.
- The API returns the backend's own model: `Product { id: string, title, description, price, imageUrl, category: { slug, name }, rating? }`. The Fake Store shape stops at the adapter.
- Business rules (what counts as top rated, how search matches) live in the backend, so a future mobile client behaves the same as the web one.
- Changing the data source or email provider means a new adapter plus an env change; no service or client code changes.
- Look and feel: colours, spacing and typography live in one theme file (CSS custom properties); components contain no hard-coded brand styling.

**API contract (suggested)**

| Method and path | Used by | Responses |
|---|---|---|
| `GET /api/health` | Docker healthcheck | 200 |
| `GET /api/featured-products` | F1 home | 200 `Product[]` (the chosen 5, in configured order) |
| `GET /api/categories` | F2 category links | 200 `{ slug, name }[]` |
| `GET /api/categories/:slug/products` | F2 category page | 200 `{ category, topRated: Product[], others: Product[] }`; 404 |
| `GET /api/search?q=term` | F3 search | 200 `Product[]`; 400 if `q` is blank or too long |
| `GET /api/products/:id` | F4 product page | 200 `Product`; 404 |
| `POST /api/enquiries` | F5 enquiry | 201; 400 with field errors; 404 unknown product; 502 email failure |

- Every error uses one body shape: `{ "error": { "code": "...", "message": "...", "details": {...} } }`.
- An upstream failure or timeout returns 502, never a stack trace (decision D-17 in `roadmap/PROGRESS.md`).
- `/api/featured-products` and `/api/search` deliberately avoid sitting under `/api/products/:id`, so route order cannot make "featured" or "search" look like an id.

## 6. Tasks

### Phase 0: Setup and AI workflow

- [ ] **0.1** Start a **time log** now and record time per activity: planning, building, testing, reviewing (brief, item 7). (P0)
- [ ] **0.2** Start an **AI log** now: tools and models, key prompts, and every time the AI was wrong and how you caught it. Write entries as they happen, not afterwards. This feeds `AI_USAGE.md`. (P0)
- [ ] **0.3** Create the repository on GitHub, GitLab or Bitbucket where the reviewers can reach it: public, or private with access for the reviewers named in the email (brief). (P0)
- [ ] **0.4** Make an initial commit on `main` with only `.gitignore` (`.env`, `node_modules`, build output) and a README stub, so the PR shows all the work. (P0)
- [ ] **0.5** Create a feature branch (e.g. `feature/product-catalogue-poc`) and do all the work there (brief), in slice branches merged into it with `--no-ff` (see `roadmap/README.md`). (P0)
- [ ] **0.6** Write and commit the agent instruction file: `AGENTS.md`, `CLAUDE.md` or `.cursor/rules` (brief). It should cover: (P0)
  - goal and scope: the five ACs only, no extra features;
  - architecture rules: the client never calls Fake Store, services depend on ports, one adapter per data source or email provider;
  - stack and commands: install, dev, test, lint, typecheck;
  - conventions: TypeScript strict, no `any`, small modules, consistent error shape;
  - testing: every AC has a test, no real network calls in tests;
  - security: validate all input on the server, never commit secrets, escape user content in emails;
  - ask before adding a dependency.
- [ ] **0.7** Commit this plan (e.g. `docs/TASKS.md`) so `AI_USAGE.md` can link to it. (P0)

### Phase 1: Backend foundation

- [ ] **1.1** Scaffold `server/`: Node LTS, TypeScript strict, Express or Fastify, ESLint and Prettier, Vitest. Add scripts `dev`, `build`, `start`, `test`, `lint`, `typecheck`, and commit the lockfile. (P0)
- [ ] **1.2** Add a config module that parses env with a schema (e.g. zod) at startup and fails fast with a clear message. The keys are listed below. (P0)
- [ ] **1.3** Define the domain types `Product`, `Category` and `Enquiry`, independent of any source (string `id`, category as `{ slug, name }`). (P0)
- [ ] **1.4** Define the ports. (P0)
  - `ProductSource`: `getAll()`, `getById(id)`, `getCategories()`, `getByCategory(slug)`, `search(term)`. Query-shaped methods let a future source search or filter natively.
  - `FeaturedProducts`: `getFeaturedIds()`.
  - `EmailSender`: `send(message)`.
- [ ] **1.5** Build the Fake Store adapter (implements `ProductSource`). (P0)
  - Map Fake Store JSON to the domain model: string ids, slugs, display names.
  - Keep the slug-to-source-name mapping inside the adapter, and URL-encode names in upstream calls.
  - Implement `search` in memory, since Fake Store has no search endpoint.
  - Set an upstream timeout (e.g. 5 s with `AbortController`).
  - Turn non-2xx responses and invalid JSON into a typed `UpstreamError`.
  - Return `null` (not found) for an empty body or a non-numeric id.
  - Validate the upstream payload shape instead of trusting it.
- [ ] **1.6** Build an in-memory `ProductSource` for tests, and record a Fake Store response as a test fixture so tests need no network. Run one contract suite against both adapters, which proves the data source can be swapped. No runtime copy of the products (no local file source, no offline mode): Fake Store is the single source of truth. (P1)
- [ ] **1.7** Build a config-backed `FeaturedProducts` adapter that reads the ordered list in `FEATURED_PRODUCT_IDS`. (P0)
- [ ] **1.8** Build the email adapters, chosen with `EMAIL_PROVIDER`. (SMTP P0; console P1)
  - `SmtpEmailSender` (e.g. Nodemailer): Mailpit locally, any SMTP provider later.
  - `ConsoleEmailSender`: logs the email, for runs without Docker.
- [ ] **1.9** Build the services, which depend only on ports. (P0)
  - `CatalogueService`: featured products, categories, the category-page split (D3), search, product by id.
  - `EnquiryService`: validate, look up the product, build the email, send it.
- [ ] **1.10** Build the HTTP layer: the routes in section 5, validation of params, query and body, and central error middleware that maps domain and upstream errors to the error shape. Unknown routes return 404. (P0)
- [ ] **1.11** Apply security basics. (P1)
  - Security headers (e.g. helmet).
  - JSON body limit (e.g. 10 kB).
  - No CORS: the client is served same-origin (Vite proxy in dev, nginx in Docker).
  - Rate limit on `POST /api/enquiries`.
  - No stack traces in responses and no full PII in logs.
- [ ] **1.12** Wrap `ProductSource` in an in-memory TTL cache, since Fake Store can be slow and search needs the full list. (P2)

**Suggested `.env.example` keys**

| Key | Local default | Purpose |
|---|---|---|
| `PORT` | `3000` | API port |
| `FAKESTORE_BASE_URL` | `https://fakestoreapi.com` | Upstream base URL |
| `UPSTREAM_TIMEOUT_MS` | `5000` | Upstream request timeout |
| `FEATURED_PRODUCT_IDS` | `12,11,3,18,5` | The 5 chosen "top rated" products, in display order |
| `EMAIL_PROVIDER` | `smtp` | `smtp` or `console` |
| `SMTP_HOST`, `SMTP_PORT` | `mailpit`, `1025` | Mailpit in Docker Compose |
| `SMTP_USER`, `SMTP_PASS` | *(empty)* | Only for a real provider; never commit values |
| `EMAIL_FROM` | `no-reply@catalogue.local` | Sender address |
| `SALES_INBOX_EMAIL` | `sales@catalogue.local` | The sales inbox (F5) |
| `PUBLIC_APP_URL` | `http://localhost:8080` | Product links in the email |
| `ENQUIRY_STORE` | `postgres` | `postgres` or `memory` (slice F5) |
| `DATABASE_URL` | `postgresql://catalogue:catalogue@postgres:5432/catalogue` | Enquiry database (slice F5); local container only |

### Phase 2: Client foundation

- [ ] **2.1** Scaffold `client/`: Vite, React, TypeScript strict, React Router, ESLint and Prettier, Vitest with React Testing Library and MSW. Commit the lockfile. (P0)
- [ ] **2.2** Write one API module (e.g. `src/api/catalogue.ts`) with a typed function per endpoint. It uses a relative `/api` base (Vite proxy in dev, nginx in Docker) and maps the error body to a typed error. No other file calls `fetch`. (P0)
- [ ] **2.3** Add routes: `/`, `/categories/:slug`, `/search?q=`, `/products/:id`, `/products/:id/enquire` (or an inline form, see F5), and a `*` not-found page. URLs must be shareable and work with the back button. (P0)
- [ ] **2.4** Add a layout with a header on every page: home link, **category links** (from `GET /api/categories`), and a **search bar** with a **Search** button inside a `<form>`, so Enter also submits. (P0)
- [ ] **2.5** Build shared components: `ProductTile` (image, title, price; the whole tile links to `/products/:id`), `ProductGrid`, `LoadingState`, `ErrorState` with retry, and `EmptyState`. (P0)
- [ ] **2.6** Put design tokens in one theme file (CSS custom properties) with a neutral, responsive grid. Keep brand styling out of components, because the creative work is still in progress. (P0)
- [ ] **2.7** Cover accessibility basics: semantic links and buttons, labelled inputs, image `alt` text, full keyboard use, and form errors and "Thank you" announced with `aria-live`. (P1)
- [ ] **2.8** Format all prices with one formatter (`Intl.NumberFormat`) and record the currency assumption, since the source has no currency. (P1)

### Phase 3: Features, one per acceptance criterion

For each feature: backend endpoint, then client page, then tests (Phase 4), then a manual check.

#### F1. Home page (P0)

```gherkin
GIVEN I have chosen 5 products to be "top rated"
WHEN I am viewing the home page
THEN I see those 5 featured products
```

- [ ] `CatalogueService.getFeatured()` reads the ordered ids from `FeaturedProducts` and returns those products **in configured order**.
- [ ] `GET /api/featured-products`.
- [ ] The home page shows a "Top rated" section with exactly those tiles, plus loading and error states.

Gaps to decide and record:

- "I" here is the **business owner**, not the customer, and chooses through config, not an admin UI (D2).
- "Top rated" and "featured" are the same thing.
- A configured id that no longer exists: skip it and log a warning, or fail the request?
- A config with other than 5 ids: reject at startup, or allow it?
- Display order follows the configured order.

**Done when:** with `FEATURED_PRODUCT_IDS=12,11,3,18,5` the home page shows exactly those 5 products, in that order.

#### F2. Category page (P0)

```gherkin
GIVEN my products are organised into categories
WHEN I click on a category link
THEN I see top rated products for that category
  AND I see additional products in that category
```

- [ ] `GET /api/categories` returns `{ slug, name }[]`.
- [ ] `GET /api/categories/:slug/products` returns `{ category, topRated, others }`. `others` holds the category's remaining products, with **no duplicates** from `topRated`. An unknown slug returns 404.
- [ ] Category links in the header lead to `/categories/:slug`, which has two sections: "Top rated in {category}" and "More in {category}".

Gaps to decide and record:

- How a category's "top rated" products are chosen (D3).
- What to show when a section is empty: hide it or show a message.
- How "additional" products are ordered: source order, rating or price.
- No pagination (at most 6 products per category today); the response shape allows adding it later.

**Done when:** each of the 4 category links shows that category's top-rated section and the rest of its products, with nothing from other categories and no product shown twice.

#### F3. Search (P0)

```gherkin
GIVEN I am looking for a specific product
  AND I have entered a search term in the search bar
WHEN I click the search button
THEN I only see products that have text matching that search term
```

- [ ] Implement search in the backend with a pure `matchesSearch(product, term)` helper, which `ProductSource.search` uses in the Fake Store and in-memory adapters.
- [ ] `GET /api/search?q=term` validates `q` (trimmed, 1–100 characters) and returns 400 otherwise.
- [ ] The header search form navigates to `/search?q=term`. The results page shows the term, only the matching tiles, and an empty state ("No products match …"). A blank input does not submit.

Gaps to decide and record:

- Which fields are searched. Recommended: title, description and category name. Say that description matches make results broader (e.g. "gold").
- Matching is case-insensitive and trimmed, using a plain substring match. Never build a regex from user input.
- Multi-word terms: match the whole phrase, or require every word in any order (recommended)?
- Search covers all categories, not just the current page.
- The button and Enter both trigger search; there is no type-ahead.

**Done when:** "jacket" returns only products whose searched text contains it (ids 3, 15, 16 and 17 today); a nonsense term shows the empty state; a blank search does nothing; and a test proves no non-matching product is returned.

#### F4. Product page (P0)

```gherkin
GIVEN I am browsing the products
  AND I want to see more details about a specific product
WHEN I click on a product tile
THEN I see the product details page
```

- [ ] `GET /api/products/:id` returns the `Product` or 404. Validate the id format; Fake Store's empty-body response becomes 404.
- [ ] Every `ProductTile` (home, category, search) links to `/products/:id`.
- [ ] The details page shows image, title, price, category (linking to the category page), description and rating, an **Enquire** button, and not-found and error states.

Gaps to decide and record:

- Which fields count as "details". Use all available metadata; the brief says metadata does not matter yet.
- Deep links and refresh on `/products/:id` work, and an unknown id shows a not-found page.
- If you show the source rating, say how it differs from the curated "top rated" choice to avoid confusion.

**Done when:** clicking any tile on any page opens that product's details page, and `/products/999` shows not-found.

#### F5. Enquiry (P0)

```gherkin
GIVEN I am viewing a product
  AND I am interested in a product
  AND I click on the Enquire button
  AND I complete the subsequent form with my contact details
WHEN I submit the form
THEN the sales inbox will receive an email
  AND the customer will see a "Thank you" message
```

- [ ] The **Enquire** button on the product page opens the form. Pick one: route `/products/:id/enquire`, or an inline form or modal.
- [ ] Form fields (recommended): name (required), email (required, valid format), phone (optional), message (optional, length-limited). The product id comes from the page and cannot be edited. Client-side validation mirrors the server rules and shows inline field errors.
- [ ] `POST /api/enquiries` validates the body with a schema: lengths, email format, and no CR/LF in fields that go into headers. It **looks up the product on the server by id** rather than trusting a title or price from the client, and returns 404 for an unknown product.
- [ ] The email goes to `SALES_INBOX_EMAIL` from `EMAIL_FROM`, with the customer's address as Reply-To and the subject `New enquiry: {title} (#{id})`. The body holds the customer's details and message, the product title, price and link, and a timestamp. HTML-escape user content, or send plain text.
- [ ] Save the enquiry in PostgreSQL (Prisma) as `PENDING` before sending, with a snapshot of the product id, title and price (D6). Database down: return 502 and send nothing.
- [ ] Send through `EmailSender`.
  - On success mark it `SENT` and return 201; the client replaces the form with a **"Thank you"** message.
  - On failure mark it `FAILED` and return 502; the client shows an error and keeps what the customer typed, so they can retry.
  - Disable the submit button while sending to prevent double submits.
- [ ] Add spam basics: a rate limit and a honeypot field. (P1)
- [ ] Check locally that the email appears in Mailpit at http://localhost:8025.

Gaps to decide and record:

- Which contact details are required (e.g. email required, phone optional).
- One product per enquiry. The scenario says "products", so a multi-product enquiry or cart is future work.
- The email is sent synchronously. Enquiries **are stored** (D6), so a failed email leaves a `FAILED` row instead of a lost lead; automatic retries through a queue (e.g. SQS) are the next step.
- The customer gets no confirmation email.
- No privacy or consent notice for personal data: out of scope, but note it.
- The sales inbox address is configuration.

**Done when:** a valid submission shows "Thank you" and exactly one email with the product and contact details arrives in Mailpit; invalid input shows field errors and sends nothing; and an email failure shows an error instead of "Thank you".

### Phase 4: Tests

Rules: no real network calls (use the in-memory adapter or the recorded Fake Store response behind a fake `fetch`); every AC has at least one automated test; tests check behaviour, not implementation details; one command runs everything.

| ID | Level | What it proves | AC | Priority |
|---|---|---|---|---|
| T1 | Unit (server) | The Fake Store adapter maps to the domain model (ids, slugs, names); empty body means not found; non-2xx or timeout raises `UpstreamError` | all | P0 |
| T2 | API (Supertest + in-memory source) | `/api/featured-products` returns exactly the configured 5, in order; a missing id is handled as you assumed | F1 | P0 |
| T3 | Unit + API | The category split contains only that category, follows D3 including the fallback, and has no duplicates; an unknown slug returns 404 | F2 | P0 |
| T4 | Unit + API | Search is case-insensitive and trimmed, covers the agreed fields, returns **no non-matching products**, and rejects a blank or too-long `q` with 400 | F3 | P0 |
| T5 | API | Product by id returns 200 or 404 | F4 | P0 |
| T6 | Unit + API (fake `EmailSender`) | Enquiry validation (required fields, email format, lengths, CR/LF); the product is looked up on the server; exactly one email goes to `SALES_INBOX_EMAIL` with the expected content; the enquiry is stored and marked `SENT` or `FAILED`; an email failure returns 502; a database failure returns 502 and sends nothing | F5 | P0 |
| T7 | Component (RTL + MSW) | Home shows 5 tiles; the category page shows both sections; searching shows only matching tiles, or the empty state; clicking a tile opens the details page | F1–F4 | P1 |
| T8 | Component (RTL + MSW) | The enquiry form shows field errors; a successful submit shows "Thank you"; a server error shows a message and keeps the entered data | F5 | P1 |
| T9 | Contract | One shared test suite runs against every `ProductSource` adapter | swap safety | P2 |
| T10 | E2E (Playwright) | The happy path through all 5 ACs on Docker Compose, checking the Mailpit API for the email | all | P2 |

- [ ] **4.1** Add an AC-to-test mapping table to the README or PR description. (P1)
- [ ] **4.2** Check the AI-written tests by breaking the code on purpose (e.g. make search return every product) and confirming a test fails. Log what you find in the AI log. (P1)

### Phase 5: Local run and packaging

- [ ] **5.1** `server/Dockerfile`: multi-stage build, production dependencies only, runs as a non-root user. (P0)
- [ ] **5.2** `client/Dockerfile`: build the static assets and serve them with nginx, which proxies `/api` to the server (same origin, so no CORS needed). (P0)
- [ ] **5.3** `docker-compose.yml` with `client` (:8080), `server` (:3000), `mailpit` (SMTP :1025, UI :8025) and `postgres` (slice F5; the server runs `prisma migrate deploy` before starting), plus a healthcheck on `/api/health`. Give every variable a `${VAR:-default}` fallback so `docker compose up --build` works without a `.env` file; otherwise make `cp .env.example .env` the documented first step. (P0)
- [ ] **5.4** `.env.example` lists every key with safe local defaults; `.env` is git-ignored. (P0)
- [ ] **5.5** Document a non-Docker path: `npm ci` and `npm run dev` per package, with `EMAIL_PROVIDER=console` and `ENQUIRY_STORE=memory`, so neither Mailpit nor Postgres is needed. (P1)
- [ ] **5.6** Fresh-clone test: clone into a new folder, follow the README word for word, and time it. It must take under 10 minutes and at most 2 commands. Write down anything you had to do that the README doesn't say. (P0)
- [ ] **5.7** CI (e.g. GitHub Actions) running lint, typecheck and tests on the PR. (P2)

### Phase 6: Documentation deliverables

- [ ] **6.1** `README.md` (brief, item 4; C1, C4, C5). (P0) Include:
  - what it is (one paragraph) and a screenshot;
  - **Stack and why** (C1);
  - prerequisites: Docker with Compose v2, or Node LTS;
  - quick start in at most 2 commands, with the URLs: app http://localhost:8080, API http://localhost:3000/api/health, sales inbox http://localhost:8025;
  - configuration: every env var, and how to change the featured products, the sales inbox, the product source and the email provider;
  - how to run the tests, and the AC-to-test table (4.1);
  - a manual click path to check each AC;
  - an architecture overview and the project structure;
  - troubleshooting: ports in use; Fake Store down (pages show an error with a retry; there is no offline mode by design);
  - links to `DECISIONS.md` and `AI_USAGE.md`, and the time spent (6.4).
- [ ] **6.2** `DECISIONS.md`, or a README section (brief, item 5), with these four sections: (P0)
  1. **Assumptions** where the ACs were unclear: every "Gaps" item from F1–F5, plus D2–D5.
  2. **Requirements dropped or simplified, and why** (see section 7).
  3. **How the design supports growth beyond the PoC.** Cover all three changes named in the brief: the product data source (`ProductSource` port and adapters), look and feel (theme tokens, presentational components), and the email provider (`EmailSender` port; SMTP to SES or another provider by config or adapter).
  4. **What I'd do next with another day.**
- [ ] **6.3** `AI_USAGE.md` (brief, item 6), with these five sections: (P0)
  1. Tools and models used.
  2. Agent instruction files, committed to the repo (link to `AGENTS.md`, `CLAUDE.md` or `.cursor/rules`).
  3. Your plan or spec (link to this file).
  4. 3–5 key prompts or moments that shaped the solution.
  5. Where the AI got something wrong and how you caught it. Use real entries from your AI log (0.2).
- [ ] **6.4** Time spent (brief, item 7): the actual total, roughly split into planning, building, testing and reviewing. Say honestly if you went over the 2–3 hours. Put it in the README and the PR description. (P0)
- [ ] **6.5** Review every AI-written document: the commands work and every claim matches the code. (P0)

### Phase 7: Pull request and submission

- [ ] **7.1** Review the full diff yourself, because you own every line. Remove dead code, unused dependencies and debug logging; make naming consistent; run lint, typecheck and tests. (P0)
- [ ] **7.2** Run the AI output review checklist below. (P1)
- [ ] **7.3** Push the feature branch and open a PR into `main` in your own repo. **Leave it open** (brief). (P0)
- [ ] **7.4** Write the PR description, which is assessed (brief). Include: summary; how to run; the AC checklist with links to tests; key decisions and trade-offs (link `DECISIONS.md`); what was dropped or simplified; testing done; screenshots; known limitations and next steps; an AI usage summary (link `AI_USAGE.md`); time spent. (P0)
- [ ] **7.5** For a private repo, give access to the reviewers named in the email (brief). (P0)
- [ ] **7.6** Reply to the email with the repository link (and the PR link) **within 3 days of receiving it** (brief). (P0)

**AI output review checklist**

- [ ] The client contains no Fake Store URL or call (C2).
- [ ] No secrets, tokens or real email addresses are committed; `.env` is ignored (C5).
- [ ] Every endpoint validates its input on the server. User input never reaches a regex, HTML or an email header unescaped.
- [ ] The Fake Store adapter matches section 3. AI tools often assume a search endpoint exists, or that an unknown id returns 404; neither is true.
- [ ] Upstream down or timing out, an unknown id or slug, and an email failure are each handled and tested.
- [ ] Tests fail when behaviour breaks (4.2), and none of them only asserts that a mock was called.
- [ ] Every dependency is justified, with no unnecessary frameworks. There are no features beyond the ACs.
- [ ] The README commands work when pasted into a fresh terminal.

### Phase 8: Follow-up interview prep (45 minutes: walkthrough plus a small live change)

- [ ] **8.1** Be able to explain every file and every decision, including those the AI made.
- [ ] **8.2** Rehearse likely small changes. (P1)
  - Change the featured products.
  - Add a field to the enquiry form, end to end.
  - Add a second product source behind `ProductSource` and run the contract suite against it.
  - Change the theme colours.
  - Add an email provider adapter.
- [ ] **8.3** Keep the dev loop fast: one command to run the app, one to run the tests.

## 7. Out of scope for the PoC (record as dropped or simplified)

| Item | Why it is out or simplified |
|---|---|
| Admin UI to choose the "top rated" products | Config is enough to prove the flow; the `FeaturedProducts` port allows a CMS or admin UI later |
| Accounts, auth, cart, checkout, multi-product enquiries | Not in the ACs |
| Storing products in a database | Fake Store is the single source of truth; a copy would need a sync job (D6) |
| Automatic retry of failed emails (queue) | Failed enquiries are stored as `FAILED`; a retry worker or SQS is the next step |
| Confirmation email to the customer | Not in the ACs |
| Pagination, sorting, filters | 20 products in total; the API shape allows adding them |
| Final visual design and branding | Creative work is in progress; theme tokens make the styling replaceable |
| Cloud deployment and IaC | Optional in the brief; the Docker images are AWS-ready (ECS/Fargate) |
| i18n, analytics, SEO | Not needed for the PoC |

## 8. Suggested time budget (about 3 hours)

| Activity | Time |
|---|---|
| Planning: brief, decisions, `AGENTS.md`, repo setup | 20 min |
| Backend foundation and endpoints (F1–F5) | 50 min |
| Client foundation and pages (F1–F5) | 50 min |
| Tests (written alongside, then gaps filled) | 30 min |
| Docker Compose and the fresh-clone check | 10 min |
| README, `DECISIONS.md`, `AI_USAGE.md`, PR, self-review | 20 min |

Going over is fine if you report it honestly (brief).

## 9. Final submission checklist

- [ ] The repo is on GitHub, GitLab or Bitbucket and the reviewers can access it (brief, item 1).
- [ ] The work is on a feature branch, with an open PR into `main` and a full description (brief, item 2).
- [ ] The full source, including tests, is committed (brief, item 3).
- [ ] The README covers setup, running and configuration, and states the stack and why (brief, item 4; C1).
- [ ] `DECISIONS.md` has all four sections (brief, item 5).
- [ ] `AI_USAGE.md` has all five sections, and the agent instruction file is committed (brief, item 6).
- [ ] The actual time spent is reported, with the split (brief, item 7).
- [ ] All 5 ACs work end to end and each has tests.
- [ ] The client never calls Fake Store (C2), and any infrastructure is AWS-compatible (C3).
- [ ] A fresh clone runs in under 10 minutes with at most 2 commands (C4).
- [ ] No secrets are committed and `.env.example` exists (C5); no paid services or accounts are needed (C6).
- [ ] The reply with the repository link went out within 3 days.

## 10. Selection criteria and where each is addressed

| Area (brief) | What the reviewers look for | Covered by |
|---|---|---|
| Solution design | A structure that can grow beyond the PoC, with clear boundaries between frontend, backend and product data source | Section 5; tasks 1.3–1.10, 2.2, 2.6 |
| Decision-making and assumptions | Sensible assumptions where the criteria are unclear, clear trade-offs, justified cuts | Section 4; the gaps in F1–F5; section 7; task 6.2 |
| Implementation quality | Readable, consistent code with sensible error handling, validation and security basics | Tasks 1.2, 1.5, 1.10, 1.11, 2.5, 7.1 |
| Testing | Tests that cover the critical path and give confidence to change the code | Phase 4 |
| AI engineering practice | Effective direction of AI tools, critical review of their output, ownership of the result | Tasks 0.2, 0.6, 0.7, 4.2, 6.3, 7.2; Phase 8 |
