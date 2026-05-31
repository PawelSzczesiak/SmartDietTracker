# Copilot Instructions

## Commands

- `npm install` - install dependencies
- `npm run dev` - start the Astro dev server on the Cloudflare workerd runtime
- `npm run build` - production SSR build with `@astrojs/cloudflare`
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint with type-aware rules
- `npm run lint:fix` - auto-fix ESLint issues
- `npm run format` - run Prettier with Astro and Tailwind plugins
- `npx astro sync` - regenerate Astro types; CI runs this before lint/build

## Tests

There is currently no `test` script and no `*.test.*` / `*.spec.*` test suite in the repository, so there is no supported "single test" command yet.

## Architecture

This is an Astro 6 server-rendered app deployed to Cloudflare Workers. `astro.config.mjs` uses `output: "server"` with the Cloudflare adapter, so pages render on the server by default instead of being prebuilt.

The app mixes Astro pages with small React islands. Page shells and layouts stay in `.astro` files, while interactive auth forms live in React components under `src/components/auth/` and are mounted with `client:load` from `src/pages/auth/*.astro`.

Authentication is wired end-to-end through Supabase SSR:

- `src/lib/supabase.ts` creates the server client from request headers and Astro cookies
- `src/middleware.ts` runs on every request, fetches the current user, stores it in `context.locals.user`, and redirects unauthenticated requests for paths listed in `PROTECTED_ROUTES`
- `src/pages/api/auth/signin.ts`, `signup.ts`, and `signout.ts` handle form posts and redirect back to Astro pages
- `src/pages/dashboard.astro` and `src/components/Topbar.astro` read `Astro.locals.user` instead of querying auth again

Global page framing lives in `src/layouts/Layout.astro`. It imports `src/styles/global.css` and renders configuration banners from `src/lib/config-status.ts`, so missing Supabase env vars surface globally rather than failing silently.

## Key conventions

- Use the `@/*` path alias from `tsconfig.json` for app imports.
- Prefer Astro components for layouts, pages, and static UI. Use React only for interactive islands; do not add Next.js-style directives.
- Auth forms post to `/api/auth/...` endpoints with standard HTML forms. Server-side auth errors are passed back via redirect query params and then forwarded into the React island as `serverError`.
- `createClient()` can return `null` when `SUPABASE_URL` or `SUPABASE_KEY` is missing. Callers are expected to handle that explicitly.
- Protected pages are controlled centrally in `src/middleware.ts` by editing `PROTECTED_ROUTES`, not by duplicating auth checks in each page.
- Use `cn()` from `src/lib/utils.ts` for conditional Tailwind class composition instead of manual string concatenation.
- Shared primitive UI follows the shadcn/ui setup in `src/components/ui/` with the `"new-york"` style from `components.json`.
- If database work is added later, keep Supabase migrations in `supabase/migrations/` with `YYYYMMDDHHmmss_description.sql` names and enable RLS policies for new tables.
- Pre-commit formatting is already wired through `lint-staged`: ESLint fixes `*.{ts,tsx,astro}` and Prettier formats `*.{json,css,md}`.
- Formatting currently expects LF line endings. On CRLF checkouts, `npm run lint` reports `prettier/prettier` "Delete CR" errors across many files.

## Environment and deployment

- Use Node.js `v22.14.0` from `.nvmrc`.
- Local auth needs `SUPABASE_URL` and `SUPABASE_KEY` in `.env` and `.dev.vars`.
- Local Supabase is started with `npx supabase start`; the app currently relies only on Supabase Auth's built-in `auth.users` table.
- CI runs on pushes and pull requests to `master` and executes `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build`.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 5

Scale the single-change cycle into parallel work with **worktrees, goal-directed delegation, and multi-session orchestration**:

```
worktree per change -> /goal or your AI coding assistant -p -> PR -> review -> merge
```

The lesson focus is safe throughput: isolated contexts, choosing the right execution mode, and capping parallelism at review capacity.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code isolation** | |
| `git worktree add` | You need a separate working directory for a parallel change. One change per worktree, one fresh agent context per worktree. |
| **Complex changes** | |
| `/10x-implement <change-id> phase <n>` | The change has multiple phases, needs manual gates, or benefits from interactive decision-making during execution. |
| **Simple changes** | |
| `/goal` | You have a clear, bounded task and want goal-directed delegation. The agent works autonomously toward the stated goal with a stop condition. |
| `your AI coding assistant -p` | You want headless execution for a well-defined task. The Ralph Wiggum loop (run, check, retry) is the universal autonomous pattern. |
| **Multi-session orchestration** | |
| Superset / Conductor / Antigravity / VS Code Agent View | You are running multiple agent sessions in parallel and need visibility, coordination, or session management across them. |

### Parallel work rules

- One change per worktree or isolated workspace. One fresh agent context per change.
- Choose interactive `/10x-implement` for complex changes, `/goal` or `your AI coding assistant -p` for simple ones.
- Parallelism is capped by review capacity. More agents without review means more unreviewed code, not higher throughput.
- The quality pain from faster shipping is intentional — it bridges into Module 3 testing gates.

### Lesson boundaries

- Do not reteach interactive `/10x-implement` or `/10x-impl-review`; those are Lessons 2 and 3.
- Do not introduce testing strategy here. The quality pain is the motivation for Module 3.
- Worktrees are a mechanism for isolation, not the topic of a full git tutorial.

### Paths used by this lesson

- `context/changes/<change-id>/` - active change folder
- `context/changes/<change-id>/plan.md` - implementation input for any execution mode

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
