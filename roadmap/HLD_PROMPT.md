# Prompt: regenerate the HLD diagram

Use this at wrap-up, when all slices are merged into `feature/product-catalogue-poc`, to rewrite `docs/HLD.md` so it matches the finished code. You can also use it after any slice to refresh the status markers.

Paste everything between the lines into the AI coding agent, from the repository root, on the feature branch.

---

You are updating the high-level design document `docs/HLD.md` for this repository, a product catalogue proof of concept built with a ports-and-adapters (hexagonal) architecture.

**Ground truth is the code, not the plan.** Read the plan only to understand intent, then describe what actually exists.

1. Read `AGENTS.md`, `roadmap/README.md`, `roadmap/PROGRESS.md` and the current `docs/HLD.md`.
2. Inspect the code to find what really exists:
   - `server/src/domain/`, `server/src/ports/`, `server/src/adapters/`, `server/src/services/`, `server/src/http/`, `server/src/config.ts`, `server/src/main.ts`;
   - `server/prisma/schema.prisma` and `server/prisma/migrations/`;
   - `client/src/` (pages, `api/client.ts`, `theme/tokens.css`);
   - `docker-compose.yml`, `server/Dockerfile`, `client/Dockerfile`, client nginx config, `.env.example`.
3. List every HTTP route actually registered (method, path, status codes), every port and every adapter implementing it, and which adapter `main.ts` wires for each port and under which env setting.
4. Run `npm test` in `server/` and `client/` and record the real test counts.

Then rewrite `docs/HLD.md` with exactly these sections:

1. **System context**: actors (customer, business owner, sales team), the system, and external systems (Fake Store API, email provider / Mailpit).
2. **Containers**: web app (nginx), Catalogue API, PostgreSQL, Mailpit, Fake Store; ports, protocols and the `/api` proxy. State that the browser never calls Fake Store and that the database holds enquiries only.
3. **API components (ports and adapters)**: driving adapters (HTTP controllers, tests), core (application services, domain), ports, driven adapters, composition root. Dependency arrows point towards the core; dotted "implements" arrows from adapters to ports. Follow it with a table mapping each element to its folder.
4. **Key flows**: two sequence diagrams, a browse flow (category page) and the enquiry flow (validate, look up product, save `PENDING`, send email, mark `SENT` or `FAILED`, 201 "Thank you" or 502). Use the real class, method and route names from the code.
5. **API surface**: a table of the registered routes with the AC each serves, plus the error shape and status-code rules.
6. **Deployment**: local Docker Compose next to the AWS equivalents (S3 + CloudFront or ECS for the web app, ECS Fargate for the API, RDS for PostgreSQL, SES for email, Parameter Store / Secrets Manager for config). Label the AWS column "target, not built" unless infrastructure code exists in the repo.
7. **Cross-cutting concerns**: validation, errors, security, testing (with real counts), swappability (product source, email provider, enquiry store, theme tokens).
8. **Status by slice**: all 7 branches with their final status.

Diagram rules:

- Use Mermaid code blocks (`flowchart LR` and `sequenceDiagram`) so GitHub renders them. Quote any label that contains spaces, punctuation or `<br/>`. Avoid `:` inside sequence-diagram message text except the first one, and write path parameters as `{id}` / `{slug}`, not `:id`.
- Keep the legend and these class definitions in every flowchart: `built` (green), `partial` (amber), `planned` (grey dashed), `external` (blue). Mark each node with the status that is true in the code.
- Put only components that exist in the code, or are clearly marked `planned`. Never invent a component, queue, cache or service.
- Keep every diagram readable: at most about 20 nodes each.

Finally:

- Update the status line at the top of `docs/HLD.md` with today's date.
- Do not add a "differences from the plan" section to `docs/HLD.md`: it describes the design as built. Instead, list anything in the code that differs from `roadmap/`, `TASKS.md` or the previous `docs/HLD.md` in your reply, and add each as a decision or AI log entry in `roadmap/PROGRESS.md` if it is not already there. The reasoning for reviewers goes in `DECISIONS.md`.
- Check that each Mermaid block renders (GitHub preview or https://mermaid.live) and fix syntax errors.
- Do not change any code. Do not commit.

---
