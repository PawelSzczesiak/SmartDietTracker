# Deployment runbook

## Scope

This runbook covers the current production scope only:

- Cloudflare Workers deployment with Wrangler `production` environment
- Supabase auth configuration
- rollback and secret rotation for the current app

OpenRouter is intentionally out of scope for this runbook and should be added only when that integration is introduced.

## Required runtime contract

- Worker name: `smart-diet-tracker`
- Deploy command: `npx wrangler deploy --env production`
- Runtime secrets:
  - `SUPABASE_URL`
  - `SUPABASE_KEY`

## First deploy checklist

- [ ] Confirm you are deploying to the paid Cloudflare Workers account intended for production.
- [ ] Run `npx wrangler login` if this machine is not already authenticated.
- [ ] Confirm local env files are not being used as production secrets.
- [ ] Set production secrets:
  - [ ] `npx wrangler secret put SUPABASE_URL --env production`
  - [ ] `npx wrangler secret put SUPABASE_KEY --env production`
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Deploy manually with `npx wrangler deploy --env production`.
- [ ] Start log tail in another terminal with `npx wrangler tail smart-diet-tracker`.
- [ ] Run the post-deploy verification checklist in this file before enabling Cloudflare Git auto-deploys.

## Production release checklist

- [ ] Confirm the change is meant for production and has already passed CI.
- [ ] Confirm production secrets are present in the Cloudflare `production` environment.
- [ ] Run `npm run build`.
- [ ] Deploy with `npx wrangler deploy --env production`.
- [ ] Watch logs with `npx wrangler tail smart-diet-tracker`.
- [ ] Run the post-deploy verification checklist.
- [ ] If this is the first healthy production release, enable Cloudflare-side Git auto-deploys for `master` only after verification completes.

## Rollback checklist

- [ ] Identify the failed deployment in the Cloudflare dashboard or Wrangler deployment history.
- [ ] Roll back with one of:
  - [ ] `npx wrangler rollback --env production`
  - [ ] `npx wrangler rollback <version-id> --env production`
- [ ] Restart `npx wrangler tail smart-diet-tracker` and confirm traffic is hitting the rolled-back version.
- [ ] Re-run the verification checklist after rollback.
- [ ] Record what changed outside the Worker runtime.

### Rollback limitation

Rollback only changes the Worker version. It does **not** roll back:

- Supabase data
- Supabase auth provider settings
- Supabase redirect URLs
- any future third-party configuration added outside Cloudflare Workers

## Secret rotation checklist

- [ ] Decide whether rotation is planned or incident-driven.
- [ ] Update the source value in the external provider first if required.
- [ ] Rotate the Worker secret:
  - [ ] `npx wrangler secret put SUPABASE_URL --env production` if the project URL changed
  - [ ] `npx wrangler secret put SUPABASE_KEY --env production`
- [ ] Deploy again with `npx wrangler deploy --env production`.
- [ ] Verify auth flows and runtime logs immediately after rotation.
- [ ] If CI also needs the updated value, rotate the matching GitHub Actions secret.

## Post-deploy verification checklist

- [ ] Homepage loads successfully.
- [ ] `/auth/signin` loads and submits without an unexpected runtime error.
- [ ] `/auth/signup` loads and submits without an unexpected runtime error.
- [ ] Protected route redirect logic works for `/dashboard`.
- [ ] Authenticated access to `/dashboard` works with a valid session.
- [ ] `npx wrangler tail smart-diet-tracker` shows readable runtime logs.
- [ ] No repeated `auth-config` or `supabase` log events appear for the healthy path.

## Troubleshooting

### Supabase auth misconfiguration

Symptoms:

- sign-in or sign-up redirects back with config or auth errors
- protected routes always bounce to `/auth/signin`
- logs show `supabase.config_missing`, `auth.signin.config_missing`, or `auth.signup.config_missing`

Checks:

- [ ] Confirm `SUPABASE_URL` exists in the Cloudflare `production` environment.
- [ ] Confirm `SUPABASE_KEY` exists in the Cloudflare `production` environment.
- [ ] Confirm the values point to the intended Supabase project.
- [ ] Confirm Supabase Auth redirect/site URL settings include the deployed Worker domain.
- [ ] Confirm the anon key has not been rotated without updating Cloudflare and GitHub secrets.
- [ ] Check Wrangler logs first, then Supabase auth logs if the Worker logs show upstream failures.

### Worker env drift between local and production

Symptoms:

- local `npm run dev` works but production fails
- local auth works against one Supabase project while production uses another
- build succeeds but runtime behavior differs only after deploy

Checks:

- [ ] Compare `.env` and `.dev.vars` usage against actual Cloudflare `production` secrets.
- [ ] Confirm production was deployed with `--env production`.
- [ ] Confirm Supabase redirect URLs match the local and production domains separately.
- [ ] Compare recent secret rotations with the currently deployed Worker version.
- [ ] Inspect Worker-specific runtime logs before changing application code.

## Cloudflare Git auto-deploy guardrail

- [ ] Do not enable automatic production branch deploys until the first manual production deployment is healthy.
- [ ] If auto-deploys must be paused, use Cloudflare **Settings** > **Builds** for the Worker project.
- [ ] If repository access must be changed, use **Git Repository** > **Manage** in Cloudflare.
