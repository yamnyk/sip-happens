# sip-happens: MVP build prompt (paste into plan mode)

## 0. Mission

Build a deploy-ready MVP of **sip-happens**: a mobile-first PWA where a closed circle of friends (tens of users, hundreds of reviews) logs quick reviews of alcohol (mostly wine, port, gin), reads friends' reviews, and sees who likes what.

Deploy target is **Vercel with git auto-deploy**. The owner deploys manually after pushing. You never deploy and never run git. Mention Vercel in the README (env vars, function region, cron).

**Budget:** the whole MVP must fit one Claude Pro 5-hour usage window. Tokens are the constraint, not wall-clock. Few agents, small contexts, no re-reading, no speculative polish. If the budget gets tight, cut by the priority list in section 9.

Your first output is a **plan, not code**. Format is in section 10.

## 1. Non-negotiable rules

1. **Secrets.** Never Read, cat, grep or print `.env.local` or any env value. To check presence, run a script that prints only variable names and booleans. Never ask the owner to paste a value in chat. When a secret is needed, tell the owner the variable name and which file or dashboard to put it in (`.env.local` locally, Vercel Environment Variables in prod). The secret key never gets a `VITE_` prefix and never reaches the client bundle.
2. **Git.** No git commands, ever. Creating a `.gitignore` file is allowed and is the first task.
3. **Existing files are sacred.** Section 2 lists what exists and what to do with it. Never run a scaffolder in place. Never overwrite or delete anything not listed as replaceable. Use `trash` instead of `rm`.
4. **No em-dash or en-dash** in any file, comment, commit text or output. Hyphen only.
5. **No slop.** No placeholder lorem, no fake features, no unrequested abstractions. If something is not in this prompt, do not build it.
6. Owner-facing messages are in Ukrainian, short, no upsells. Code, comments and this plan are in English. App UI strings are Ukrainian, kept in one `src/strings.ts` (no i18n library). This is a default call, easy to flip.

## 2. What already exists (read before scaffolding)

Project root `sip-happens/` is already a git repo with:

- `.git/`: do not touch.
- `.claude/skills`, `.augment/skills`, `skills/`, `.agents/skills`, `skills-lock.json`: installed Supabase skills (`supabase`, `supabase-postgres-best-practices`), mostly symlinks. Do not touch. **The DB/API agent must read both skills before writing SQL or Supabase code.**
- `.env.example`: currently `SB_DB_PASSWORD=`, `VITE_SUPABASE_URL=`, `VITE_SUPABASE_PUBLISHABLE_KEY=`. Keep these three lines and their names, append new ones.
- `.env.local`: holds real values. Do not read, do not edit.
- `utils/supabase.ts`: a `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)` module. **Move it to `src/lib/supabase.ts`**, keep the env var names, add a clear thrown error when either var is missing and add the generated `Database` type. Update imports, trash the empty `utils/` after.
- No `package.json`, no `.gitignore`, no source code yet.

**No `.gitignore` exists and `.env.local` has real keys. Task zero:** create `.gitignore` covering `node_modules`, `dist`, `.vercel`, `.env`, `.env.*` except `!.env.example`, `*.local`, `.DS_Store`, `coverage`. Verify by reading the file back. The owner pushes to GitHub right after this MVP, so this is a security gate.

Scaffold Vite by writing the files by hand (package.json, vite.config.ts, tsconfig*.json, index.html, src/) or by scaffolding into a temp folder and moving files in. Never `create vite` in place.

## 3. Stack (decided)

- Vite + React + TypeScript (strict), SPA. No Next.js.
- Tailwind CSS v4, hand-rolled components, no component library.
- react-router, TanStack Query, zod (shared between client and functions).
- `vite-plugin-pwa` (installable, online-only), `idb-keyval` for drafts.
- Supabase: Postgres + Auth + RLS. Client talks to the DB directly under RLS. Only the cases in section 6 need server code.
- Server code: Vercel Functions in `/api` (Web-standard `export function GET/POST(request: Request)` handlers; verify the current Vercel syntax in the docs once, briefly). Handler logic lives in pure functions that take a Supabase client and are unit-tested with mocks.
- `vercel.json`: SPA rewrite for everything except `/api/*`, and one daily cron to `/api/keepalive`.
- Vitest for pure logic only. No Playwright suite. A manual smoke checklist goes in the README.
- UI: dark default, big tap targets (min 44px), safe-area insets, one-hand phone use in dim light. The frontend agent may use the `frontend-design` skill once, capped.

## 4. Domain

### 4.1 Drink types (one-tap chips)

`red`, `white`, `rose`, `sparkling`, `port`, `gin`, `other`. Group `wine` = red, white, rose, sparkling (used for "all wine" filter and shared criteria).

### 4.2 Criteria and weights

Single source of truth: `src/config/criteria.ts`. Scale is integer 0-10. Weights are percentages summing to 100 per group, shown under each criterion name in the UI (for example "Смак і баланс · 35%"). A Vitest asserts weights sum to 100 for every group.

| Group | Criteria (key: label, weight) |
|---|---|
| wine | aroma: Аромат 20 · palate: Смак і баланс 35 · finish: Післясмак 20 · again: Випив би ще 25 |
| port | aroma: Аромат 20 · palate: Смак (солодкість проти спирту) 30 · finish: Післясмак 25 · again: Випив би ще 25 |
| gin | botanicals: Ботаніка в ароматі 25 · clean: Чистий смак 25 · mixing: З тоніком чи в коктейлі 25 · smooth: М'якість і післясмак 25 |
| other | aroma: Аромат 25 · palate: Смак 35 · finish: Післясмак 20 · again: Випив би ще 20 |

`src/lib/score.ts`: `computeTotal(group, scores)` = sum(weight x score) / sum(weights), range 0-10, one decimal. Only raw per-criterion scores are stored; totals are always computed in TypeScript, so config changes propagate. Author score for a drink = final total if all final scores are filled, else first-impression total. Drink average = mean of author scores. At this data size, compute averages client-side.

### 4.3 Review rules

- One review per (drink, author). It has two optional stages: **first impression** and **final**.
- First impression: all four scores required, note optional.
- Final: scores optional, **note required** (min 30 chars, so "ok" does not pass; meaningfulness is on the humans).
- A review is valid when at least one stage is valid. If a stage has any input but is invalid, saving is blocked with an inline error on that stage unless the user clears it. Never silently drop input.
- If the author writes only a final and no first impression, the final's scores become required (every review needs at least one score).
- A final with incomplete scores contributes no score; the author score then comes from the first impression, and the final note is still shown.
- The final stage can be added later to an existing review (from "My reviews").
- Authors can edit and delete their own reviews.

### 4.4 Drafts

Per-stage drafts in IndexedDB via `idb-keyval`, key `draft:{userId}:{drinkId or normalizedName+type}:{stage}`. Cleared on successful save. No localStorage.

### 4.5 Drinks

Free-text name with autocomplete over existing drinks (client-side filter over the loaded list, accent- and case-insensitive). Picking an existing drink prefills and locks its type; a new name creates a drink. The drink creator or an admin can edit its name and type. Merging duplicates is stretch.

## 5. Auth and invites (decided, do not redesign)

- Login is **nickname + password**, no email, no email provider usage. Supabase Auth needs an email, so each user gets a synthetic one: `sha256(NFC(lowercase(nick))).slice(0,32)` hex `@sip.invalid` (agent: confirm this domain passes Supabase validation early; if not, pick another reserved-style domain). One shared `nickToEmail()` using Web Crypto, used by both client and server. Any unicode nick, 3-24 chars, unique case-insensitively, original casing kept for display.
- Public signup in Supabase is disabled (owner already did this) and email confirmation is off. Accounts are created only by `/api/register` using the secret key and `admin.createUser` with `email_confirm: true`.
- **Invite links:** any logged-in user generates a new link per invite. Single-use, expires in 7 days (enforced in the DB, not by the client). No cap. Each link records creator, created time, used-by, used time. Format `/join/{token}`.
- `/join/{token}` shows "Тебе запросив {nick}" if valid, then nick and password form. Expired or used tokens show a clear dead-link message telling the person to ask their inviter for a new link.
- Each profile stores `invited_by` (null for the first admin). The invite tree has one root. The admin sees the tree with timestamps.
- **Forgot password:** public form (nick + nick of whoever invited you) creates a reset request. The admin sees a warning icon on that user row, presses resolve, and the system generates a 7-day single-use **reset link** on the same links mechanism. The admin sends it manually. `/reset/{token}` sets a new password via `/api/reset-complete`. The public form is rate limited (pending requests per nick and a global per-hour cap, enforced in the DB) so nobody can flood the admin panel.
- **Admin** is a flag on `profiles`. It must be impossible for a client to set it (column-level privileges or a guarding trigger, plus a test). The first admin is created by `scripts/bootstrap-admin.ts`, run by the owner, which prompts for nick and password interactively with hidden input, so the password never lands in shell history.
- Admin actions that need the secret key (delete user, ban/unban) go through a server function that first checks the caller is admin. Deleting a user cascades their reviews and sets `invited_by` to null on their invitees.

## 6. Server functions (the only backend)

| Route | Purpose |
|---|---|
| `GET /api/invite-status?token=` | valid or not, plus inviter nick, for the join page |
| `POST /api/register` | validate token (exists, unused, not expired), create user and profile, mark link used, atomically |
| `POST /api/reset-request` | public, rate limited, creates a request row |
| `POST /api/reset-complete` | validate reset token, set new password via admin API, mark link used |
| `POST /api/admin-user` | admin only: delete or ban a user |
| `GET /api/keepalive` | daily cron: requires `Authorization: Bearer ${CRON_SECRET}`, performs a real DB read so the Supabase free project does not pause |

Server env: `VITE_SUPABASE_URL` (reuse, same value), `SUPABASE_SECRET_KEY`, `CRON_SECRET`. `SB_DB_PASSWORD` is for local CLI use only and is never set on Vercel. Anything not listed is an unneeded server route; do not add it.

Link create (invite, and reset for admins) happens by direct client insert under RLS with DB defaults for token and expiry, not through a function.

## 7. Data and security (DB agent owns)

Migrations in `supabase/migrations/`, written for the owner to apply (Supabase SQL editor or `supabase db push`, owner's choice; give the exact steps). Propose the final schema in the plan; expected tables: `profiles` (id, nick, nick_normalized unique, is_admin, disabled, invited_by, created_at), `links` (token, kind invite|reset, created_by, target_user_id nullable, created_at, expires_at, used_by, used_at), `drinks` (id, name, name_normalized, type, created_by, created_at), `reviews` (id, drink_id, author_id, unique(drink_id, author_id), first_scores jsonb, first_note, final_scores jsonb, final_note, created_at, updated_at, DB checks mirroring section 4.3), `reset_requests`.

RLS rules, all tables:

- `anon` has no access to anything.
- Authenticated users read profiles, drinks, reviews. Reviews: insert, update, delete only own; admin can delete any. Drinks: creator or admin can update or delete.
- Links: users insert and read only their own invite links; reset links admin only. Token validation for the public pages goes only through the service-role functions.
- `reset_requests`: written only by the function, read and updated by admin only.
- Follow the installed `supabase-postgres-best-practices` skill: indexes on every FK and RLS column, `(select auth.uid())` pattern in policies.
- `src/types/database.types.ts`: give the owner the one `supabase gen types` command to run. If the owner would rather skip, hand-write minimal types.

## 8. Screens

Mobile first, bottom tab bar: Каталог · Додати · Мої · Люди.

1. **Каталог:** type filter chips (all, wine, each wine color, port, gin, other), drink cards with name, type, average, review count, sort by best or newest.
2. **Сторінка напою:** average on top; friends' reviews below with nick, author score, per-criterion scores, both notes. Make the spread obvious (for example a compact row of every friend's score).
3. **Додати/Редагувати ревʼю:** name with autocomplete, type chips, two stage tabs, live weighted total, weights visible under criterion names, drafts, a single save action.
4. **Мої ревʼю:** own list, open to edit or add the final stage.
5. **Людина (by nick):** their reviews and their average score per type, so "this person hates gin, loves port" reads at a glance.
6. **Інвайти:** generate link, copy to clipboard, list my invites with state (active, used by, expired).
7. **Адмінка (admin only):** users table with warning icon for pending reset requests and a resolve action that creates a reset link, delete or ban, invite tree with timestamps.

Stretch, only if budget remains: taste similarity between two users (mean score difference over drinks both reviewed), drink merge.

## 9. Priority and cut line

- **P0:** `.gitignore`, scaffold, schema and RLS, login, register by invite, invite generation, review form with drafts, catalog with filters, drink page, my reviews, PWA manifest.
- **P1:** person page, admin panel (users, tree, reset warnings), reset flow, keepalive cron, bootstrap-admin script.
- **P2:** stretch items.

Cut from the bottom if tokens run out. P0 plus a clean README is a valid MVP.

## 10. Multi-agent execution

Constraints: parallel agents do not save tokens, only time, and every agent starts cold. Max three concurrent implementers. Give each agent a tight brief containing only its inputs: the relevant sections of this prompt, the contract files, and the paths it owns. Agents own disjoint files, never edit outside their own paths, and report in 5 lines or less.

| Phase | Who | Model | Work |
|---|---|---|---|
| 0 | scaffold agent | Haiku 5.5 | `.gitignore`, package.json, configs, Tailwind, PWA plugin, `vercel.json`, move supabase client, extend `.env.example`, install deps, typecheck green on an empty app |
| 1 | main | Sonnet 5.5 | contract: `src/config/criteria.ts`, `src/lib/score.ts` and `nick.ts` with Vitest, zod schemas, domain types, app shell with router, session provider, route stubs, `strings.ts` |
| 2A | db-api agent | Sonnet 5.5 | migrations, RLS, `/api/*`, bootstrap script, handler unit tests. Reads the two Supabase skills first |
| 2B | review-flow agent | Sonnet 5.5 | login, join, reset pages, add/edit review form, drafts, my reviews, invites page |
| 2C | browse-admin agent | Sonnet 5.5 | catalog, drink page, person page, admin panel |
| 3 | main | Sonnet 5.5 | integrate, typecheck, lint, tests, build, fix. Then **one batched list of manual owner steps** (apply migrations, secret key into `.env.local`, run bootstrap-admin, Vercel env vars and region). Do not pause earlier for these |
| 4 | security reviewer | Opus 5.5, once | RLS, admin flag, register and reset functions, token handling, secret leakage into the client bundle (grep `dist` for secret names), CORS, rate limits |
| 5 | docs agent | Haiku 5.5 | README (run, env table, Vercel setup, cron note, smoke checklist), project `CLAUDE.md`, PWA icons (SVG source plus generated PNGs), add a row for this project in `../CLAUDE.md`'s layout table |

Between phases the main agent prints at most 10 lines and keeps going. It stops only for a missing secret, a required owner action, or a decision not covered here.

Token hygiene: no full-file rereads after edits, no exploratory web browsing beyond the one Vercel syntax check, no repeating this prompt to subagents wholesale, no screenshots or browser automation.

## 11. Definition of done

- `npm run typecheck`, `npm run test`, `npm run build` pass.
- `dist` contains no secret key or `SB_DB_PASSWORD`.
- `.env.example` lists every variable with no values, and the README says where each one is set.
- Owner can: apply migrations, bootstrap the admin, log in, generate an invite, register a second user through it, post a review, see it in the catalog, install the PWA.
- Nothing deployed, nothing committed.

## 12. Non-goals

Email of any kind, OAuth, social features beyond reading friends' reviews, photos, barcodes or external drink databases, comments or likes, notifications, offline sync queue, i18n framework, analytics, a custom backend server, E2E test suite, public pages, any monetisation.
