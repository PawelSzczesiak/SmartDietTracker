# Copilot Instructions

## Commands

- `npm install` - install dependencies
- `npm run dev` - start the Astro dev server on the Cloudflare workerd runtime
- `npm run typecheck` - run Astro type checking
- `npm run build` - production SSR build with `@astrojs/cloudflare`
- `npm run preview` - preview the production build
- `npm run lint` - run ESLint with type-aware rules
- `npm run lint:fix` - auto-fix ESLint issues
- `npm run format` - run Prettier with Astro and Tailwind plugins
- `npx astro sync` - regenerate Astro types; CI runs this before typecheck/test/lint/build

## Tests

There is a first-party Vitest suite in the repository. Use `npm run test:run` for a single pass, `npm run test` for watch mode, and `npm run typecheck` for Astro type checking.

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

## 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)

**For E2E tests, use the `/10x-e2e` skill.** It is the single source of truth
for the workflow — risk → seed test + rules → generate → review against the five
anti-patterns → re-prompt → verify. The skill's `references/` carry the full
rules, anti-patterns, seed pattern, and prompt-template.

A few hard rules that hold even before you invoke the skill:

- **Locators:** `getByRole` / `getByLabel` / `getByText` first; `getByTestId`
  only when accessibility attributes are ambiguous. Never CSS selectors, XPath,
  or DOM structure.
- **Never `page.waitForTimeout()`.** Wait for state: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Test independence + cleanup.** Each test runs standalone — its own setup,
  action, assertion, and cleanup; unique ids (timestamp suffix) so parallel runs
  and re-runs don't collide.

Two boundaries to keep straight:

- **DOM (snapshot) is the default.** Vision (`--caps=vision`) is a supplement for
  visual-only risks (layout, z-index, animation); for pixel regression prefer
  deterministic tools (`toMatchSnapshot`, Argos, Lost Pixel). VLM model
  selection/cost is a debugging topic (Lesson 5), not testing.
- **Healer helps on selectors, harms on logic.** A changed selector → healer
  re-finds it (route through PR review). A changed business behavior → healer
  masks the bug; that failing-test-to-fix case is Lesson 5.

<!-- END @przeprogramowani/10x-cli -->
