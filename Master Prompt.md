# GitHub Copilot Master Prompt — Tech Vanguard Speed Typing Competition

## Project Objective

Build a complete, production-ready web application from scratch for the **Tech Vanguard Speed Typing Competition at Air University, Islamabad, Pakistan**.

Use the **MERN stack: MongoDB, Express.js, React, and Node.js**, with TypeScript where appropriate.

The application must be deployable to Vercel from **one single root folder and one Git repository**. The frontend and backend must live in the same project. Do not create separate frontend and backend repositories or require separate deployments.

This is a real university competition, not a demo or static mockup. Participants will use their own devices, while organizers display a shared live leaderboard on an auditorium projector.

The implementation must include:

- Participant registration with unique usernames.
- A real timed typing test, defaulting to 60 seconds.
- Server-side score calculation and validation.
- Persistent MongoDB storage.
- A live public leaderboard.
- A dedicated projector display.
- Secure administrator authentication and competition controls.
- Deployment configuration for Vercel.
- Documentation for local setup, environment variables, database configuration, testing, and production deployment.

Do not stop after creating a plan. Inspect the repository, implement the complete application, run the available checks, fix errors, and document anything that genuinely requires manual setup.

---

## 1. Start From Scratch and Inspect the Repository

First, inspect the current workspace.

If the repository is empty, initialize the complete project structure.

If the repository contains existing code, inspect it before making changes. Preserve useful work where appropriate, but implement this application as a coherent system rather than patching unrelated code into it.

Before implementation:

1. Check the current files, Git status, package configuration, and installed dependencies.
2. Identify whether the repository already contains code that needs to be preserved.
3. Establish the architecture and deployment constraints.
4. Create the project structure.
5. Implement the application in working phases.
6. Run build and test commands after meaningful changes.

Do not delete user files, overwrite unrelated work, or change Git remotes without explicit authorization.

Do not leave the project at the planning stage.

---

## 2. Required Architecture

Use a **single deployable MERN application**.

Recommended project structure:

```text
tech-vanguard-speed-typing/
├── api/
│   └── index.ts
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── index.html
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── sockets/
│   ├── utils/
│   └── app.ts
├── shared/
│   └── types/
├── scripts/
├── tests/
├── .github/
│   └── copilot-instructions.md
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

This is a suggested organization. Adjust it if Vercel's runtime requirements or dependency compatibility justify a better structure, but keep everything inside one repository.

### Stack

Frontend:

- React.
- TypeScript.
- Vite.
- React Router.
- Tailwind CSS.
- Lucide React icons, used sparingly.
- A lightweight and maintainable state-management approach.
- Accessible UI primitives only where useful.

Backend:

- Node.js.
- Express.js.
- TypeScript.
- REST API.
- Mongoose for MongoDB.
- Zod or an equivalent validation library.
- Secure authentication middleware.
- Structured error handling.

Database:

- MongoDB Atlas for persistent hosted storage.
- Mongoose schemas, indexes, validation, and connection reuse.

Deployment:

- Vercel for the single-project deployment.
- Vercel serverless functions for the Express API.
- A single root-level build and deployment configuration.

Use stable, mutually compatible dependency versions. Check package compatibility before installing or upgrading dependencies.

Do not add Redis, Kafka, Docker, Kubernetes, Prisma, or unnecessary infrastructure.

---

## 3. Critical Vercel Architecture Requirements

The project must genuinely work on Vercel, not merely contain a `vercel.json` file.

Vercel serverless functions are not traditional persistent Express servers. Design the backend accordingly.

### Backend requirements

- Export the Express application or handler in a format compatible with Vercel Node.js Functions.
- Expose API routes under `/api`.
- Do not rely on `app.listen()` running as a permanent production server.
- Do not rely on in-memory state surviving between function invocations.
- Do not rely on a long-running process or a permanently open WebSocket server.
- Reuse MongoDB connections across warm invocations where possible.
- Ensure all database operations tolerate serverless cold starts.
- Handle asynchronous errors correctly.
- Use environment variables for production configuration.
- Keep secrets out of the frontend bundle.

A local Express server may use `app.listen()` for development, but Vercel must use its supported serverless entry point.

### Frontend and routing requirements

- Build the React application using Vite.
- Configure Vercel to serve the frontend and route `/api/*` requests to the backend without conflicts.
- Configure SPA fallback for frontend routes such as `/compete`, `/leaderboard`, `/display`, and `/admin`.
- Ensure direct navigation and refreshing a nested route work in production.
- Do not accidentally route frontend requests to the API handler.
- Verify that static assets resolve correctly after deployment.

### Realtime limitation and required solution

Do not implement a persistent Socket.IO server and assume it will work reliably on ordinary Vercel serverless functions.

Instead, implement a reliable shared leaderboard using one of these approaches:

1. **Preferred baseline:** Poll the leaderboard API at a reasonable interval, such as every 2–3 seconds while the competition is active, with slower polling when inactive.
2. Use conditional refreshes, request cancellation, backoff, and sensible cleanup.
3. Optionally use a supported external realtime service if it can be configured without introducing unnecessary complexity or cost.

For this project, reliable polling is acceptable and preferable to a fragile WebSocket implementation.

After a valid result is saved, refresh the leaderboard immediately in the submitting browser and let other devices pick up the update on their next poll.

Show connection and last-update indicators honestly. Never display a fake live status.

---

## 4. Design System and Branding

Create a premium, editorial, competitive-tech interface specifically for Tech Vanguard and Air University.

The application must not look like a generic AI-generated SaaS dashboard or a neon gaming website.

### Color palette

Use these colors consistently:

- Warm ivory: `#F5F2EA`
- White: `#FFFFFF`
- Charcoal: `#20221F`
- Graphite: `#30332F`
- Signal red: `#C7352B`
- Sage green: `#81917D`
- Muted gray: `#777A73`
- Light border: `#D9D6CE`

Use warm ivory for the landing page and appropriate public screens. Use charcoal and graphite for the active typing workspace and projector display.

Signal red indicates urgency, competition status, and important actions. Sage green indicates correct input and successful outcomes.

### Typography

Use a deliberate typography system:

- Space Grotesk or a comparable sans-serif for headings.
- A clean sans-serif for interface text.
- A monospace font for typing text, timers, WPM, and numerical statistics.

Use strong typography, spacing, alignment, thin dividers, and a carefully controlled visual hierarchy.

### Avoid

- Neon gradients.
- Purple/blue AI gradients.
- Glassmorphism.
- Excessive glow and blur.
- Generic AI illustrations.
- Robot or brain graphics.
- Excessive emojis.
- Rounded cards for every element.
- Generic SaaS dashboard templates.
- Decorative animations that distract during typing.
- Fake charts, fake users, and fabricated statistics.

Make the interface responsive, accessible, fast, and readable on mobile devices, laptops, desktops, and 1080p projectors.

---

## 5. Required Application Routes

Implement all of these routes.

### `/` — Landing page

Include:

- Tech Vanguard branding.
- Air University, Islamabad identification.
- Competition title: **Speed Typing Challenge**.
- Short event description.
- Enter Competition button.
- Live Leaderboard link.
- Projector Display link for organizers.
- Current competition status.
- Configured duration and participation rules.
- A preview of real leaderboard results.

The status and results must come from the backend. Do not hardcode the competition as live or fabricate participant counts.

Keep the page typography-led, polished, and uncluttered.

### `/compete` — Registration and typing test

Implement a complete participant workflow.

#### Registration

Ask for:

- Unique username.
- Optional display name if enabled by the administrator.
- Optional competition access code if enabled.

Requirements:

- Normalize usernames consistently.
- Validate inputs on both frontend and backend.
- Enforce uniqueness through MongoDB indexes and appropriate conflict handling.
- Prevent concurrent registrations with the same username from both succeeding.
- Do not collect unnecessary personal information.
- Provide useful validation errors.
- Enforce the configured attempt policy.

#### Ready screen

Show the participant's username, test duration, instructions, and a Start Test button.

The timer must not start while the participant is reading the instructions.

#### Active typing test

Implement a proper timed test.

Requirements:

- Default duration: 60 seconds.
- Duration configured by the administrator.
- A reference passage selected from an approved passage pool.
- Server-created attempt identifier.
- Server-authoritative start time.
- Visible countdown timer.
- Real-time character feedback.
- Correct characters shown with a restrained sage-green indication.
- Incorrect characters shown with a restrained red indication.
- Current WPM, accuracy, and error count.
- Automatic completion when the time limit expires.
- A safe submission process.
- Paste prevention as a deterrent, without claiming it makes cheating impossible.
- Sequential typing mode if enabled by the competition settings.
- Keyboard and mobile-input support.
- Safe behavior on refreshes, disconnections, and duplicate submissions.

Prevent participants from manipulating the countdown timer or directly choosing a score.

Use enough reference text to ensure participants are unlikely to finish the passage before the timer ends.

Use original or appropriately licensed English passages of comparable difficulty.

#### Results

Display:

- Gross WPM.
- Net WPM or the configured primary metric.
- Accuracy.
- Correct characters.
- Incorrect characters.
- Errors.
- Actual elapsed time.
- Final score.
- Current rank, if available.

Use a consistent scoring formula.

Suggested default:

- Gross WPM = total valid typed characters / 5 / elapsed minutes.
- Accuracy = correct characters / total evaluated characters × 100.
- Net WPM = gross WPM × accuracy as a decimal.

Use the server's elapsed time and the server-validated text comparison as the authoritative source.

Handle zero values safely and prevent negative, infinite, or NaN scores.

Display a success confirmation only after the backend accepts the result. Provide safe retry behavior if a network request fails.

### `/leaderboard` — Public leaderboard

Show real MongoDB-backed competition results.

Columns:

- Rank.
- Username.
- Net WPM or configured primary score.
- Accuracy.
- Errors.
- Submission time when appropriate.

Include:

- Participant count.
- Last updated timestamp.
- Live connection/polling status.
- Manual refresh.
- Top-10, top-20, or full view.
- Loading, empty, error, and stale-data states.

Use automatic polling while the competition is active and a slower interval when inactive.

Use deterministic sorting:

1. Primary score descending.
2. Accuracy descending.
3. Fewer errors.
4. Earlier valid submission.

Do not return private participant fields or administrator data.

Do not fabricate sample results in production.

### `/display` — Projector display

Create a dedicated auditorium display rather than simply enlarging the public leaderboard.

Requirements:

- Full-screen charcoal/graphite background.
- Large, high-contrast typography.
- Tech Vanguard and Air University identification.
- Competition title and current status.
- Visually distinctive top three.
- A readable leaderboard table.
- Large WPM and accuracy values.
- Participant count.
- Last-update indicator.
- A live status indicator based on actual successful API communication.
- A clear empty state before the first result.

Functionality:

- Poll the API automatically.
- Refresh the leaderboard immediately on page load.
- Handle API errors and recover gracefully.
- Reorder ranks when new results arrive.
- Use restrained transitions that do not distract the audience.
- Support a configurable top-10 or top-20 display.
- Support hiding secondary statistics.
- Include a Fullscreen button using the browser Fullscreen API.
- Handle long usernames gracefully.
- Work well at 1920×1080.
- Avoid navigation bars, sidebars, and unnecessary controls.
- Do not require login to display public results.

The organizer should be able to open `/display` on the laptop connected to the auditorium projector.

### `/admin` — Admin dashboard

Implement real, secure administrator authentication and controls.

#### Authentication

- Use a secure administrator login.
- Hash passwords with Argon2id or bcrypt if credentials are managed by this application.
- Prefer a secure, HTTP-only session cookie or another properly implemented authentication mechanism.
- Set appropriate cookie flags in production.
- Implement CSRF protection if using cookie-based authentication for state-changing endpoints.
- Apply rate limiting to login attempts.
- Never store plaintext passwords.
- Never put admin credentials or session secrets in frontend code.
- Enforce permissions in backend middleware.
- Do not rely on hidden UI controls as security.
- Do not create a public endpoint that lets anyone promote themselves to admin.

Provide a documented, safe bootstrap process for the initial administrator. For example, an explicit setup script or controlled environment-based bootstrap process that cannot be used by arbitrary public visitors.

#### Competition controls

Allow authorized administrators to:

- Open registration.
- Close registration.
- Start the competition.
- Pause and resume it where supported.
- End the competition.
- Configure test duration.
- Configure attempt limits.
- Configure supported scoring rules.
- Enable or disable display names.
- Enable or disable access codes.
- Manage typing passages.
- Configure public leaderboard columns.
- Configure the projector's top-N display.
- View the current competition state.
- Reset or archive a competition through an explicit, confirmed, authorized action.

Prevent incompatible settings from changing midway through an active attempt. Use a snapshot of relevant settings when an attempt begins.

#### Participant and results management

Display:

- Registered participants.
- Attempts.
- Scores.
- Accuracy.
- WPM.
- Errors.
- Submission timestamps.
- Current rankings.
- Attempt validation status.

Include search and useful filters.

Allow an administrator to invalidate an attempt with a required reason. Record the action in an audit log.

Provide CSV export if practical.

Never permanently delete real competition data as a side effect of resetting the interface.

---

## 6. MongoDB Data Models

Create maintainable Mongoose models with explicit validation, timestamps, indexes, and appropriate relationships.

Use separate models for:

### Competition

Fields should include:

- Name.
- Status.
- Duration in seconds.
- Maximum attempts.
- Scoring configuration.
- Public display configuration.
- Registration and access-code settings.
- Current competition state.
- Created and updated timestamps.
- Started and ended timestamps.

Use controlled status values, such as `upcoming`, `registration_open`, `live`, `paused`, and `completed`.

### Participant

Fields should include:

- Competition reference.
- Normalized username.
- Display name, if enabled.
- Registration timestamp.
- Status.
- Any necessary participant ownership or attempt-access identifier.

Create a unique compound index for normalized usernames within a competition.

### TypingPassage

Fields should include:

- Title.
- Passage text.
- Difficulty.
- Active status.
- Creation timestamp.

Only administrators may manage passages.

### TypingAttempt

Fields should include:

- Competition reference.
- Participant reference.
- Passage reference.
- Server-authoritative start timestamp.
- Server-authoritative expiration timestamp or configured duration snapshot.
- Submission timestamp.
- Elapsed seconds.
- Evaluated character counts.
- Error count.
- Gross WPM.
- Net WPM.
- Accuracy.
- Final score.
- Attempt status.
- Validation metadata.

Create indexes for common leaderboard, competition, participant, and submission queries.

Prevent duplicate submissions using an idempotency mechanism and appropriate state transitions.

### Admin

Fields should include:

- Username or email.
- Password hash if using local credentials.
- Role.
- Active status.
- Creation and last-login timestamps.

Never return password hashes through API responses.

### AdminAuditLog

Fields should include:

- Administrator reference.
- Competition reference.
- Action.
- Reason.
- Relevant metadata.
- Timestamp.

Keep core fields typed and queryable. Use mixed or flexible objects only for legitimate configuration and audit metadata.

### Database connection

Implement a reusable MongoDB connection helper that:

- Reads the connection string from an environment variable.
- Reuses existing connections in warm serverless invocations.
- Avoids opening a new connection on every request.
- Handles initial connection failures.
- Uses sensible serverless-compatible connection options.
- Does not log credentials or the full connection string.

Create a database index/setup script if useful.

Do not use in-memory arrays or localStorage as the primary database.

---

## 7. API Design

Create a clear REST API under `/api`.

Suggested endpoints:

### Public endpoints

- `GET /api/health`
- `GET /api/competition`
- `POST /api/participants/register`
- `POST /api/attempts/start`
- `POST /api/attempts/:id/submit`
- `GET /api/leaderboard`
- `GET /api/leaderboard/summary`

### Administrator endpoints

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/me`
- `GET /api/admin/participants`
- `GET /api/admin/attempts`
- `PATCH /api/admin/attempts/:id/invalidate`
- `PATCH /api/admin/competition`
- `POST /api/admin/competition/start`
- `POST /api/admin/competition/pause`
- `POST /api/admin/competition/resume`
- `POST /api/admin/competition/end`
- `POST /api/admin/competition/reset`
- `GET /api/admin/audit-logs`
- `GET /api/admin/results/export`

Adjust endpoint names if a better REST design is justified, but preserve equivalent functionality.

### API conventions

- Validate request bodies, parameters, and query strings.
- Use appropriate HTTP status codes.
- Return consistent JSON response structures.
- Never expose stack traces or secrets to the client.
- Implement centralized error handling.
- Handle missing records and invalid identifiers safely.
- Implement pagination for admin lists.
- Restrict public leaderboard results to safe, necessary fields.
- Add rate limiting to sensitive endpoints.
- Enforce competition state and attempt limits on the server.
- Avoid accepting arbitrary MongoDB query objects from clients.
- Add request-size limits.
- Configure CORS only when genuinely needed. Same-origin deployment should be the default.

---

## 8. Server-Authoritative Score Validation

A browser-based typing test cannot be made perfectly cheat-proof, because participants control their devices. Implement the strongest practical protections and document remaining limitations honestly.

### Attempt lifecycle

1. The participant registers.
2. The server verifies competition status and eligibility.
3. The server assigns a passage.
4. The server creates a unique attempt and records the authoritative start time.
5. The client displays the passage and records the participant's typed text or a suitable sequence of typing events.
6. The server enforces the allowed duration using server timestamps.
7. The client submits the attempt through the authorized endpoint.
8. The server validates the attempt state, duration, ownership, passage, and attempt limits.
9. The server evaluates the submitted text against the assigned passage.
10. The server calculates the authoritative score and stores the result.
11. The server returns the accepted result.
12. The leaderboard reflects the result.

### Security requirements

- Do not trust client-calculated WPM, accuracy, score, or elapsed time.
- Do not accept participant-submitted rank.
- Reject attempts that have not been started by the server.
- Reject expired, invalid, duplicate, or already-submitted attempts.
- Use server timestamps.
- Prevent attempt identifiers from being sufficient to access private participant information.
- Enforce the attempt policy on the backend.
- Make submissions idempotent.
- Reject malformed or implausible payloads.
- Rate-limit registration and submission endpoints.
- Avoid exposing sensitive validation metadata.
- Protect all admin routes with server-side authorization.

Where appropriate, record input timing information for validation, but do not overcomplicate the initial version with an unreliable anti-cheat system.

If you cannot implement strict server-side input-event verification in the initial version, implement server-side text comparison and authoritative timing, then document what can and cannot be verified.

---

## 9. Competition State and Rules

Implement one authoritative competition state shared across all routes.

Default configuration:

- Duration: 60 seconds.
- Maximum attempts: configurable, with a sensible default of one official attempt.
- Ranking: net WPM descending.
- Tie-breaker: accuracy descending.
- Next tie-breaker: fewer errors.
- Final tie-breaker: earlier valid submission.

Support:

- Upcoming.
- Registration open.
- Live.
- Paused.
- Completed.

The landing page, typing test, leaderboard, projector, and admin panel must all reflect the same state.

Prevent registration or attempt starts when the competition rules do not allow them.

Do not allow a competition's scoring rules to change in a way that inconsistently affects attempts already in progress.

Make it clear whether the best valid attempt or the only attempt counts. Apply that policy consistently.

Provide safe competition initialization and reset behavior. Use competition identifiers or archived competition records to separate test data from official results.

---

## 10. Environment Variables and Secrets

Create a `.env.example` file with placeholder values only.

Include the environment variables actually required by the implementation, such as:

```env
NODE_ENV=development
MONGODB_URI=
SESSION_SECRET=
ADMIN_BOOTSTRAP_SECRET=
APP_URL=http://localhost:5173
```

Add other variables only if the implementation genuinely needs them.

Requirements:

- Validate required environment variables at startup or request initialization.
- Provide understandable errors when configuration is missing.
- Never hardcode production credentials.
- Never commit `.env`.
- Never expose server-only secrets through `VITE_` environment variables.
- Do not send secrets to the browser.
- Do not print secrets in logs.
- Document the production configuration required in Vercel.
- Use a cryptographically secure session secret.
- Implement the bootstrap secret only if the administrator bootstrap workflow requires it, and ensure it cannot be used to create arbitrary public administrators.

The frontend may use a public API base URL if needed, but the default single-deployment architecture should use same-origin `/api` requests.

---

## 11. Vercel Deployment Configuration

Create the required root-level `vercel.json`, package scripts, TypeScript configuration, and build setup.

The configuration must be compatible with the current Vercel platform and supported Node.js runtime.

### Deployment acceptance requirements

- One Git repository.
- One root project directory.
- One Vercel project.
- One public application URL.
- React frontend and Express API deployed together.
- API routes accessible under `/api`.
- Frontend routes support direct navigation and refresh.
- MongoDB Atlas connection works in production.
- Environment variables are configured through Vercel.
- No dependency on a permanently running Express server.
- No reliance on local disk for persistent competition data.
- No requirement to deploy the frontend and backend separately.

Verify the current Vercel configuration format and function entry-point requirements rather than blindly using outdated configuration examples.

Use the simplest reliable configuration that serves the Vite build and API correctly. Do not create conflicting catch-all rewrites that send every request to the backend.

Add an appropriate `.gitignore` covering dependencies, build output, environment files, logs, coverage output, and local editor artifacts.

---

## 12. Local Development

Provide a straightforward development workflow.

The root `package.json` should provide commands equivalent to:

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm test
```

Adapt these scripts to the final architecture.

Ideally, `npm run dev` should start the Vite frontend and local Express development server together using a simple, reliable development setup.

Configure Vite to proxy `/api` requests to the local Express server, or use an equally straightforward same-origin development arrangement.

Ensure that:

- Local development works on Windows.
- Commands work in PowerShell.
- No Unix-only shell assumptions are required.
- MongoDB Atlas can be used without installing MongoDB locally.
- Missing configuration produces a helpful message.
- The README explains how to set up the project from a clean clone.

Do not require Docker for ordinary local development.

---

## 13. Security, Reliability, and Privacy

Implement:

- Request validation.
- Centralized error handling.
- Safe database queries.
- Authentication and authorization middleware.
- Password hashing if local admin credentials are used.
- Secure cookie configuration.
- Login rate limiting.
- Submission rate limiting.
- CSRF protection when applicable.
- Input-length limits.
- Username normalization.
- Duplicate registration protection.
- Duplicate submission protection.
- Safe public response schemas.
- MongoDB connection reuse.
- Appropriate database indexes.
- Competition-state enforcement.
- Safe reset and archive workflows.
- Audit logs for important admin operations.

Do not claim perfect anti-cheat protection.

Do not expose private participant details or admin data on the public leaderboard.

Avoid collecting unnecessary personal information. Do not log passwords, session tokens, access codes, or other secrets.

Make sure a public user cannot promote themselves to administrator, change competition settings, submit arbitrary trusted scores, or invalidate other participants' attempts.

---

## 14. Testing

Add automated tests where practical.

At minimum, verify the following.

### Registration

- Valid registration succeeds.
- Duplicate normalized username is rejected.
- Invalid input is rejected.
- Registration is rejected when closed.
- Concurrent duplicate registrations do not create duplicate participants.

### Typing test

- Attempt starts only when allowed.
- Server records the start time.
- Correct and incorrect characters are evaluated correctly.
- Accuracy calculation handles empty input safely.
- WPM calculation handles elapsed time safely.
- Expired attempts are rejected or finalized according to policy.
- Duplicate submissions do not create duplicate results.
- Attempt limits are enforced server-side.

### Leaderboard

- Only accepted attempts are included.
- Invalidated attempts are excluded.
- Sorting is deterministic.
- Ties follow the configured rules.
- Public responses do not expose private fields.

### Admin security

- Unauthenticated requests cannot access protected endpoints.
- Non-admin users cannot change settings.
- Arbitrary users cannot bootstrap themselves as administrators.
- Invalidating an attempt requires authorization and a reason.
- Important changes are recorded in the audit log.

### Deployment

- Production build succeeds.
- API health endpoint responds correctly.
- Missing database configuration produces a controlled error.
- Nested frontend routes load directly.
- The frontend can call the API through same-origin requests.
- The deployed application does not depend on local files or in-memory state for persistence.

Run the actual checks. Report which tests passed and which remain unverified. Do not fabricate test results.

---

## 15. README and Handover

Write a complete `README.md` covering:

1. Project overview.
2. Technology stack.
3. Architecture.
4. Folder structure.
5. Prerequisites.
6. Installation.
7. Local development.
8. MongoDB Atlas setup.
9. Database connection configuration.
10. Initial administrator setup.
11. Environment variables.
12. Database initialization and seed scripts.
13. Running tests.
14. Production build.
15. Vercel deployment from the repository root.
16. Configuring Vercel environment variables.
17. Verifying the deployed API.
18. Running a two-device competition test.
19. Opening projector mode.
20. Resetting or archiving a competition safely.
21. Troubleshooting common errors.
22. Security limitations and anti-cheat caveats.

Do not put real credentials in the README.

Create a `.env.example` with placeholders, not a real `.env` file containing secrets.

If seed data is provided, make it opt-in and ensure demo participants cannot accidentally appear in the official competition.

---

## 16. Implementation Order

Follow this order and keep the application runnable throughout.

### Phase 1 — Foundation

- Initialize the project.
- Configure React, Vite, TypeScript, Express, Mongoose, and Vercel.
- Create the database connection helper.
- Add environment validation.
- Add API health checks.
- Add centralized error handling.

### Phase 2 — Core competition

- Create Mongoose models and indexes.
- Implement competition state.
- Implement participant registration.
- Implement server-authorized attempts.
- Implement the typing test UI.
- Implement server-side scoring and result persistence.

### Phase 3 — Public displays

- Implement the public leaderboard.
- Implement polling and recovery behavior.
- Implement the projector display.
- Verify updates across two separate sessions.

### Phase 4 — Administration

- Implement administrator authentication.
- Implement the protected admin dashboard.
- Implement competition settings and controls.
- Implement participant and attempt management.
- Implement audit logging.

### Phase 5 — Design and reliability

- Apply the complete visual system.
- Improve responsive layouts.
- Improve accessibility.
- Add loading and error states.
- Optimize database queries.
- Test competition lifecycle transitions.

### Phase 6 — Production readiness

- Run type checking.
- Run tests.
- Run the production build.
- Fix all build and runtime errors.
- Verify the Vercel routing configuration.
- Complete the README.
- Report remaining manual setup requirements.

---

## 17. GitHub Copilot Working Rules

Follow these instructions throughout the implementation:

1. Build actual working functionality, not just UI mockups.
2. Do not stop after creating a project plan.
3. Do not ask for approval after every file. Make sensible engineering decisions and proceed.
4. Ask only when a missing decision genuinely blocks progress or an action could be destructive.
5. Do not delete unrelated files.
6. Do not change Git remotes or push commits without authorization.
7. Do not introduce unnecessary dependencies.
8. Do not add features outside the competition's needs before the core workflow works.
9. Do not use localStorage as the primary database.
10. Do not fake realtime functionality.
11. Do not implement an unsupported persistent Socket.IO server for Vercel.
12. Do not trust browser-calculated scores.
13. Do not expose server secrets in frontend code.
14. Do not leave important buttons or API routes unimplemented.
15. Do not swallow errors silently.
16. Do not claim tests or deployment succeeded unless they actually did.
17. Fix errors you encounter rather than merely documenting them.
18. Keep the architecture understandable for a developer who will maintain it later.
19. Prefer clear, maintainable code over unnecessary abstraction.
20. Document anything that still requires manual setup.

At the end, provide a concise implementation report covering:

- Features completed.
- Project structure.
- Commands executed.
- Build and test results.
- Environment variables required.
- Manual MongoDB Atlas setup.
- Initial admin setup.
- Vercel deployment steps.
- Any remaining limitations.

---

## Final Acceptance Criteria

The project is complete only when the following workflow is supported:

1. An organizer opens the deployed application and configures the competition.
2. A participant opens the public URL on their own device.
3. The participant registers with a unique username.
4. The participant starts and completes the timed typing test.
5. The backend validates the attempt and calculates the authoritative result.
6. MongoDB persists the result.
7. The participant sees their result and current ranking.
8. The public leaderboard updates.
9. The projector display automatically reflects the new ranking.
10. An authorized administrator can manage competition settings and invalidate an attempt with an audit trail.
11. The frontend and API operate from the same Vercel deployment.
12. The complete application can be maintained from one Git repository.

**Start by inspecting the workspace, then implement the entire application from scratch. Prioritize a reliable end-to-end competition workflow and a genuinely working Vercel deployment over unnecessary features or visual gimmicks.**
