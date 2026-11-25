# Decisions

The assumptions, design choices and trade-offs behind this proof of concept. The architecture is drawn in `docs/HLD.md`; the full working log, with every decision as it was made, is in `roadmap/PROGRESS.md`.

## 1. Assumptions where the acceptance criteria were unclear

### F1. Home page: the 5 "top rated" products

- **"Top rated" is a business choice, not a calculated score.** The criterion says "I have *chosen* 5 products", so "I" is the business owner, and "top rated" and "featured" mean the same thing.
- **The owner chooses them in configuration** (`FEATURED_PRODUCT_IDS`), not in an admin screen. The products are shown in the configured order.
- **Exactly 5 unique ids, checked at startup.** A list with a different count, a duplicate or an invalid id stops the server with a clear message, so a typo is caught before anyone opens the page.
- **A configured product that no longer exists is skipped and logged**, so the page may show 4. One stale id should not take the home page down, and the log names the id to fix.

### F2. Category page: top rated products, then the rest

- **"Top rated" keeps the same meaning as on the home page:** the chosen products that belong to this category, in the configured order.
- **If none of the chosen products is in the category**, the section shows the category's 3 best rated products by Fake Store rating (ties go to the one with more ratings; unrated products are never picked), so the section is never empty.
- **"Additional products" are the rest of the category**, in the source's order, never repeating a top rated one. A section with no products is hidden.
- **Categories come from the products themselves**, so a category with no products cannot appear. Fake Store's misspelt "jewelery" is shown as "Jewellery"; URLs use slugs such as `/categories/mens-clothing`.
- **No pagination:** there are at most 6 products per category.

### F3. Search: only products whose text matches

- **"Text" means the title, the description and the category name.**
- **Every word of the term must appear, in any order;** case and apostrophes are ignored, so "mens jacket" finds "Men's ... Jacket". Matching is a plain substring check, never a regular expression built from what the user typed.
- **Search covers the whole catalogue**, not the current category. The Search button and the Enter key both search; a blank term does nothing. There is no type-ahead.
- **Results are in the source's order**, not ranked: the criterion asks only that non-matching products are excluded.
- **Terms are limited to 100 characters.**

### F4. Product page

- **"Details" means everything the source has:** image, category (a link to its page), title, price, rating and description.
- **Links and refresh work on every page** (`/products/3` can be opened directly). An unknown product shows "Product not found".

### F5. Enquiry

- **Contact details:** name and email are required; phone and message are optional.
- **One product per enquiry.** A basket of products to enquire about is out of scope.
- **The email is sent while the customer waits**, and "Thank you" is shown only once the mail server has accepted it.
- **The enquiry is also saved, before the email is sent**, so a failed email does not lose the lead (see section 2).
- **No confirmation email to the customer**; the criterion asks only for the sales inbox.
- **The sales inbox address is configuration** (`SALES_INBOX_EMAIL`). Locally the "sales inbox" is Mailpit, a mail catcher in Docker Compose at http://localhost:8025, because the brief rules out accounts and paid services.

### Across the app

- **Prices are in Australian dollars**; the source has no currency. Changing it means two formatters: the web app's (`client/src/components/Price.tsx`) and the email's (`server/src/domain/enquiry-email.ts`).
- **Product images load straight from the image URLs the API returns**, which Fake Store hosts. The client never calls the Fake Store API itself. Proxying the images through the backend would be the strictest reading of the brief; for a proof of concept it adds work without changing what the customer sees.
- **A web app rather than mobile:** a reviewer can run it with one Docker command, without Xcode, Android Studio or an emulator.

## 2. Key design decisions and trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| **Ports and adapters (hexagonal).** The business rules depend only on interfaces; Fake Store, the database, the email provider and HTTP are adapters chosen in one place, `server/src/main.ts`. | The brief says the data source, the look and feel and the email provider will all change; each sits behind one boundary. | More files than a single-layer app, for a 5-screen proof of concept. |
| **Products are never copied**, into the database or a local file. Every request reads Fake Store. | One source of truth: a copy would need syncing and could disagree with the source. | If Fake Store is down, pages show an error with "Try again"; there is no offline mode. |
| **PostgreSQL + Prisma for enquiries only.** Each enquiry is saved as `PENDING`, then marked `SENT` or `FAILED`, with a snapshot of the product's id, title and price. | The enquiry is the only data the business owns. Saving it first means sales can still find a lead whose email failed. The snapshot keeps it meaningful if the catalogue changes, without copying products. | One more container and a migration step. |
| **Failure order for an enquiry:** if the database fails, no email is sent; if the email fails, the enquiry is kept as `FAILED` and the customer sees an error; if the email was sent but marking it `SENT` fails, the customer still sees "Thank you". | Every email has a record, no lead is lost, and the customer is never asked to retry something already sent (that would send a duplicate). | A rare `PENDING` row can mean "emailed but not marked"; the log says which. |
| **Injection ruled out by construction.** Name, email and phone reject every control character, including line breaks; the email is plain text; its subject uses the product title from the source; the product title and price are never taken from the client. | No email header or HTML can be injected, and nobody can enquire about a "free" product, without relying on escaping rules. | A plain-text email is less polished than HTML. |
| **Abuse protection on enquiries:** a hidden honeypot field (a bot that fills it gets a normal success, but nothing is saved or sent) and a limit of 10 enquiries per client per 15 minutes. | Keeps scripts out of the inbox and the table without affecting browsing. | The limit is counted in memory: it resets on restart and is per server instance. |
| **One error shape and clear status codes.** Any outside-system failure, including timeouts, is 502; bad input is 400; an unknown or impossible product, category or route is 404; an empty search is 200 with no results. | The client needs only a few cases, and pages offer "Try again" only where a retry can help (502, network), not for 400 or 404. | A timeout is strictly 504; one code was simpler. |
| **Validate everything at the boundary** with zod: every Fake Store response, every config value, every request. Fake Store's empty "200" for an unknown product is treated as not found, and impossible ids never reach it. | Bad data fails loudly in one place instead of deep in a page. | One malformed product would fail the whole list; acceptable for 20 known products. |
| **No cache yet.** Each page reads Fake Store's full product list (about 0.7 s), and the header's category list is a second call. | Correct and simple; nothing can go stale. | Slower pages and more upstream calls than necessary (see section 5). |
| **Runs with no setup.** Docker Compose needs no `.env`; outside Docker the API keeps enquiries in memory and prints emails to the console. Production refuses both local-only options. | A reviewer can start it in one command, and a developer without Docker can still work. | Two extra small adapters to maintain. |
| **Database migrations run in a one-off container** before the API starts; the running API image has no Prisma command-line tool. | The running service cannot change the schema, and the image is 368 MB instead of 670 MB. | `npm audit` still reports an advisory in that tool's dependencies; it exists only in the build and migration containers, which read our own config file, and the only fix offered is a downgrade to Prisma 6. |
| **The browser only calls `/api` on its own address;** nginx forwards it to the API and looks the API up again every 10 seconds. | No CORS, the browser never sees Fake Store, and the proxy keeps working when the API container is replaced. | An nginx setting (`NGINX_RESOLVER`) differs between Docker and AWS. |
| **Styling only through design tokens** (`client/src/theme/tokens.css`), with CSS modules and no CSS framework. | The brand's final look can land by editing one file. | Plain CSS, no component library. |
| **Mailpit as the sales inbox.** | No accounts or secrets, and reviewers can see the email; Amazon SES is a configuration change. | Not real delivery. |

## 3. Dropped or simplified

| Item | Why |
|---|---|
| Admin screen for choosing the top rated products | Configuration proves the flow; the `FeaturedProducts` interface lets a CMS or a table replace it |
| Automatic retry of failed emails (a queue) | Failed enquiries are kept as `FAILED`, so nothing is lost; a queue is the first next step |
| Confirmation email to the customer | Not in the criteria |
| Enquiring about several products at once, accounts, checkout | Not in the criteria |
| Pagination, sorting, filters, search ranking | 20 products; the response shapes allow adding them |
| A cache in front of Fake Store, and an offline mode | Kept simple and always fresh; a cache is a next step |
| Final visual design | The creative work is in progress; the tokens make styling replaceable |
| Cloud deployment and infrastructure as code | Optional in the brief; the images are ready for AWS (ECS Fargate, RDS, SES) |
| Linting and formatting (ESLint, Prettier) | Planned but cut for time; strict TypeScript and the tests catch most mistakes, and every file was reviewed |
| Continuous integration and browser end-to-end tests (Playwright) | Cut for time. Each criterion has a test that acts like a user, and every slice was also checked by hand in a real browser against the running stack |
| A rate limit shared between several API instances | One instance in the proof of concept; a shared store (Redis) is needed to scale out |
| Privacy notice and data retention for enquiries | Out of scope, but needed before real customers use the form |

## 4. How the design supports growth beyond the proof of concept

The brief names three things that will change. Each one is a single, tested boundary.

**The product data source.**
- Services ask a `ProductSource` interface for products; they never see Fake Store's format, which stays inside its adapter.
- A new source (a PIM, an owned product database, Shopify) is one new adapter plus one line in `main.ts`.
- A shared contract test suite already runs against two sources (Fake Store and an in-memory one); a new source must pass the same suite before it is used.
- The interface's methods are query-shaped (get by id, by category, search), so a real database can filter and search natively instead of loading everything.
- Product ids are strings, so SKUs or UUIDs fit without a change.

**The look and feel.**
- Every colour, font, spacing and shadow is a token in `client/src/theme/tokens.css`; components only use those tokens.
- The only code that talks to the API is `client/src/api/`.
- The business rules (what "top rated" means, how search matches, enquiry validation) live in the backend, so a redesign, or a future mobile app, gets the same behaviour from the same API.

**The email provider.**
- Services send through an `EmailSender` interface.
- Moving from Mailpit to Amazon SES or any SMTP provider is configuration only (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`).
- An API-based provider (SendGrid, Postmark) is one new adapter.

**Other growth already in place.**
- The enquiry store is behind an `EnquiryRepository` interface and the top rated list behind a `FeaturedProducts` interface, so either can move to another store or a CMS.
- Configuration is validated at startup, and the same Docker images map directly to AWS: ECS Fargate for the web app and API, RDS for PostgreSQL, SES for email, with the migration as a one-off task.

## 5. What I would do next with another day

In order:

1. **Deliver enquiry emails through a queue** (for example SQS, or an outbox table) with automatic retries, so a mail outage no longer shows the customer an error; add a confirmation email to the customer.
2. **Add a short-lived cache in front of Fake Store**, so each page makes one upstream call per minute instead of one or two per visit, and pages can keep working briefly if Fake Store is down.
3. **Continuous integration:** typecheck, tests, image builds and `npm audit` on every pull request, plus ESLint and Prettier.
4. **One browser end-to-end test** (Playwright) that runs all five criteria against Docker Compose and reads the email back from Mailpit's API.
5. **Run more than one API instance:** a shared rate-limit store (Redis), structured logs with request ids, and a readiness check for the database.
6. **A simple sales view of enquiries**, especially `FAILED` ones, and an admin screen for the top rated products.
7. **Infrastructure as code for AWS** (ECS, RDS, SES, Secrets Manager).
8. **Search relevance ranking and pagination** once the catalogue grows; a privacy notice and a retention period for enquiries.
9. **Upgrade Prisma** when a release fixes the reported advisory.
