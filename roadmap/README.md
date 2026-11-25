# Roadmap: execution order

This folder is the working lookup for building the product catalogue PoC. Agents read it at the start of every session (see `AGENTS.md`).

- `TASKS.md` (repo root) is the complete breakdown of the challenge brief: constraints, acceptance criteria (ACs), decisions, deliverables.
- This folder turns it into **7 slices**, one git branch each, built in order and merged into `feature/product-catalogue-poc`.
- `PROGRESS.md` is the single source of truth for status, decisions and the AI log.

## Slices

A slice is a vertical piece of work. Each feature slice delivers one AC end to end: backend, frontend and tests.

| # | Branch | Plan | Delivers | Database |
|---|---|---|---|---|
| 1 | `setup/data-layer` | `00-data-layer.md` | Domain model, `ProductSource` port, Fake Store adapter, in-memory test source, featured-products config | None |
| 2 | `setup/foundation` | `01-foundation.md` | API skeleton (config, errors, health), React skeleton (routing, layout, API client, theme), Docker Compose | None |
| 3 | `slice/feature-home` | `02-features.md` | F1: home page with the 5 top-rated products | None |
| 4 | `slice/feature-product` | `02-features.md` | F4: product details page | None |
| 5 | `slice/feature-category` | `02-features.md` | F2: category links and category page | None |
| 6 | `slice/feature-search` | `02-features.md` | F3: search bar and results | None |
| 7 | `slice/feature-enquiry` | `02-features.md` | F5: enquiry form, email to the sales inbox, "Thank you" | **PostgreSQL + Prisma, enquiries only** |
| - | `feature/product-catalogue-poc` | `HLD_PROMPT.md` | Wrap-up: README, `DECISIONS.md`, `AI_USAGE.md`, regenerated `docs/HLD.md`, fresh-clone test, the PR into `main` | |

All seven slices are built. Status, commits and PR numbers: see `PROGRESS.md`.

## Where the database fits

- **Products are not stored**, in Postgres or in a local file. Fake Store is their single source of truth. A copy would duplicate it, need syncing, and could disagree with the source.
- **Featured products are configuration:** 5 ids in `FEATURED_PRODUCT_IDS`.
- **Enquiries are the only data the app owns**, so PostgreSQL + Prisma arrive with slice F5, for the `enquiries` table only. Each enquiry is saved before the email is sent, so a failed email does not lose the lead.

## Folder layout

```text
AGENTS.md              agent instructions (required by the brief)
TASKS.md               full task breakdown of the brief
README.md              repo README
DECISIONS.md           assumptions, decisions and trade-offs, what was dropped, growth, next steps
AI_USAGE.md            how AI was used, where it went wrong, how its output was checked
docs/HLD.md            high-level design diagrams, generated from the code
roadmap/               this folder (HLD_PROMPT.md regenerates docs/HLD.md)
.env.example           safe local defaults, no secrets
docker-compose.yml     client, server, postgres, migrate (one-off), mailpit
server/                Node 22 + TypeScript API
  prisma/              schema.prisma (enquiries table), migrations/
  scripts/             snapshot-catalogue.ts
  src/domain/          Product, Category, errors, id and slug rules, search, category split, enquiry rules and email
  src/ports/           ProductSource, FeaturedProducts, EmailSender, EnquiryRepository
  src/adapters/        fakestore/, featured-config/, email-smtp/, email-console/, enquiry-postgres/, enquiry-memory/, in-memory/ (tests)
  src/services/        CatalogueService, EnquiryService
  src/http/            routes and the error handler
  src/test-support/    test helpers and the recorded Fake Store response (tests only)
client/                React + TypeScript (Vite): api/, pages/, components/, theme/
```

## Conventions for every slice

- Follow `AGENTS.md`: architecture rules, TypeScript strict, no `any`, `.js` import extensions on the server, tests next to code.
- Task IDs: `DB-n` (slice 00), `FND-n` (slice 01), `F1-n` ... `F5-n` (features). Use them in commit messages and in `PROGRESS.md`.
- A slice is done only when its "Done when" check passes, including `npm run typecheck` and `npm test`.
- Record every assumption and every AI mistake in `PROGRESS.md` as it happens. `DECISIONS.md` and `AI_USAGE.md` are written from it at wrap-up.
