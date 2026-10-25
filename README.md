# RapidStrike Championship

A single-repository RapidStrike competition app for Air University, Islamabad. Participants register and take a timed typing attempt, while organizers manage the RapidStrike Championship and audiences follow the MongoDB-backed RapidStrike Rankings, refreshed by polling. The production domain is https://rapidstrike.vercel.app/.

The 1200×630 social preview image is `client/public/og-image.jpeg`. Canonical, Open Graph, and large-image Twitter card metadata use the production domain above. The sitemap lists the public landing, competition, and leaderboard routes; organizer and projector pages are excluded from indexing.

## Stack and architecture

- React 19, TypeScript 7, Vite 8, React Router 7, Tailwind CSS 4, and Lucide.
- Express 5 on Node.js, with Zod validation, Mongoose 9, MongoDB Atlas, bcryptjs password hashes, and signed administrator sessions.
- One Vercel project: the Vite build is static output in `dist`; `api/index.ts` exports the Express app as a Node.js Function. API paths are rewritten to that handler; other paths fall back to the SPA entry.
- Local development runs Vite and a short-lived Express development server together. Only the local development entry calls `listen`; production API functions do not.
- MongoDB stores the competition, participants, passages, attempts, admins, audit logs, and request-limit buckets. No competition results depend on memory or browser storage.

### Project structure

```text
api/index.ts                 Vercel Express function entry
client/src/                  React routes, UI, API client, and polling hook
scripts/dev-api.ts           Local-only Express listener
scripts/create-admin.ts      One-time CLI administrator bootstrap
server/config/               Environment and MongoDB connection
server/middleware/           Authentication, CSRF, and persistent rate limits
server/models/               Mongoose data models and indexes
server/routes/               Public and administrator REST APIs
server/services/             Competition initialization, health, and scoring
shared/types/                Shared type space
tests/                       Node test-runner tests
vercel.json                  Vercel function, static output, and SPA routing
```

## Requirements

- Node.js 22.12 or newer (Vite 8 and Mongoose 9 are verified against the installed package versions).
- npm 11 or a compatible recent npm.
- A MongoDB Atlas database for persisted competition operations.

Actual installed dependency versions were checked with `npm ls --depth=0`. The project declares the missing Express, Mongoose, Zod, bcryptjs, and dotenv runtime packages; the existing React/Vite toolchain was retained. No `npm init` or project scaffolding is needed.

## Install and run locally

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
# Edit .env with your MongoDB URI and a new SESSION_SECRET.
npm run dev
```

If `.env` already exists, keep it and update its keys rather than overwriting it. The canonical MongoDB key is `MONGODB_URI`; the application also accepts `MONGO_URI` for existing local configurations. `SESSION_SECRET` is required for administrator sessions; `JWT_SECRET` is not used. Replace any previously exposed values with newly rotated credentials.

Vite is available at `http://localhost:5173`, and the local API health endpoint is `http://localhost:3001/api/health`. Vite proxies `/api` to the local Express process. `npm run dev` uses `concurrently`, so it works from PowerShell without Unix shell commands.

The web UI and health endpoint can load without MongoDB, but registration, attempts, leaderboard data, and organizer operations require a valid database configuration. Missing `MONGODB_URI` and `SESSION_SECRET` produce controlled API errors rather than fake data.

Run other commands from the repository root:

```powershell
npm run typecheck
npm test
npm run build
```

`npm test` uses Node's built-in test runner through the already-installed `tsx`; there is no separate test framework to install.

## MongoDB Atlas setup

1. Create an Atlas cluster and a dedicated database user with access to the `speed-typing` database. The application selects this database explicitly through Mongoose's `dbName` option.
2. Configure Atlas network access for the deployment's outbound egress. Prefer static egress or another narrow allowlist for production instead of allowing all IPs.
3. Copy the Atlas connection string into the local, ignored `.env` as `MONGODB_URI` (existing setups using `MONGO_URI` are also accepted). URL-encode special characters in the database user's password.
4. Keep the connection string server-side only. Never use a `VITE_`-prefixed variable for it.
5. MongoDB creates the `speed-typing` database when the first write occurs. The first database-backed request initializes the default competition and an original starter passage. Mongoose creates the required unique, ranking, and TTL indexes. No demo participants or results are seeded.

## Seed additional typing passages

Run `npm run seed` to add two original typing passages to the current competition. The script uses the configured Mongoose connection and environment variables, and upserts by the existing `(competitionId, title)` unique key. It preserves existing passage content and does not create participants, attempts, leaderboard scores, or administrator accounts. For safety, it only seeds an upcoming round with no registered participants or attempts; it never deletes or resets records.

Run it twice to verify idempotency: the first run reports newly added passages, and the second reports that they already exist.

Example local configuration (placeholders only):

```env
NODE_ENV=development
API_PORT=3001
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
SESSION_SECRET=<at-least-32-random-characters>
```

The `dbName` setting directs this connection to `speed-typing`; a database name in the URI path does not change the selected application database.

Generate a session secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env`. `.env.example` contains placeholders only.

## Administrator accounts

Administrator creation is a local/controlled CLI operation, not a public registration route:

1. Configure the Atlas URI and session secret in `.env`.
2. Run `npm run admin:create` in an interactive terminal. Enter the administrator email and a unique password when prompted; password input is masked and confirmed. Alternatively, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` temporarily in `.env` before running the command.
3. The script hashes the password with bcryptjs and allows multiple administrator accounts. It refuses duplicate email addresses. If using environment variables, remove `ADMIN_PASSWORD` from `.env` after creation. Do not configure credentials in Vercel.
4. Sign in at `/admin`. Sessions use a signed, HTTP-only, same-site cookie plus CSRF verification. Mutating admin requests are checked on the server.

To permanently delete an administrator, run `npm run admin:delete` in an interactive terminal, enter the exact account email, then type `DELETE` to confirm. The script will not remove the final active administrator. Deleting an account also makes its existing login sessions invalid on their next protected request. Administrator creation and deletion remain controlled CLI actions; there is no public account-management endpoint.

## Competition workflow

1. Open `/admin`, sign in, and open registration.
2. Participants visit `/compete` and register with a unique case-insensitive username. Display names and access codes are optional administrator-controlled settings.
3. Start the competition from the organizer console. A participant explicitly starts their test when ready; that request assigns an approved passage and records server timestamps.
4. The browser submits typed text only. The server checks attempt ownership and lifecycle, enforces the configured attempt limit, calculates elapsed time from its own clock, compares text to the assigned passage, and stores the score. Client metrics are estimates and are never accepted as results.
5. Visit `/leaderboard` for public results or `/display` on the projector computer. Both poll the API (about every 2.5 seconds while live, more slowly otherwise) and report last successful update and connection state.
6. Organizers can pause/resume/end the round, configure timing, attempts, ranking, and registration options before opening registration, adjust public/projector leaderboard statistics, manage passages, review results, invalidate a submitted attempt with a required reason, view the audit log, and export CSV.
7. **Archive & reset** requires confirmation and a reason. It creates a new competition record and preserves the archived round and all its participants, attempts, and audit records.

The default ranking is net WPM descending, then accuracy, fewer errors, earlier submission, and participant ID for a stable final tie-break. If an organizer allows multiple attempts, only each participant's best valid attempt occupies a leaderboard place; all attempts remain in the organizer history. Organizers may select gross WPM before registration opens; ranking rules are then locked for that round. Gross WPM is typed characters ÷ 5 ÷ elapsed minutes; accuracy is correct characters ÷ typed characters; net WPM is gross WPM × accuracy. Empty input and short elapsed times are handled without non-finite values.

## API

Public:

- `GET /api/health` — process and database configuration/connection status; does not require MongoDB.
- `GET /api/competition`
- `POST /api/participants/register`
- `POST /api/attempts/current` — restore an authorized participant's active attempt or latest accepted result.
- `POST /api/attempts/start`
- `POST /api/attempts/:attemptId/submit`
- `GET /api/leaderboard?limit=20`
- `GET /api/leaderboard/summary`

Administrator routes under `/api/admin` include login/logout/session check, competition state/settings, participants, attempts and invalidation, passage management, audit logs, and CSV export. Protected routes require a valid server-side session; writes require a CSRF token. Responses do not include participant access keys or admin password hashes.

## Tests and checks

```powershell
npm run typecheck
npm test
npm run build
```

The included tests cover score calculation, accuracy edge cases, configured ranking metric selection, username normalization, health payload semantics, and rejecting an unauthenticated admin request. Database integration tests require an Atlas test database and are not run automatically against the production database.

## Deploy to Vercel

1. Push this repository to your Git provider and create one Vercel project with the **repository root** as its root directory.
2. Use Node.js 22 or newer. Configure `MONGODB_URI` and a newly generated `SESSION_SECRET` in Vercel's Production and Preview environments as appropriate. Set `NODE_ENV=production` if it is not automatically set.
3. Use the project configuration in `vercel.json`: build command `npm run build`, output directory `dist`. Do not set `api/index.ts` as a separate project or deploy the UI and API separately.
4. Deploy. Vercel serves built static assets, rewrites `/api/*` to the Express function, and sends other paths to `index.html` so `/compete`, `/leaderboard`, `/display`, and `/admin` work on direct navigation and refresh.
5. Verify `https://<deployment>/api/health`. Confirm `database.configured` is true and that an operation requiring MongoDB succeeds. Create the first admin through the controlled CLI against the Atlas database before organizer sign-in.

Vercel deployments and Atlas egress must be configured in the same environments. Keep the database account least-privileged and never add MongoDB credentials or session secrets to client-side Vite variables.

## Two-device check

1. On a participant phone/laptop, register at `/compete` while registration is open.
2. On the organizer account, start the round.
3. Start and complete a test attempt on the participant device.
4. Confirm the accepted score appears on `/leaderboard` and `/display` after polling. Check its rank, accuracy, and update indicator.
5. Invalidate the test attempt from `/admin` with a clear reason before the official round if desired.

## Security and limitations

- Browser typing cannot be made perfectly cheat-proof: participants control their own devices. Server timing, assigned passages, attempt ownership, server text comparison, atomic attempt limits, and server-calculated scores reduce straightforward manipulation but cannot verify every physical keystroke.
- Input paste and drop are blocked as a usability deterrent, not a security guarantee.
- Rate-limit counters are persisted in MongoDB with hashed client address keys and TTL cleanup so they are shared across warm Vercel function instances.
- Polling is used instead of WebSockets; update latency depends on the polling interval and network availability.
- Do not reset a competition by deleting database records. Use the audited archive-and-reset flow.

## Credential exposure reminder

Database and token credentials were pasted into the development conversation. Treat them as compromised: rotate the MongoDB database user's password in Atlas, generate a new random `SESSION_SECRET`, update local/Vercel environment variables, and redeploy. Do not reuse the exposed values.

## admin command

npm run admin:create
