# Feature slices: one branch per acceptance criterion (AC)

Build order: **F1 home → F4 product → F2 category → F3 search → F5 enquiry.** F4 comes second because every product tile links to the product page.

For every slice:

1. Branch from `feature/product-catalogue-poc` after the previous slice is merged.
2. Build **backend → frontend → tests**, then check the AC by hand.
3. Update `PROGRESS.md` and `PR_DESCRIPTION.md`, push the slice branch, merge with `--no-ff` (see `03-pull-request.md`).

Endpoints and response shapes are in `TASKS.md` section 5. The "Gaps" for each AC are in `TASKS.md` Phase 3; the rules below are the decisions taken for them. Record any change in `PROGRESS.md`.

---

## F1. Home page (`slice/feature-home`)

> GIVEN I have chosen 5 products to be "top rated" / WHEN I am viewing the home page / THEN I see those 5 featured products

**Status:** done. Commits `4957f5f` (server) and `b7c68d4` (client), merged by PR #3 (merge commit `79c6cbf`).

**Backend**
- [x] **F1-1** `CatalogueService.getFeatured()` (`server/src/services/catalogue-service.ts`): ids from `FeaturedProducts`, products from `ProductSource.getByIds`, in configured order. A configured id that no longer exists is skipped and logged as a warning; the page still renders. `main.ts` now wires `FakeStoreProductSource`, `ConfigFeaturedProducts` and the service.
- [x] **F1-2** `GET /api/featured-products` -> 200 `Product[]` (`server/src/http/routes/featured-products.ts`); a Fake Store failure -> 502 through `errorHandler`.

**Frontend**
- [x] **F1-3** `HomePage` at `/`: h1 "Top rated products" and a labelled grid of the featured tiles; loading, error (with "Try again") and empty states. Data loads through `getFeaturedProducts()` (`client/src/api/catalogue.ts`) and the `useApiData(key, load)` hook (`client/src/api/useApiData.ts`), which cancels a request when the page is left or the key changes.

**Database:** none (the 5 ids are configuration).

**Tests:** server 10 new (service: order, a second order, missing id skipped and logged, none found, upstream failure; API: exact ids in order, API model not Fake Store shape, missing id still 200, end to end through the real Fake Store adapter over a fake `fetch`, 502 error shape). Client 12 new (home page: 5 tiles in order with accessible names, loading, 502 with retry, network error, empty; `useApiData`: success, ApiError kept, other errors made generic, cancel on unmount, key change cancels and ignores the stale answer, no reload on new function identity, retry).

**Done when:** with `FEATURED_PRODUCT_IDS=12,11,3,18,5` the home page shows exactly those 5 products, in that order.
- [x] Checked live through Docker Compose against the real Fake Store: the API returns 12, 11, 3, 18, 5 (about 0.7 s); headless Edge renders 5 tiles in that order with their images. With Fake Store unreachable, the API returns 502 and the page shows the error with "Try again".

---

## F4. Product page (`slice/feature-product`)

> GIVEN I am browsing the products / AND I want to see more details about a specific product / WHEN I click on a product tile / THEN I see the product details page

**Status:** done. Commits `e6175e5` (server) and `f2dffde` (client), merged by PR #4 (merge commit `82965b8`).

**Backend**
- [x] **F4-1** `CatalogueService.getProduct(id)`; `GET /api/products/:id` (`server/src/http/routes/products.ts`) -> 200 `Product`, 404 `PRODUCT_NOT_FOUND` for an unknown id or one that breaks the product-id rule, 502 if Fake Store fails. The product-id rule (letters, digits, `_`, `-`, 1 to 64 characters) moved into the domain as `isValidProductId` and is shared with the featured-products config; an impossible id never reaches the product source.

**Frontend**
- [x] **F4-2** `ProductPage` at `/products/:id`: image (alt = title), category name (plain text until F2 adds category pages), h1 title, price, rating ("Rated 4.7 out of 5 (500 ratings)" or "No ratings yet"), description. A 404 shows "Product not found" with a link home; any other failure shows the error with "Try again". `getProduct(id)` in `client/src/api/catalogue.ts` encodes the id. Deep links and refresh work (nginx serves the app for `/products/...`).

**Database:** none.

**Tests:** server 31 new (`isValidProductId` accepts and rejects; service: found, unknown, impossible ids without asking the source, upstream failure; API: API model, 404 shape, impossible ids without calling Fake Store, end to end through the Fake Store adapter including the empty-body 404, 502). Client 7 new (all details, no ratings, loading, "Product not found" and its link home, id encoding, error with retry, and the AC itself: clicking a home-page tile opens that product's page).

**Done when:** clicking any home-page tile opens that product's page, and `/products/999` shows not-found.
- [x] Checked live through Docker Compose against the real Fake Store: `/api/products/3` 200, `/999` and `/abc` 404; headless Edge renders `/products/3` and `/products/18` with title, price and rating, and `/products/999` as "Product not found". Encoded path traversal is harmless at both layers: nginx resolves `..` before routing (anything above the web root is 400), and the API answers 404 without calling Fake Store.

---

## F2. Category page (`slice/feature-category`)

> GIVEN my products are organised into categories / WHEN I click on a category link / THEN I see top rated products for that category / AND I see additional products in that category

**Status:** done. Commits `89b6a65` (domain rules), `c2a22c8` (service and routes) and `76667be` (client), merged by PR #5 (merge commit `03e6992`).

**Backend**
- [x] **F2-1** `CatalogueService.getCategories()`; `GET /api/categories` -> `{ slug, name }[]` (`server/src/http/routes/categories.ts`).
- [x] **F2-2** `CatalogueService.getCategoryPage(slug)`; `GET /api/categories/:slug/products` -> `{ category, topRated, others }`; 404 `CATEGORY_NOT_FOUND` for an unknown slug or one that breaks the slug rule (`isValidCategorySlug`, checked before any upstream call); 502 if Fake Store fails. The split is the pure function `splitCategoryPage` in `server/src/domain/category-page.ts`:
  - `topRated` = the featured products in that category, in configured order. If none are featured, the top 3 by `rating.rate` (ties: higher `rating.count`, then source order); unrated products are never picked by the fallback.
  - `others` = the rest of the category, source order, never repeating a `topRated` product.
  - With the default `FEATURED_PRODUCT_IDS=12,11,3,18,5`: electronics 12, 11 | 9, 10, 13, 14; jewellery 5 | 6, 7, 8; men's clothing 3 | 1, 2, 4; women's clothing 18 | 15, 16, 17, 19, 20.

**Frontend**
- [x] **F2-3** `CategoryNav` in the header: a "Categories" navigation with one link per category from `/api/categories`; the current category has `aria-current="page"`. While loading or if the request fails, the header shows no links and no error (the page below has its own states).
- [x] **F2-4** `CategoryPage` at `/categories/:slug`: h1 the category name, then "Top rated in {name}" and "More in {name}" (h2 + labelled grid each); an empty section is hidden; a 404 shows "Category not found" with a link home; other failures show the error with "Try again".
- [x] **F2-5** The category on `ProductPage` is now a link to its category page.

**Database:** none.

**Tests:** server 47 new (slug rule accepts and rejects; `splitCategoryPage`: featured in configured order, other categories ignored, fallback with the 4.8 tie broken by count, full tie by source order, unrated never picked, every product in exactly one section for every category and featured set; service; API: all 4 categories with the exact split, only that category and no duplicates, fallback, end to end through the Fake Store adapter, 404 for unknown and impossible slugs without calling Fake Store, 502). Client 10 new (header links and order, current-page marking, no links and no error when categories fail; category page sections, empty section hidden, loading, "Category not found", error with retry; the AC: clicking a header category link opens that category page; the product page's category link). The MSW test server now answers `/api/categories` by default, because the header asks for it on every page.

**Done when:** each of the 4 header links shows that category's top-rated section and the rest of its products, nothing from other categories, no product twice.
- [x] Checked live through Docker Compose against the real Fake Store: the four categories and their splits match the list above; `toys` and `Electronics` 404. Headless Edge renders `/categories/electronics` and `/categories/jewellery` with both sections and the current header link marked, `/categories/toys` as "Category not found", and the product page's category as a link to `/categories/mens-clothing`.

---

## F3. Search (`slice/feature-search`)

> GIVEN I am looking for a specific product / AND I have entered a search term in the search bar / WHEN I click the search button / THEN I only see products that have text matching that search term

**Status:** done. Commits `77b2248` (server) and `0c1dcf6` (client), merged by PR #6 (merge commit `22e2daf`).

**Backend**
- [x] **F3-1** `CatalogueService.search(term)` (trims; blank returns `[]` without asking the source); `GET /api/search?q=` (`server/src/http/routes/search.ts`) -> 200 `Product[]` in source order, `[]` when nothing matches. `q` is validated with zod: exactly one `q`, 1 to `MAX_SEARCH_TERM_LENGTH` (100) characters once trimmed, else 400 `INVALID_SEARCH_TERM` with `details: { field: 'q' }` ("Enter a search term." / "Use at most 100 characters."), never reaching Fake Store. Matching is the data layer's `matchesSearch` (every word, any order, in title, description or category name; case and apostrophes ignored; plain substring, never a regex). 502 if Fake Store fails.

**Frontend**
- [x] **F3-2** `SearchForm` in the header: a `role="search"` form with a labelled search box ("Search products", `maxlength=100`) and a **Search** button, so the button and Enter both submit. It trims the term and goes to `/search?q=term` (URL-encoded); a blank or whitespace-only term does nothing and keeps focus in the box. On the results page the box shows the current term; it clears when leaving search.
- [x] **F3-3** `SearchPage` at `/search?q=term`: h1 "Search results for “term”", "N products match" (announced as a status), the matching tiles; "No products match “term”. Try a different word." when nothing matches; with no term, "Enter a search term in the search bar to find products." and no request. A 400 shows the API message without a retry; other failures show the error with "Try again".

**Database:** none.

**Tests:** server 27 new (service: matches only, trim and case, blank without asking the source, upstream failure; API: "jacket", case, spaces, word order, apostrophes, "SSD"; every result matches and none is missed for five terms; no match is `[]`; regex and markup characters are plain text; "%" matches literally; 100 characters accepted; missing, empty, blank, over-100 and repeated `q` are 400 without calling Fake Store; end to end through the Fake Store adapter; 502). Client 18 new (search form: Search button, Enter, trim and encoding, blank does nothing, `maxlength`, term shown and cleared; results page: only matching tiles and the count, "1 product matches", empty state, loading, no-term prompt without a request, 400 without retry, 502 with retry; the AC: typing a term in the header and clicking Search shows only matching products; a new search replaces the results).

**Done when:** "jacket" shows products 3, 15, 16 and 17 only; a nonsense term shows the empty state; a blank search does nothing.
- [x] Checked live through Docker Compose against the real Fake Store: `jacket` 3, 15, 16, 17; `cotton jacket` 3, 16, 17; `SSD` 10, 11; a nonsense term `[]`; missing, blank, over-100 and repeated `q` 400. Headless Edge renders `/search?q=jacket` with "4 products match" and those four tiles, the search box showing "jacket"; the nonsense term shows the empty state; `/search` shows the prompt.

---

## F5. Enquiry (`slice/feature-enquiry`): the only slice with a database

> GIVEN I am viewing a product / AND I am interested in a product / AND I click on the Enquire button / AND I complete the subsequent form with my contact details / WHEN I submit the form / THEN the sales inbox will receive an email / AND the customer will see a "Thank you" message

**Status:** built and verified. Code committed and pushed (`0e3ff6e`, `6f4fca8`, `d578472`); the project docs commit is still outstanding and must land on this branch before PR #7.

### Why the database lives here and nowhere else

- The enquiry is the **only data the business owns**. Products stay in Fake Store (single source of truth), featured ids stay in config.
- Storing each enquiry means a failed email no longer loses the lead: sales can find it with status `FAILED`.
- The table stores a **snapshot** of the product's id, title and price at the time of the enquiry, with no foreign key to a products table (there is none), so there is still no copy of the catalogue.

### Flow (`EnquiryService.submit`, `server/src/services/enquiry-service.ts`)

1. Validate the body (`parseEnquiry`, zod, `server/src/domain/enquiry.ts`): `productId` (product-id rule), `name` (required, 1–100), `email` (required, valid, max 254), `phone` (optional; digits, spaces and `+ ( ) - .`, at least 6 digits, max 30), `message` (optional, max 2000, line breaks allowed), `website` (honeypot). Every field is trimmed; blank optional fields become `null`; unknown fields are ignored. **Name, email and phone reject every control character, CR and LF included**, so nothing can add an email header. Errors -> 400 `VALIDATION_FAILED` with `details.fields` (one message per field), nothing saved or sent.
2. Honeypot filled -> 201 `{ status: "received" }` like a success, nothing saved or sent.
3. Look up the product on the server (the client's title or price is never used): unknown -> 404 `PRODUCT_NOT_FOUND`; Fake Store down -> 502, nothing saved.
4. Save the enquiry as `PENDING` with the product snapshot. Store down -> `UpstreamError` -> 502 and **no email**, so every email sent has a record.
5. Build the email (`buildEnquiryEmail`, `server/src/domain/enquiry-email.ts`): to `SALES_INBOX_EMAIL`, from `EMAIL_FROM`, Reply-To the customer, subject `New enquiry: {title} (#{id})` (title from the product source, control characters removed, max 120 characters), **plain text only**: product, price, id, link, the customer's details, the message, received time and enquiry id.
6. Send through `EmailSender`. Sent -> mark `SENT` with `sent_at`, 201. Failed -> mark `FAILED` with a short reason (e.g. `[smtp] sending failed: ETIMEDOUT`), 502; the customer sees an error and keeps what they typed. If the email went out but marking it `SENT` fails, the customer still gets 201 (a retry would send a duplicate) and the error is logged.
7. Logs carry the enquiry id and status only, never the customer's details.

### Database (PostgreSQL 16 + Prisma 7.10.1)

- [x] **F5-1** Packages approved and pinned: runtime `@prisma/client` 7.10.1, `@prisma/adapter-pg` 7.10.1 (brings `pg` 8), `nodemailer` 10.6.1, `express-rate-limit` 8.7.5; dev `prisma` 7.10.1 (npm `latest` is `8.0.0-rc.35`, a release candidate), `@types/nodemailer` 8.0.2.
- [x] **F5-2** `server/prisma.config.ts` (schema and migrations paths, `DATABASE_URL` with a placeholder so `prisma generate` needs no database); `server/prisma/schema.prisma` with the `prisma-client` generator (ESM, `.js` import extensions) writing to `server/src/generated/prisma/` (git-ignored, produced by `postinstall: prisma generate`); the `PrismaPg` driver adapter at runtime.
- [x] **F5-3** The `Enquiry` model (`enquiries` table): uuid id, `product_id` varchar(64), `product_title`, `product_price` decimal(10,2), `customer_name` varchar(100), `customer_email` varchar(254), `customer_phone` varchar(30) null, `message` varchar(2000) null, `status` enum PENDING/SENT/FAILED, `failure_reason` varchar(500) null, `created_at` and `sent_at` timestamptz; index on (status, created_at). First migration `20261124000000_create_enquiries`, generated with `prisma migrate diff --from-empty` and committed.
- [x] **F5-4** `EnquiryRepository` port (`create`, `markSent`, `markFailed`) with `adapters/enquiry-postgres/` (Prisma; every error becomes `UpstreamError` with a PII-free reason; Prisma types stay in the folder) and `adapters/enquiry-memory/` (tests and runs without Docker). Chosen by `ENQUIRY_STORE=postgres|memory`; `memory` is refused when `NODE_ENV=production`.
- [x] **F5-5** Docker Compose: `postgres:16-alpine` with a `pg_isready` healthcheck and the named volume `postgres-data`; a one-off `migrate` service (the server image's build stage, `prisma migrate deploy`) that the server waits for (`service_completed_successfully`); host port `${POSTGRES_PORT:-55432}`.

### Email

- [x] **F5-6** `EmailSender` port; `adapters/email-smtp/` (Nodemailer; 5 s connect and greeting, 10 s socket timeouts; optional login for a real provider) and `adapters/email-console/` (prints the email; refused when `NODE_ENV=production` because it logs personal data). Chosen by `EMAIL_PROVIDER=smtp|console`.
- [x] **F5-7** Mailpit `axllent/mailpit:v1.29` in Docker Compose: SMTP :1025 on the Compose network, inbox UI http://localhost:8025 (`MAILPIT_PORT`).

### Backend

- [x] **F5-8** `POST /api/enquiries` (`server/src/http/routes/enquiries.ts`) with a rate limit of 10 per client per 15 minutes (429 `TOO_MANY_REQUESTS`, `RateLimit` and `Retry-After` headers); only this route is limited. `trust proxy` is set to loopback and private networks, so the client address forwarded by nginx is the one counted.
- [x] **F5-9** No PII in logs: `Enquiry {id} sent`, `Enquiry {id} saved as FAILED: {reason}`.

### Frontend

- [x] **F5-10** **Enquire** on `ProductPage` (a link styled as the main action) -> `/products/:id/enquire`.
- [x] **F5-11** `EnquirePage`: names the product; fields "Your name", "Email address", "Phone (optional)", "Message (optional)" and a hidden honeypot (off screen, `aria-hidden`, `tabindex=-1`). Client validation mirrors the server (`client/src/api/enquiries.ts`); errors are linked with `aria-describedby`, the first invalid field gets focus, and an error clears when its field is edited. The server's 400 field errors are shown the same way. While sending, the button reads "Sending…" and is disabled. On 201 the form is replaced by **"Thank you"** (focused) and "Your enquiry about {product} has been sent. Our sales team will reply to {email}." On any other failure an alert explains, and everything typed stays in the form; 429 and network errors show the API's message.

### Env keys added in this slice

Local defaults (no Docker) keep enquiries in memory and print emails; Docker Compose always sets PostgreSQL and Mailpit.

| Key | Local default | Docker Compose | Purpose |
|---|---|---|---|
| `ENQUIRY_STORE` | `memory` | `postgres` | Enquiry store |
| `DATABASE_URL` | empty | `postgresql://catalogue:catalogue@postgres:5432/catalogue` | Required for `postgres` |
| `EMAIL_PROVIDER` | `console` | `smtp` | Email provider |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | `localhost`, `1025`, `false` | `mailpit`, `1025`, `false` | SMTP server |
| `SMTP_USER`, `SMTP_PASS` | empty | empty | Only for a real provider; never committed |
| `EMAIL_FROM`, `SALES_INBOX_EMAIL` | `no-reply@catalogue.local`, `sales@catalogue.local` | same | Sender and sales inbox |
| `PUBLIC_APP_URL` | `http://localhost:8080` | same | Product link in the email |
| `MAILPIT_PORT`, `POSTGRES_PORT` | `8025`, `55432` | | Host ports (Compose only) |

### Tests

- Server 84 new (317 passing, 4 skipped):
  - `parseEnquiry` (32): each rule; CR/LF in name and email; phone format; trimming; blank optional fields; unknown fields ignored; not an object; honeypot.
  - `buildEnquiryEmail` (7): recipients and Reply-To; body content; missing phone and message; markup kept as plain text; one-line subject; long titles; encoded link.
  - `EnquiryService` (9): sent and SENT; product details from the source, not the client; invalid; honeypot; unknown product; email failure -> FAILED; store failure -> no email; marking SENT fails -> still sent; no PII logged.
  - `POST /api/enquiries` (12): 201; 400 with fields; header injection; JSON array; bare string -> `INVALID_JSON`; honeypot; 404; 502 from email and from Fake Store; 429 with `Retry-After`; per-client limit through `X-Forwarded-For`; other routes not limited.
  - Config (new keys, production refuses `memory` and `console`), memory repository (4), SMTP sender (4, including a real Nodemailer connection to a closed port), console sender (1), Postgres connection failure (1).
- Postgres repository (4) runs against a real database only when `TEST_DATABASE_URL` is set: create and read back, SENT and FAILED in the table, exact decimal price, database error -> `UpstreamError`. Passed against the Compose database; it cleans up its rows.
- Client 23 new (93 passing): the AC (Enquire on the product page -> form -> "Thank you"); the request body; client field errors and focus; error cleared on edit; server field errors; failure keeps the input and retry works; 429 message; double click sends once; honeypot hidden; unknown product; `validateEnquiry` and `fieldErrorsOf`.

**Done when:** a valid submission shows "Thank you"; exactly one email arrives in Mailpit; the row in `enquiries` has status `SENT`. Stopping Mailpit gives an error message and a `FAILED` row. Invalid input shows field errors and saves nothing.
- [x] Checked live through Docker Compose:
  - In headless Edge, driven like a user: the product page -> Enquire -> empty submit shows "Enter your name." and "Enter your email address." with focus on the name -> filled in -> "Thank you" (focused).
  - Mailpit received the email to `sales@catalogue.local` with Reply-To the customer and the full body; the row is `SENT`.
  - With Mailpit stopped: 502 after 5.6 s, the row is `FAILED: [smtp] sending failed: ETIMEDOUT`; with Mailpit back, sending works again.
  - Invalid fields 400, unknown product 404, honeypot 201 with no row.
  - `docker compose down` and `up` keep the rows (and the migrate step reports "No pending migrations"); `down -v` deletes the volume, and a fresh start re-applies the migration.
  - Server logs contain the enquiry id only.
