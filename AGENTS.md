# Repository Guidelines

This repository is an Astro 6 server-rendered app deployed to Cloudflare Workers, with React islands for interactive UI and Supabase for auth. Use this file as the fast-start guide; see @CLAUDE.md for deeper project-specific detail.

## Hard Rules For Agents

- Keep protected route control centralized in @src/middleware.ts (`PROTECTED_ROUTES`); do not duplicate auth gate logic inside each page.
- Use Astro for page/layout composition and React only for interactive islands (see @src/pages/auth/signin.astro and @src/components/auth/SignInForm.tsx).
- Use the `@/*` alias from @tsconfig.json for app imports; avoid long relative traversals when alias paths are available.
- Build Tailwind class combinations with `cn()` from @src/lib/utils.ts instead of manual string concatenation.
- Do not add Next.js-only directives (for example, `"use client"`) in React components in this repo.

## Build, Lint, And Dev Commands

- `npm install` installs dependencies.
- `npm run dev` runs Astro dev server on the Cloudflare workerd runtime.
- `npm run lint` runs ESLint (type-aware config in @eslint.config.js).
- `npm run lint:fix` applies auto-fixes.
- `npm run build` creates the production SSR build.
- `npm run preview` previews the production build.
- `npm run format` runs Prettier (config in @.prettierrc.json).

## Project Structure And Modules

- App code lives in @src with pages in @src/pages, shared layouts in @src/layouts, auth React islands in @src/components/auth, and server/client helpers in @src/lib.
- Cloudflare worker deployment/runtime config is in @wrangler.jsonc.
- Product/process docs are under @context/foundation.

## Testing And CI Gate

- There is no first-party test suite or `test` script in @package.json right now.
- CI in @.github/workflows/ci.yml runs: `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build` on pushes/PRs to `master`.

## Commit And PR Guidelines

- This repository currently has no commit history on `master` yet, so commit-message convention is not established from `git log`.
- Before opening a PR, ensure local lint and build pass, matching the CI gate.

## Security And Configuration

- Set `SUPABASE_URL` and `SUPABASE_KEY` in local env files (`.env`, `.dev.vars`) and in CI/Cloudflare secrets; do not hardcode credentials.
- Astro env schema for these secrets is declared in @astro.config.mjs.
