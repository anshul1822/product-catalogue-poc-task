# Slice 00: Data layer (`setup/data-layer`)

**Status:** done. Built and tested (92 tests); committed as `948ee7d` and merged into `feature/product-catalogue-poc` by PR #1 (merge commit `d02988e`).

**Goal:** a tested data layer that the backend services can query without knowing where products come from.

**Covers:** `TASKS.md` tasks 1.1, 1.3, 1.4, 1.5, 1.7, tests T1 and T9, decision D2 (featured products in config) and section 3 (Fake Store facts).

**Out of scope here:** HTTP routes, services, email, env parsing, Docker (slice 01), and the database (slice F5).

## Products come from Fake Store only

- **Fake Store is the single source of truth for products.** There is no database copy and no local file copy: either would duplicate the data, need syncing, and could disagree with the source.
- **The featured products are 5 ids in configuration** (`FEATURED_PRODUCT_IDS`), a business choice that needs no table.
- **The only data the app owns is the enquiry.** PostgreSQL + Prisma arrive with slice F5, for enquiries only (see `02-features.md`).
- **If Fake Store is down, the app says so:** the adapter throws `UpstreamError`, the API returns 502, the page shows an error with a retry. This is a known limitation of the PoC, not something to hide with stale data.
- **Tests never call Fake Store.** They replay a recorded response (`src/test-support/fakestore-products.json`) through a fake `fetch`. The running app never reads that file.

## Design

```text
services (slice 01 onwards)
   | depend on
   v
ports/ProductSource                 ports/FeaturedProducts
   ^                ^                     ^
   |                |                     |
adapters/           adapters/             adapters/
fakestore/          in-memory/            featured-config/
(HTTP, runtime)     (tests only)          (FEATURED_PRODUCT_IDS)
   |                |
   +-- both reuse domain/catalogue-queries.ts and domain/search.ts
```

### Domain model (`src/domain/product.ts`)

```ts
Category { slug: string; name: string }            // slug is URL-safe, name is for display
Rating   { rate: number; count: number }
Product  { id: string; title: string; description: string; price: number;
           imageUrl: string; category: Category; rating: Rating | null }
```

- `id` is a string, so a future source (UUIDs, SKUs) does not change the type.
- `price` is a plain number; the currency (AUD) is an assumption recorded in `PROGRESS.md`.

### `ProductSource` port (`src/ports/product-source.ts`)

| Method | Returns | Not found |
|---|---|---|
| `getAll()` | `Product[]` | `[]` |
| `getById(id)` | `Product \| null` | `null` |
| `getByIds(ids)` | `Product[]` in the order of `ids` | unknown ids are omitted |
| `getCategories()` | `Category[]` | `[]` |
| `getByCategory(slug)` | `Product[] \| null` | `null` for an unknown slug |
| `search(term)` | `Product[]` | `[]` |

Failures of the source (network, timeout, non-2xx, invalid data) throw `UpstreamError`.

### Rules that live in the domain (shared by every adapter)

- **Category slug and name.** Source category `men's clothing` becomes `{ slug: "mens-clothing", name: "Men's Clothing" }`. Fake Store's misspelt `jewelery` is shown as `Jewellery` (slug `jewellery`); the override lives in the Fake Store mapper.
- **Search** (`matchesSearch`): case-insensitive; apostrophes ignored (`mens` matches `Men's`); the term is split on whitespace and **every word must appear** in the title, description or category name; a blank term matches nothing; plain substring checks only, never a regex built from input.
- **Categories** are derived from the products, in first-seen order, so a category with no products cannot exist.

### Fake Store adapter (`src/adapters/fakestore/`)

- `schema.ts` validates the upstream payload with zod; `mapper.ts` converts it to the domain model. The Fake Store shape does not leave this folder.
- `GET /products` serves lists, categories and search (one upstream call; Fake Store has no search endpoint). `GET /products/{id}` serves a single product.
- A non-numeric id returns `null` without calling upstream (no path injection).
- **HTTP 200 with an empty body means not found** (checked on the live API).
- Timeout via `AbortSignal.timeout(timeoutMs)`. Non-2xx, network errors, invalid JSON and schema mismatches all throw `UpstreamError`.
- `fetch` is injected, so tests never touch the network.

### In-memory source (`src/adapters/in-memory/`)

- A `ProductSource` over a fixed list of domain products. Used by service and HTTP tests in later slices.
- It also runs the shared contract suite, which shows the port does not depend on Fake Store: a future source (a PIM, an owned product database) has to pass the same suite.

### Featured products (`src/adapters/featured-config/`)

- `parseFeaturedIds("12,11,3,18,5")` trims, and rejects blanks, duplicates, invalid characters and any count other than 5 (the AC says 5), throwing `ConfigError`.
- `ConfigFeaturedProducts` implements the `FeaturedProducts` port. A CMS or a table can replace it later.

### Test fixture

| File | Contents | Read by |
|---|---|---|
| `server/src/test-support/fakestore-products.json` | The raw Fake Store `GET /products` response (20 products), recorded on 2026-11-23 | Tests only: `fakeStoreServer()` replays it through a fake `fetch`; `snapshotProducts()` maps it for the in-memory source |

`npm run snapshot` (`scripts/snapshot-catalogue.ts`) re-records it from the live API, after validating it through the real adapter. Re-run the tests afterwards: exact expectations (ids, counts) may need updating if Fake Store's data has changed.

## Tasks

- [x] **DB-1** Scaffold `server/`: `package.json` (ESM), `tsconfig.json` (strict, `NodeNext`), `tsconfig.build.json`, scripts `test`, `typecheck`, `build`, `snapshot`. Dev deps: `typescript`, `vitest`, `@types/node`. Runtime dep: `zod`.
- [x] **DB-2** Domain types and errors: `Product`, `Category`, `Rating`, `UpstreamError`, `ConfigError`.
- [x] **DB-3** Ports: `ProductSource`, `FeaturedProducts`.
- [x] **DB-4** Domain rules: `toCategory`/`slugify`, `matchesSearch`, `catalogue-queries` (derive categories, filter by category, search, pick by ids).
- [x] **DB-5** Fake Store adapter: schema, mapper, HTTP client with timeout and error mapping.
- [x] **DB-6** Snapshot script and the recorded test fixture.
- [x] **DB-7** In-memory source for tests. (A local JSON catalogue source was built first, then removed: it was a second copy of the products, D-15.)
- [x] **DB-8** Featured-products config adapter and `parseFeaturedIds`.
- [x] **DB-9** No source factory: with one runtime source, the composition root (slice 01) constructs `FakeStoreProductSource` directly. A factory and a `PRODUCT_SOURCE` setting come back only when a second real source exists.
- [x] **DB-10** Tests: unit tests per module, a shared **contract suite** run against the Fake Store adapter (fake fetch) and the in-memory source, adapter failure cases (empty body, non-2xx, network error, invalid JSON, invalid shape, timeout).
- [x] **DB-11** `.env.example` with the data-layer keys; root `.gitignore`.

## Definition of done

- [x] `npm run typecheck` passes with no errors.
- [x] `npm test` passes, with no network access needed.
- [x] The contract suite passes for both the `fakestore` (fake fetch) and `in-memory` sources.
- [x] Searching `jacket` returns only products 3, 15, 16, 17; category `jewellery` returns 5, 6, 7, 8; `getById("999")` returns `null`.
- [x] Breaking `matchesSearch` (e.g. always `true`) makes tests fail (8 of 92).
- [x] `PROGRESS.md` updated.

## Hand-over to slice 01

Later slices import only:

- `ProductSource`, `FeaturedProducts` (ports) and the domain types;
- `new FakeStoreProductSource({ baseUrl, timeoutMs })`, `parseFeaturedIds` and `ConfigFeaturedProducts` in the composition root;
- `UpstreamError` / `ConfigError` for error mapping;
- in tests: `InMemoryProductSource`, `snapshotProducts()`, `fakeStoreServer()`, `makeProduct()` from `src/test-support/fixtures.ts`.
