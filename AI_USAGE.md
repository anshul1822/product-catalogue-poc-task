# AI usage

How AI tools were used to plan and build this proof of concept, where they went wrong, and how their output was checked. The full, dated log is in `roadmap/PROGRESS.md` ("AI log"); the design decisions are in `DECISIONS.md`.

## 1. Tools and models

| Tool | Model | Used for |
|---|---|---|
| A terminal-based AI coding agent with file, shell, Docker and browser access | Claude Opus 5.5 (`claude-opus-5-5`) | Reading the brief, the task breakdown and roadmap, the code, tests, Dockerfiles and Compose file, the docs, and running every check (tests, builds, Docker, live API calls, a headless browser) |

**How the work was split.** The agent wrote the code, tests and documentation and ran the checks. I made the design calls, approved every new dependency before it was installed (each pinned to an exact version), read the changes, and made every commit, push and pull request myself; the agent never committed or merged. Where the agent's proposal and my judgement differed, my call is recorded as a decision (section 4).

## 2. Agent instruction files

- **`AGENTS.md`** (repository root), committed. The agent read it at the start of every session. It sets:
  - the scope: only what the five acceptance criteria need;
  - the architecture rules: the client never calls Fake Store, services depend only on interfaces, products are never stored, Prisma stays inside its adapter;
  - the commands, conventions and patterns for adding a feature;
  - the testing rules: every criterion has a test, no real network in tests, tests must fail when behaviour breaks;
  - the security rules: validate all input, never build a regex, HTML or email header from user input, no secrets, no personal data in logs;
  - "ask before adding a dependency"; and "do not commit, merge or push unless asked".
- **`roadmap/HLD_PROMPT.md`**, committed: the prompt that regenerates `docs/HLD.md` from the code rather than from the plan.

`AGENTS.md` was updated as the project grew (for example the client test conventions, the Docker setup, the Prisma commands), so later sessions followed the same rules as earlier ones.

## 3. The plan

The work followed a written plan, kept in the repository:

- **`TASKS.md`**: the brief broken down into constraints, the five acceptance criteria with their open questions, decisions to make, a test plan and a submission checklist. Written first, before any code, after checking the live Fake Store API.
- **`roadmap/`**: the execution order. The work was split into 7 slices, each on its own branch and merged with a merge commit: two groundwork slices (data layer, foundation), then one per acceptance criterion, each delivering endpoint, page and tests together, so a working feature existed after every merge.
  - `roadmap/PROGRESS.md` holds the status, every decision with its reason, and the AI log.
- **`docs/HLD.md`**: the architecture diagrams, regenerated from the code at the end.

## 4. Key prompts and moments that shaped the solution

1. **"Create a md file out of the instruction stating the precise tasks that are needed."** Before writing the plan, the agent called the live Fake Store API rather than trusting assumptions. It found three facts that shaped the data layer:
   - there is no search endpoint, so the backend implements search;
   - an unknown product returns HTTP 200 with an empty body, not 404, so the adapter treats an empty body as "not found";
   - one category is misspelt ("jewelery"), so the adapter fixes the display name.
2. **"Use PostgreSQL with Prisma" for the data layer, and my pushback.** The agent started installing Prisma to store products. I pointed out that the products come from Fake Store, so a copy duplicates them and breaks the single source of truth, and that only the enquiry needs a database. That became the design: no product table, and PostgreSQL for enquiries only, added in the last slice.
3. **"There is no need for offline back[up]."** The agent had also kept a local JSON copy of the products as an offline fallback. I rejected it for the same reason: a snapshot used at runtime needs syncing too. It was removed; the recorded Fake Store response survives only as a test fixture.
4. **Feature-wise slices instead of database, backend and frontend branches.** I first proposed one branch per layer, then asked whether working feature by feature would be better. We settled on vertical slices, one acceptance criterion each, built and checked end to end before the next. If time ran out, the finished criteria would still work. We also compared MVC with ports and adapters and chose ports and adapters, because the brief says the data source and the email provider will change.
5. **"Will it send an actual email to my Gmail?"** Checking this against the brief confirmed Mailpit as the sales inbox. It needs no account, no secrets and no paid service, and reviewers can open it and see the email. A real provider such as Amazon SES remains a configuration change.

## 5. Where the AI got it wrong, and how it was caught

**Design mistakes, caught by me**

- **Storing products in the database** (section 4, item 2). The agent had argued earlier against copying products, then started doing exactly that when asked for a database, without pointing out the conflict. I stopped it; the packages were removed and the tests rerun.
- **Keeping a local copy of the products as an "offline fallback", and defending it** (section 4, item 3). Removed.

**Wrong assumptions, caught by tests or checks**

- **Test expectations written from memory instead of the data.**
  - The agent expected the search "cotton jacket" to return two products, but a third matches through its description.
  - It expected "men's" to match only clothing, but "Women's" contains "mens".
  - It expected "%" to match nothing, but five descriptions contain "100%".
  - In every case the test failed, the data explained why, and the expectation was corrected, not the code.
- **An outdated library option.** The agent used MSW 2's `onUnhandledRequest` with MSW 3. The typecheck failed; the agent read the installed type definitions and used the renamed option.
- **A comment that was not true.** The agent wrote that a test request with no fake response "fails the test". A small probe test showed the request was blocked but the test still passed. A listener now fails such tests, and the probe confirmed it.
- **An accessibility bug in its own component.** A product tile was announced to screen readers as "Mens Cotton Jacket$55.99", with no space; a test caught it, and the markup was fixed.
- **A test fake that silently lost its methods.** The agent built a fake product source by spreading a class instance and hid the problem with a type cast. It noticed this on re-reading, before running the test, and replaced it with a small subclass.

**Bugs found only by running the real system**

- **nginx answered 502 after the API container was recreated.** It had looked up the API's address once at startup and kept using the old one. The bug had existed since the foundation slice; no unit test could see it, and the first live enquiry exposed it. It was diagnosed from the nginx log, fixed by re-resolving the name every 10 seconds, and proved by forcing the API onto a new address without restarting nginx.
- **The Prisma command-line tool ended up in the production image.** npm reported security advisories after installing Prisma. Instead of running the suggested fix (a downgrade to Prisma 6), the agent traced the advisory and found the tool was being installed into the runtime image. Removing it cut the image from 670 MB to 368 MB.

**Process slips**

- **Commits that do not build on their own.** Twice a commit was pushed whose tests depend on a later commit: one was missing `config.ts`, and in the last slice two test files landed a commit early. Each time the agent compared each commit's files with the plan and checked out each commit in a clean copy to confirm the tip builds. They were already pushed, so they were recorded instead of rewritten.
- **Commit instructions with a wrong file count.** The agent once gave a wrong file count in its commit instructions; the "check the staged files" step in every instruction caught it.
- **A shell edit that corrupted characters in a doc.** A PowerShell rewrite of a document garbled its diagram characters. From then on, files were changed only through the editor tools.

## How the AI's output was checked

Trusting the agent's own report was never the test. Each slice was checked in four ways:

- **Tests that act like a user**, at least one per acceptance criterion: for example opening a product, clicking Enquire, filling in the form and seeing "Thank you". The server has 317 tests and the web app 93; none needs the network or a database.
- **Mutation checks:** a deliberate bug was introduced in each slice, the tests were run, the code restored, and the result logged. Examples: search returning every product, the category split repeating products, line breaks allowed in an email header field, the honeypot ignored, a failed email not recorded. Every one made tests fail.
- **Live checks against the running stack:**
  - real Fake Store calls;
  - a headless browser rendering and clicking through each page;
  - the email read back from Mailpit and the database row checked;
  - Mailpit stopped to see the failure path;
  - data surviving a restart.
- **Docs checked against the code:** commit file lists compared with the plan; each commit built in a clean copy; diagrams rendered; the HLD regenerated from the code rather than the plan.

