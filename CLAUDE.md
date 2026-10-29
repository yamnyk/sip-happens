# CLAUDE.md - sip-happens

Friends-only PWA for quick alcohol reviews (wine, port, gin first). Invite-only accounts. Full setup and env table are in `README.md`.

## Stack

Vite, React 19, TypeScript 7, Tailwind v4, react-router, TanStack Query, zod, Supabase (Postgres, Auth, RLS), Vercel Functions, vite-plugin-pwa, idb-keyval, Vitest, Oxlint, Prettier.

## Layout

Full conventions: [`docs/conventions.md`](docs/conventions.md).

- `contract/`: the only code shared by client and server (`nick.ts`, `schemas.ts`, `domain.ts`, `database.ts`). `database.types.ts` is generated, never edit by hand. No UI or client imports.
- `src/app/`: shell only (`App.tsx` routes, `providers.tsx`, `Layout.tsx`, `AppHeader.tsx`, `TabBar.tsx`).
- `src/modules/<area>/` (`auth`, `review`, `catalog`, `people`, `invites`, `admin`, `subtypes`): UI by area. Each has an `index.ts` public API; other modules import only from it.
- `src/shared/`: `api/` (supabase client, fetch-all queries, `callApi`), `lib/`, `config/criteria.ts` (single source of truth for drink types, criteria and weights), `ui/` (primitives), `strings.ts`.
- UI text: `src/shared/strings.ts` and `src/modules/*/strings.ts`. Criterion labels stay in `criteria.ts`.
- Imports: `#app/*`, `#modules/*`, `#shared/*`, `#contract/*`, `#server/*`, always ending in `.js`. Same-folder imports use `./x.js`; no `../` in `src/`. Enforced by `pnpm lint`. `server/`, `api/`, `scripts/` still use relative imports until a Vercel preview proves `#` aliases there (`api/invite-status.ts` is the canary).
- `server/handlers/`: pure handler logic `(deps, input) => result`, unit-tested with mocked ports.
- `api/`: thin Web-standard wrappers around `server/handlers/`. Only six routes exist. Do not add more.
- `supabase/`: migrations `0001` to `0004` (new changes only as new numbered migrations), RLS, triggers, SQL tests. Owner applies them by hand.
- `scripts/bootstrap-admin.ts`: creates the first admin.
- `public/`: PWA and browser icons (`favicon-32.png`, `apple-touch-icon.png`, `icons/icon-*.png`).

## Commands

- Package manager is pnpm.
- `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm preview`
- `pnpm bootstrap-admin` (owner only, interactive)

## Rules

- Never read `.env.local` or print any env value. Check presence by variable name only.
- `SUPABASE_SECRET_KEY`, `CRON_SECRET` and `SB_DB_PASSWORD` never get a `VITE_` prefix and never reach the client bundle.
- `SB_DB_PASSWORD` is local CLI only. Never set it on Vercel.
- Agents never run git. The owner manages git and deploys.
- No em-dash or en-dash anywhere. Hyphen only.
- UI strings are Ukrainian. Code, comments and docs are English.
- Do not add npm dependencies without asking the owner.
- Existing Supabase skills (`skills/`, `.agents/`, `.claude/`, `.augment/`) are read-only.
