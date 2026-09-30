# Flasharo

Flasharo is a small flashcard app built for learning full stack development. People can create accounts, write and study flashcards, keep sets private, or publish sets for others to find and study. Learn mode saves each person's progress through multiple-choice and written questions. Flutter and cloud deployment are later milestones.

## How the pieces fit

```text
Next.js web app  ── Firebase Authentication (email/password)
      │
      └── Firebase ID token ──► Fastify API ──► PostgreSQL (users, sets, cards)
                                  │
                                  ├── verifies token with Firebase Admin
                                  └── Firestore (per-user Learn progress)
```

Firebase Authentication stores account credentials. PostgreSQL stores an app profile keyed by Firebase UID, plus sets and cards. Firestore stores each user's Learn progress. The API verifies ID tokens for private editing and Learn routes; public search and public set reads do not require an account. The browser does not connect to either database directly.

The `packages/contracts` package holds TypeScript response and input types shared by the two apps. The API also publishes an OpenAPI document at `http://localhost:3001/openapi.json` and interactive docs at `http://localhost:3001/docs`; a future Flutter client can use that contract.

## Local setup

Prerequisites: Node.js 22 or newer, pnpm 10, Docker Desktop running, Java installed, and network access for the first dependency and Firestore emulator download. The Firebase emulators are run by `firebase-tools` through pnpm.

From the **inner `Flasharo` Git directory** (the directory containing this README), run in PowerShell:

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

The first successful `pnpm install` generates `pnpm-lock.yaml`; commit that lockfile so later installs use the same dependency versions.

Open `http://localhost:3000`. The API runs at `http://localhost:3001`, the Auth emulator at `http://127.0.0.1:9099`, Firestore at `http://127.0.0.1:8080`, and the emulator UI at `http://127.0.0.1:4000`. `pnpm dev` starts the web app, API, and both emulators together; keep that terminal open. The first Firestore start may download its emulator files.

If you already have `apps/api/.env`, add `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` to it. Stop the existing `pnpm dev` process and restart it so the API reads the new environment variable and the Firestore emulator starts. Do not include `http://` in this variable.

The sample Firebase project ID `demo-flasharo` is for local emulator use. Accounts created there are local test accounts. For a real Firebase project, set the web Firebase variables and API `FIREBASE_PROJECT_ID` to the real project, remove `FIREBASE_AUTH_EMULATOR_HOST` from the API environment, and set `NEXT_PUBLIC_USE_AUTH_EMULATOR=false` in the web environment. Do not commit real credentials or a service account key.

The emulators export local accounts and Learn progress to the ignored `.firebase-data` directory when they stop cleanly, then import them on the next start. Wait for the export message before closing the terminal.

If PostgreSQL has not started yet, wait for `docker compose ps` to show it as healthy before running the migration. The SQL migrations in `apps/api/drizzle` match the Drizzle schema in `apps/api/src/db/schema.ts`. Run `pnpm db:migrate` again after pulling future schema changes.

## Learning slices

### 1. Workspace and data

`pnpm-workspace.yaml` links the apps and shared contracts; Nx runs their development, build, type check, and test targets. The Drizzle schema defines three tables. `users.id` is the Firebase UID. A set points to its owner, and cards point to their set; database cascades remove cards when a set is deleted.

**Try it:** After adding a card, inspect the tables with `docker compose exec db psql -U flasharo -d flasharo` and run `SELECT title FROM study_sets;`.

### 2. Sign-in and API

The web app calls Firebase Authentication. `apps/web/src/lib/api.ts` then attaches the user's ID token to API requests. `apps/api/src/app.ts` verifies it before the route runs and synchronizes the profile. `apps/api/src/routes.ts` checks ownership in each query; another account receives a 404 for a private set. Profile sync is idempotent, so a failed request can be retried safely.

**Try it:** Sign up twice with different emails. Create a set with the first account and confirm it does not appear for the second.

### 3. Cards and study

The set editor writes title, description, and cards through the API. Cards have a saved `position`; the up/down controls send the full desired order. Study mode fetches that same ordered set and flips a card in local React state. This milestone does not store which cards you studied.

**Try it:** Add two cards, move the second one up, refresh the page, and check that study mode shows the new order.

### 4. Public sharing and search

`apps/api/drizzle/0001_public_sets.sql` adds a `visibility` column. Existing and new sets default to `private`. The owner can change visibility through the authenticated API; `apps/api/src/public-routes.ts` only returns sets marked `public`. Search checks titles and descriptions and returns 12 results per page. The public study page uses the same card-flipping component as private study mode.

The browser sends a CORS `OPTIONS` check before authenticated `PATCH`, `PUT`, and `DELETE` requests. `apps/api/src/app.ts` allows those methods from the web origin. The home route reads Firebase auth state: signed-in visitors see their set library, while signed-out visitors see the introduction page.

**Try it:** Publish a set, log out, find it from **Explore**, and flip its cards. Log back in, make it private, and confirm its public page now says it is unavailable.

### 5. Learn mode and saved progress

Learn mode needs at least two different definitions to make a multiple-choice question. For each card, a correct choice unlocks a written question. A correct written answer marks the card learned. Wrong answers keep that step available for another try. Written answers ignore capitalization and extra spaces. Progress resumes after a reload and is separate for each account, including when people practice the same public set. There is no review timer: learners can choose **Start over** during a round or **Study again** after finishing one.

`apps/api/src/learn-routes.ts` checks that the user can access the set and creates the question. `apps/api/src/learn-progress.ts` grades answers and saves the stage in Firestore at `learn_progress/{firebaseUid}/sets/{setId}/cards/{cardId}`. The API uses a Firestore transaction so two near-simultaneous answers cannot overwrite each other. Restarting removes only that user's saved card progress for the chosen set and begins again at multiple choice; the cards in PostgreSQL stay intact. Editing a card resets that card to multiple choice because its content changed. `firestore.rules` blocks direct client access; the authenticated API handles progress. `apps/web/src/app/sets/[setId]/learn/page.tsx` displays the question and feedback.

**Try it:** Answer the first choice correctly, reload the page, and confirm you now see the written question. Open the emulator UI and find your card's progress document. Finish the set, click **Study again**, and confirm the counter returns to zero. The restart removes progress documents for that account and set.

## Checks

```powershell
pnpm typecheck
pnpm build
```

API integration tests require a separate database whose name ends in `_test`:

```powershell
docker compose exec db psql -U flasharo -d postgres -c "CREATE DATABASE flasharo_test;" # once; skip if it already exists
$env:TEST_DATABASE_URL = "postgres://flasharo:flasharo_local@127.0.0.1:5432/flasharo_test"
pnpm --filter @flasharo/api test
```

The test suite creates its tables with the migrations and cleans its test users before each test. It checks token rejection, profile recreation, set/card CRUD, ordering, private ownership, publishing, public search, and the Learn stage rules. Learn route tests use an in-memory progress store, so they test API behavior without writing to your emulator data. Without `TEST_DATABASE_URL`, the database suite is skipped.

For the browser flow, keep `pnpm dev` running in another terminal, then run:

```powershell
pnpm --filter @flasharo/web exec playwright install chromium
pnpm --filter @flasharo/web test
```

The browser test signs up, creates and studies a set, answers a choice, reloads into the written step, publishes it, studies it while signed out, then logs back in and makes it private. It uses a fresh email each run in the local Auth emulator.

For the Selenium version of the account → set → Learn journey, see [Test_Automation/USER_STORY.md](Test_Automation/USER_STORY.md). With `pnpm dev` running and Python dependencies from `Test_Automation/requirements.txt` installed, run:

```powershell
pnpm test:selenium
```

This test completes both cards, checks that Learn progress survives a reload and a new login, then starts another round immediately. Set `$env:FLASHARO_HEADLESS = "0"` to watch Chrome. Setup and troubleshooting are in [Test_Automation/README.md](Test_Automation/README.md).

## API routes

Private `/v1` routes require a Firebase ID token in `Authorization: Bearer <token>`. Public routes do not.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/v1/me` | Sync and return the account profile |
| GET, POST | `/v1/sets` | List or create the owner's sets |
| GET, PATCH, DELETE | `/v1/sets/:setId` | Read, edit, or delete one set |
| PATCH | `/v1/sets/:setId/visibility` | Publish or make the owner's set private |
| POST | `/v1/sets/:setId/cards` | Add a card |
| PATCH, DELETE | `/v1/sets/:setId/cards/:cardId` | Edit or delete a card |
| PUT | `/v1/sets/:setId/card-order` | Save the complete card order |
| GET | `/v1/learn/sets/:setId` | Resume the signed-in user's next Learn question |
| POST | `/v1/learn/sets/:setId/answers` | Grade an answer and save Learn progress |
| POST | `/v1/learn/sets/:setId/restart` | Start a new Learn round for the signed-in user |
| GET | `/v1/public/sets?q=...&page=...` | Search public sets, 12 per page |
| GET | `/v1/public/sets/:setId` | Read a public set and its cards |

## Next milestones

1. Deploy Cloud Run, Cloud SQL, and Firestore with Terraform and Datadog. Add Cloud Functions when background work is needed.
2. Build a Flutter client using the same API.
3. Rework Learn mode later; consider scheduled review only as part of that redesign.
