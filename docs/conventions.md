# Conventions

The standards for sip-happens. `pnpm lint` enforces the import rules; the rest is by review. Setup, env table and deploy steps are in `README.md`.

## Layout

| Path                  | What goes here                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contract/`           | The only code shared by client and server: `nick.ts` (`nickToEmail`), `schemas.ts` (zod), `domain.ts` (types), `database.ts` (typed `Database`, narrows generated columns). No UI, client or server imports. |
| `src/app/`            | Shell only: `App.tsx` (routes), `providers.tsx` (QueryClient etc.), `Layout.tsx`, `AppHeader.tsx`, `TabBar.tsx`.                                                                                             |
| `src/modules/<area>/` | UI by area: `auth`, `review`, `catalog`, `people`, `invites`, `admin`, `subtypes`.                                                                                                                           |
| `src/shared/`         | Client code used by several modules: `api/`, `lib/`, `config/`, `ui/`, `strings.ts`.                                                                                                                         |
| `server/`             | `handlers/` (pure logic), `ports.ts`, `http.ts`, `env.ts`, `supabase-admin.ts`, `test-utils.ts`.                                                                                                             |
| `api/`                | Thin Web-standard wrappers around `server/handlers/`. Exactly six routes. Do not add more.                                                                                                                   |
| `supabase/`           | `migrations/`, `tests/`. The owner applies them by hand.                                                                                                                                                     |
| `scripts/`            | `bootstrap-admin.ts` (creates the first admin).                                                                                                                                                              |
| `public/`             | PWA and browser icons (`favicon-32.png`, `apple-touch-icon.png`, `icons/icon-*.png`).                                                                                                                        |

Shared code goes to `src/shared/`, or `contract/` when the server needs it too. If two modules need the same thing, it moves there.

## Modules and public API

- Every module has an `index.ts`. It is the module's public API.
- Other modules and `src/app` import a module only through its `index.ts`. Never reach into its internals (`pnpm lint` enforces this).
- A module never imports another module's internals.
- Named exports only. No default exports, pages included.

## Imports

- Use the `package.json` `imports` aliases: `#app/*`, `#modules/*`, `#shared/*`, `#contract/*`, `#server/*`.
- Alias imports always end in `.js`: `#shared/ui/Button.js`. Extensionless imports do not resolve.
- Same-folder imports use `./x.js`.
- No `../` in `src/` (lint error).
- The client never imports `server/`. `contract/` imports nothing from the app or server. `server/`, `api/` and `scripts/` import only `contract/` and `server/`.
- `server/`, `api/` and `scripts/` use `#server/*` and `#contract/*` the same way (verified on a Vercel preview, 2026-10-29).

## Naming and files

- Components: `PascalCase.tsx`, one exported component per file, named like the file.
- Hooks: `useX.ts` (or `.tsx`).
- Other modules: `camelCase.ts` (`reviewForm.ts`, `catalogRows.ts`).
- Tests sit next to the code: `x.test.ts` or `x.test.tsx`.
- `api/` routes: `kebab-case.ts` (`invite-status.ts`). Handlers in `server/handlers/` are `camelCase.ts` (`inviteStatus.ts`).
- Migrations: `NNNN_snake_case.sql`.

## Components

- Advisory limits that trigger a split review: about 200 lines per component file, about 7 `useState` per component.
- Applied even under the limits:
  - Extract a component for a distinct visual block, a repeated block, or a block with its own state.
  - Extract a custom hook for self-contained state logic (draft persistence, hydration, debounce, conflict detection).
  - Move pure logic out of components into tested modules (`reviewForm.ts`, `catalogRows.ts`, `personStats.ts`, ...).
- Derived values are computed, not stored in state.

## Data layer

- Shared fetch-all reads (drinks, subtypes, reviews, profiles) and `queryKeys` live in `src/shared/api/queries.ts`.
- Each module's `queries.ts` holds its mutations and module-only queries.
- No `supabase.*` calls in components, pages or hooks outside `queries.ts` files. Components use the hooks.
- One client for `/api` routes: `callApi` in `src/shared/api/callApi.ts`. No ad-hoc `fetch`.
- The Supabase client is typed with `Database` from `contract/database.ts`. Prefer typed results over `as` casts.
- `contract/database.types.ts` is generated and never edited by hand. Regenerate:
  `pnpm dlx supabase gen types typescript --project-id <ref> --schema public > contract/database.types.ts`
- `contract/database.ts` narrows generated columns (for example `type` to the drink type union). Domain row types in `contract/domain.ts` derive from it via `Row<>`.

## UI primitives and styling

- No repeated raw Tailwind class strings in pages. Use `src/shared/ui`:
  - `Button` (`buttonClass`): variants `primary`, `secondary`, `outline`, `accent`, `danger`, `dangerSoft`, `link`; sizes `sm`, `md`, `lg`.
  - `Input`, `Textarea`, `Select` (`fieldClass`)
  - `Chip` (`chipClass`)
  - `Tag`: tones `neutral`, `danger`, `accent`
  - `cardClass()` (surface block classes, not a component)
  - `PageStatus`, `ErrorText`, `ErrorBanner`, `PageTitle` (`Status.tsx`)
  - `ScoreBadge`
  - icons (`CatalogIcon`, `AddIcon`, `MineIcon`, `PeopleIcon`) and the `cn()` helper
- Error and destructive UI uses `text-red-400`. `ScoreBadge` keeps its own score tones (low scores stay rose).
- A few things are intentionally raw, since they are one-off: score cells 0-10, the catalog count bubble, sort menu, filter toggles, suggestion rows, stage tabs, status dots.
- Tailwind classes are sorted by Prettier (`prettier-plugin-tailwindcss`).

## Strings

- All UI text is Ukrainian. Code, comments and docs are English.
- No inline UI text in components.
- Shared strings (`common`, type and group labels, API and nick errors, nav) live in `src/shared/strings.ts`. Module strings live in `src/modules/<area>/strings.ts`.
- Documented exception: criterion labels stay in `src/shared/config/criteria.ts`, the single source of truth for drink types, criteria and weights.
- No em-dash or en-dash anywhere. Hyphen only.

## Tests

- Vitest, colocated with the code. Included: `src/**/*.test.{ts,tsx}`, `server/**/*.test.ts`, `contract/**/*.test.ts`.
- Pure logic: plain tests in the default `node` environment.
- Hooks: `@testing-library/react` with `// @vitest-environment jsdom` as the first line of the file. No component render tests.
- Server handlers are `(deps, input) => result` with `Ports` mocked (`server/test-utils.ts`). One test file per handler.
- SQL tests live in `supabase/tests/`. Each runs in one transaction and rolls back. Success prints `<name>: all assertions passed`. Run them after every migration change.
- Vitest sets dummy `VITE_SUPABASE_*` values so modules that create the client can be imported. No network is used.

## Server handlers

- Rule: `(deps, input) => HandlerResult`. `input` is one value: the parsed JSON body for body-only routes, otherwise an object of the request parts used (`{ authorization }`, `{ authorization, body }`, `{ token }`). See `server/handlers/common.ts`.
- Shared helpers in `common.ts`: `ok`, `fail` (error code to HTTP status), `parseBearer`, `safeEqual` (constant-time compare).
- Handlers are pure. Supabase access goes through `Ports`. `api/*.ts` only wires `Request` to a handler.
- Do not log request bodies or secrets.

## SQL

- Never edit an existing migration. Every change is a new numbered migration (`0005_...`; `0001` to `0004` exist).
- Write migrations to be re-runnable (`if not exists`, `drop ... if exists`, `create or replace`).
- Add or update a script in `supabase/tests/` for any RLS, grant or trigger change.
- After a schema change, regenerate `contract/database.types.ts` and update `contract/database.ts` if columns need narrowing.
- See `supabase/README.md` for how to apply them.

## Gates

Before handing work over, all must pass:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm lint
pnpm format:check
```

`pnpm format` fixes formatting. Prettier uses defaults plus the Tailwind plugin. Linting is Oxlint (`.oxlintrc.json`); `correctness` and `suspicious` categories are errors.

## Security

- Never read `.env.local` or print any env value. Check presence by variable name only.
- `SUPABASE_SECRET_KEY`, `CRON_SECRET` and `SB_DB_PASSWORD` never get a `VITE_` prefix and never reach the client bundle.
- `SB_DB_PASSWORD` is local CLI only. Never set it on Vercel.
- RLS decides what the browser can do with the publishable key. The secret key is used only in `api/` functions.
- Do not add npm dependencies without asking the owner.
