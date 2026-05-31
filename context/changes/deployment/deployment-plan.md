# Cloudflare integration and deployment plan

## Goal

Prepare this Astro 6 SSR app for Cloudflare Workers deployment using the recorded infrastructure decision in `context/foundation/infrastructure.md`, while reconciling the current tech-stack handoff in `context/foundation/tech-stack.md`.

- Supabase for auth/data

OpenRouter configuration is intentionally deferred for a later change.

The plan assumes implementation will follow only after approval.

## Target decision verified

- [x] **Cloudflare Workers** is the correct deployment target for this repo.
- [x] **Cloudflare Pages** is not the right primary target for this plan.

Why:

- The repo is Astro 6 SSR with `@astrojs/cloudflare`.
- Current Astro Cloudflare adapter guidance targets **Workers** for SSR.
- `wrangler.jsonc` already points to `@astrojs/cloudflare/entrypoints/server`, which is a Worker entrypoint.
- The stale `cloudflare-pages` hint in `tech-stack.md` was corrected in Phase 0 to `cloudflare-workers`.

## Phase tracker

- [x] Phase 0 — Audit baseline and remove immediate blockers
- [x] Phase 1 — Align deployment contract and environment model
- [x] Phase 2 — Harden current external integration surfaces
- [x] Phase 3 — Harden Wrangler environments and deployment workflows
- [x] Phase 4 — Wire CI and Cloudflare-side deployment paths
- [x] Phase 5 — Add operational support, rollback, and edge-case runbooks
- [x] Phase 6 — Validate locally and in production

---

## Phase 0 — Audit baseline and remove immediate blockers

- [x] `npx astro sync` passes.
- [x] `npm run build` passes.
- [x] `npm run lint` currently fails on repo-wide CRLF/LF drift.
- [x] `.env.example` no longer contains live Supabase values.
- [x] The stale `deployment_target` handoff was corrected from `cloudflare-pages` to `cloudflare-workers`.

## Phase 1 — Align deployment contract and environment model

**Outcome:** the repo's config and docs consistently describe a Cloudflare Workers deployment, not Pages, and the runtime env contract is explicit.

### Planned changes

- [x] Update deployment-facing docs/config references that still imply Pages instead of Workers.
- [x] Correct the stale `deployment_target: cloudflare-pages` handoff so repository docs and runtime config consistently say Workers.
- [x] Keep the Astro server env schema aligned with what is actually in scope for this deploy.
- [x] Extend local env templates so the expected secret contract is visible before deployment.
- [x] Replace example env values with safe placeholders where needed.

### Files likely involved

- `astro.config.mjs`
- `.env.example`
- `context/foundation/infrastructure.md` only if deployment wording needs tightening
- possibly `README` / agent instructions if stale Pages wording appears elsewhere

### Edge-case support steps

- [x] If any existing instruction still says "Pages", update commands and terminology together so deploy/runbook drift does not persist.
- [x] Keep deferred OpenRouter config out of this change so production setup stays narrowly scoped.

---

## Phase 2 — Harden current external integration surfaces

**Outcome:** the current external service integration is compatible with Workers and resilient to likely auth/config failure modes.

### Planned changes

- [x] Audit current Supabase server usage to confirm all auth paths work in Workers with cookie-based SSR.
- [x] Add minimal request correlation/log context so runtime logs can distinguish:
  - [x] app errors
  - [x] Supabase failures
  - [x] auth/config failures
- [x] Confirm the app degrades safely when Supabase is not configured.

### Files likely involved

- `src/lib/supabase.ts`
- `src/lib/config-status.ts`
- `src/middleware.ts`
- auth API routes under `src/pages/api/auth/`

### Edge-case support steps

- [x] If Supabase is missing or invalid, keep the public app shell working and fail auth routes clearly.
- [ ] If deployed cookie behavior differs from local, verify Supabase site URL / redirect URL settings before changing middleware logic.
- [x] Keep OpenRouter follow-up work separate so deferred AI integration does not block deployment.

---

## Phase 3 — Harden Wrangler environments and deployment workflows

**Outcome:** the repo can deploy predictably to local and production environments with low ambiguity.

### Planned changes

- [x] Update `wrangler.jsonc` with the real Worker name and environment structure.
- [x] Keep the environment model intentionally minimal:
  - [x] local development
  - [x] production deployment
- [x] Document which secrets are required per environment:
  - [x] `SUPABASE_URL`
  - [x] `SUPABASE_KEY`
- [x] Confirm whether any non-secret vars should live in config rather than as secrets.
- [x] Add deployment commands for each environment to docs/runbook.

### Files likely involved

- `wrangler.jsonc`
- deployment docs/runbook file to be created or updated in repo docs/context

### Edge-case support steps

- [x] If local and production use different Supabase projects, document cookie/session separation and redirect URL differences explicitly.
- [ ] If the app later needs custom domains, keep them out of the first deployment scope but note where DNS and route setup will happen.
- [ ] If `nodejs_compat` proves unnecessary after implementation, verify before removing it; do not assume it is safe to drop.

---

## Phase 4 — Wire CI and Cloudflare-side deployment paths

**Outcome:** CI stays focused on verification, while release automation is configured on the Cloudflare side without mixing local-only and production-only assumptions.

### Planned changes

- [x] Review `.github/workflows/ci.yml` against the final env contract.
- [x] Implement deployment policy:
  - [x] first production deploy is manual
  - [x] subsequent pushes to `master` auto-deploy from Cloudflare-side integration
- [x] Keep GitHub Actions focused on CI checks unless there is a clear need for deploy-time automation there.
- [x] Configure or document the Cloudflare-side repository/deploy hookup that watches `master`.
- [x] Keep the first production deploy human-approved before enabling automatic releases from `master`.

### Files likely involved

- `.github/workflows/ci.yml`
- repo/environment secret documentation
- Cloudflare-side deployment configuration/runbook notes

### Edge-case support steps

- [x] If build checks accidentally depend on live external integrations, refactor to avoid making CI flaky on provider outages.
- [x] If Cloudflare-side auto-deploy is enabled before the manual production release is verified, document how to pause or defer it until the first deployment is complete.

---

## Phase 5 — Add operational support, rollback, and edge-case runbooks

**Outcome:** the first on-call-quality guidance exists before deployment, including Supabase and Worker troubleshooting.

### Planned changes

- [x] Create or update a deployment runbook with checkbox-driven steps for:
  - [x] first deploy
  - [x] production release
  - [x] rollback using `npx wrangler rollback`
  - [x] secret rotation
- [x] Add a troubleshooting section for external integrations:
  - [x] Supabase auth misconfiguration
  - [x] Worker env drift between local and production
- [x] Add a verification checklist for logs and health checks after deploy.

### Operational checks to include

- [x] homepage loads
- [x] auth sign-in/sign-up routes respond correctly
- [x] protected route redirect logic works
- [x] runtime logs are readable from Wrangler

### Edge-case support steps

- [x] If a deployment fails but build succeeds locally, inspect Worker-specific runtime/env differences first.
- [x] If rollback is required, note that external systems do not roll back automatically:
  - [x] Supabase data or auth settings
- [x] If OpenRouter work is added later, extend the runbook then instead of partially documenting it now.

---

## Phase 6 — Validate locally and in production

**Outcome:** the implementation is proven against the actual repo commands and the target runtime assumptions before production rollout.

### Planned validation flow

- [x] Regenerate Astro types with `npx astro sync` if env/schema changes.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [x] Run local Worker-compatible validation using the existing Astro/Cloudflare workflow.
- [x] Perform the first production deploy manually.
- [x] Verify secrets and auth in production before enabling push-to-`master` auto-deploy.

### Edge-case support steps

- [x] If local and deployed behavior differ, compare Worker secrets/env first before changing code.
- [ ] If Supabase cookies behave differently between local and production domains, verify site URL / redirect URL settings in Supabase before modifying middleware logic.

---

## Implementation order recommendation

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

## Key decisions to preserve during implementation

- Cloudflare target is **Workers**, not Pages.
- Supabase remains the only external service in current deployment scope.
- OpenRouter configuration is intentionally deferred to a later change.
- The plan reconciles the stale `cloudflare-pages` handoff to the repo's real **Workers** deployment path.
- The first production deployment is **manual**, and after that pushes to `master` should **auto-deploy from the Cloudflare side**.
- Keep the current change narrowly scoped to deployment readiness, auth reliability, and operational clarity.
