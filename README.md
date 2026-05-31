# 10x Astro Starter

![](./public/template.png)

A modern, opinionated starter template for building fast, accessible web applications.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables — see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .dev.vars.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Run Prettier

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** — they are never exposed to the client.

### Environment contract

| Context                       | File / secret store                       | Required values                |
| ----------------------------- | ----------------------------------------- | ------------------------------ |
| Local Astro tooling           | `.env`                                    | `SUPABASE_URL`, `SUPABASE_KEY` |
| Local Cloudflare runtime      | `.dev.vars`                               | `SUPABASE_URL`, `SUPABASE_KEY` |
| Cloudflare Workers production | `wrangler secret put` / dashboard secrets | `SUPABASE_URL`, `SUPABASE_KEY` |
| GitHub Actions CI             | repository secrets                        | `SUPABASE_URL`, `SUPABASE_KEY` |

Optional parser configuration for calorie extraction:

| Context                       | File / secret store                       | Optional values                          |
| ----------------------------- | ----------------------------------------- | ---------------------------------------- |
| Local Astro tooling           | `.env`                                    | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| Local Cloudflare runtime      | `.dev.vars`                               | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |
| Cloudflare Workers production | `wrangler secret put` / dashboard secrets | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` |

When OpenRouter is not configured, meal entries are still saved, but nutrition stays unavailable until the parser is configured or the user retries later.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

Create your `.dev.vars` file for local Worker runtime as well:

```bash
cp .dev.vars.example .dev.vars
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

This project uses custom tables (`profiles`, `meals`) in addition to Supabase Auth. Apply all migrations before first use:

```bash
npx supabase migration up
```

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in form                                             |
| `/auth/signup`        | Email/password sign-up form                                             |
| `/auth/confirm-email` | Post-signup "check your inbox" page                                     |
| `/dashboard`          | Example protected page (redirects to `/auth/signin` if unauthenticated) |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

## Deployment

This project deploys to [Cloudflare Workers](https://workers.cloudflare.com/).

### Environment workflow

- **Local development** uses `.env` for Astro tooling and `.dev.vars` for the Cloudflare runtime via `npm run dev`.
- **Production deployment** uses the Wrangler `production` environment and Cloudflare Worker secrets.
- The required runtime secrets are `SUPABASE_URL` and `SUPABASE_KEY`. `OPENROUTER_API_KEY` (and optionally `OPENROUTER_MODEL`) are required for meal nutrition parsing; without them, meals are saved without calorie data.
- The Astro Cloudflare adapter auto-provisions the `SESSION` KV binding and `IMAGES` binding during deploy, so they do not need manual entries in `wrangler.jsonc` unless you intentionally customize them later.

### Local development

1. Create `.env` and `.dev.vars` from the example files.

2. Start the app:

```bash
npm run dev
```

### Production deployment

1. Add required secrets to the Wrangler `production` environment:

```bash
npx wrangler secret put SUPABASE_URL --env production
npx wrangler secret put SUPABASE_KEY --env production
```

2. Build the project:

```bash
npm run build
```

3. Deploy with Wrangler:

```bash
npx wrangler deploy --env production
```

4. Tail production logs when needed:

```bash
npx wrangler tail smart-diet-tracker
```

If local and production point at different Supabase projects, make sure both projects have matching auth redirect settings for the app domains they serve.

### Release policy

1. **First production release is manual.** Use `npx wrangler deploy --env production` and verify auth, redirects, and runtime logs before enabling any Git-driven production automation.
2. **GitHub Actions stays CI-only.** The repository workflow is intentionally limited to `npm ci`, `npx astro sync`, `npm run lint`, and `npm run build`; it does not deploy.
3. **After the first release is verified, enable Cloudflare-side auto-deploys for `master`.**
   - Go to **Workers & Pages** in the Cloudflare dashboard.
   - Select the `smart-diet-tracker` Worker.
   - Open **Settings** > **Builds**.
   - Connect the GitHub repository under **Git Repository**.
   - Set `master` as the production branch and enable production branch deployments only after the manual release is confirmed healthy.
4. **If you need to pause automatic deploys later, do it in Cloudflare, not in GitHub Actions.**
   - Start in **Settings** > **Builds** for the Worker project.
   - Use the Git/build controls there to pause production branch deployments before re-enabling them.
   - If repository access itself needs to be changed or revoked, use **Git Repository** > **Manage** in Cloudflare.

For operational deploy, rollback, and secret-rotation steps, use `context/changes/deployment/deployment-runbook.md`.

## CI

GitHub Actions runs lint + build on every push and PR to `master`. Configure `SUPABASE_URL` and `SUPABASE_KEY` as repository secrets in GitHub for the build step. This workflow is verification-only and intentionally does not publish to Cloudflare.

## License

MIT
