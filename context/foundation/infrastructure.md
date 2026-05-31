---
project: smart-diet-tracker
researched_at: 2026-05-24T08:51:45+02:00
recommended_platform: Cloudflare Workers
runner_up: Netlify
context_type: mvp
tech_stack:
  language: JavaScript
  framework: Astro 6.3.1
  runtime: Cloudflare Workers via @astrojs/cloudflare 13.5.0 and Wrangler 4.90.0
---

## Recommendation

**Deploy on Cloudflare Workers.**

This repo already matches the Cloudflare Worker deployment path exactly: Astro 6 SSR is configured with `@astrojs/cloudflare`, `output: "server"`, and `wrangler.jsonc`. Given the current constraints, Cloudflare wins because it preserves the existing runtime, fits the "minimize cost" goal with a practical floor around $5/month, and works well with the chosen external services: **Supabase** for auth/data and **OpenRouter** for AI inference. Netlify and Railway remain viable backups, but both require a runtime migration before shipping.

## Platform Comparison

Weighted total reflects the interview constraints and the clarified infrastructure choice: minimizing cost, existing Cloudflare familiarity, no need for persistent processes, and using external providers rather than platform-co-located data services.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Weighted total |
|---|---|---|---|---|---|---|
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5.0 |
| Netlify | Partial | Pass | Pass | Partial | Pass | 4.0 |
| Railway | Pass | Partial | Pass | Partial | Pass | 3.5 |
| Vercel | Pass | Pass | Pass | Pass | Pass | 3.0 |
| Render | Partial | Partial | Pass | Partial | Pass | 3.0 |
| Fly.io | Pass | Partial | Partial | Partial | Partial | 2.5 |

**Cloudflare Workers:** Best raw fit for the exact stack already in the repo. CLI and runtime story are first-class, docs are LLM-friendly, and deployment stays inside the current Astro adapter path. The main caveat is that Astro's current adapter targets Workers, not Pages, and the paid Workers plan is the realistic baseline for SSR plus Supabase auth and OpenRouter calls.

**Netlify:** Strong Astro support, solid docs, official MCP server, and good cost profile at MVP scale. It lost to Cloudflare because this repo would need a platform migration to Node/Deno-style Netlify runtimes, and rollback remains dashboard-driven rather than fully CLI-native.

**Railway:** Good CLI, good MCP support, straightforward Node hosting, and acceptable Hobby pricing. It ranked below Netlify because it shifts the app to always-on containers, requires `@astrojs/node` plus host binding changes, and replaces request-based pricing with steady compute billing.

**Vercel:** Excellent platform quality on the five criteria, but the practical floor is the $20/month Pro plan because Hobby is non-commercial, and the repo would still need to move off the Cloudflare adapter.

**Render:** Capable Node hosting with solid CLI, hosted MCP, and warm paid instances. It scored lower because free-tier cold starts violate the latency goal, it still requires a Node adapter migration, and rollback is not a first-class CLI flow.

**Fly.io:** Most attractive when persistent processes or sockets matter, which this MVP explicitly does not need. It also requires the heaviest migration effort here: move to `@astrojs/node`, add Docker, learn `fly.toml`, and operate a VM-style platform instead of the current worker runtime.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Cloudflare won because it is the only option that lets this repo deploy without changing the core runtime model. That matters more than a theoretical feature edge elsewhere: the app already uses the Worker adapter, Wrangler is already installed, and both Supabase and OpenRouter fit cleanly as external HTTP services. Combined with low MVP cost and existing team familiarity, it is the fastest path from current codebase to production.

#### 2. Netlify

Netlify placed second because it keeps the MVP cheap and has strong Astro support, readable docs, and official agent tooling. The gap versus Cloudflare is migration cost: the app must switch adapters and runtime assumptions before deploy, so it is a better fallback than a better first move.

#### 3. Railway

Railway placed third because it is operationally clean, well documented for agents, and friendly to standard Node SSR apps. It still trails the top two because this project does not need persistent containers, and paying for always-on compute plus making runtime changes weakens the MVP-speed argument.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. The original stack hint named Cloudflare Pages, but Astro's current Cloudflare adapter deploys to Workers only, so earlier deployment assumptions are already stale.
2. The free-tier story is misleading for SSR: request volume can stay low while CPU time from Astro SSR, Supabase auth, and OpenRouter proxy calls still trips the 10 ms free-tier limit.
3. The `workerd` runtime is stricter than a normal Node process, so future AI SDKs or observability packages may fail because of CommonJS or Node-runtime assumptions.
4. Staying on Cloudflare increases platform coupling through runtime-specific bindings, environment build behavior, and Worker-oriented operational habits.
5. OpenRouter and Supabase remain external dependencies, so production reliability is not controlled by the hosting platform alone.

### Pre-Mortem — How This Could Fail

The team kept Cloudflare because it matched the starter and seemed almost free, but they never corrected the early assumption that they were deploying to Pages. As the app evolved, deployment docs and mental models drifted from the actual Workers runtime. Meal parsing, auth, and dashboard logic stayed modest in traffic, so nobody expected infrastructure trouble, yet the real bottleneck became CPU time per request rather than raw request count. On the free tier, intermittent failures started appearing only after the app felt feature-complete. At the same time, OpenRouter integration pulled in AI-facing tooling and retry logic that behaved differently inside `workerd` than in a normal Node server, forcing runtime-specific debugging that had not been budgeted into the MVP schedule. External dependencies also complicated incident response: some slow requests came from the app, some from Supabase round-trips, and some from the model provider path. By the time a migration to a Node container platform was reconsidered, parts of the code and deployment process had already grown around Cloudflare-specific assumptions, turning a routine platform change into a second project.

### Unknown Unknowns

- Astro Cloudflare v13 removed Pages support, so an older "Cloudflare Pages" decision can quietly become incorrect without anybody noticing.
- On Workers, CPU time matters more than monthly request count for SSR economics, which makes the free tier look cheaper than it really is.
- Environment-specific builds now matter; the old pattern of building once and promoting across environments is no longer the safe default.
- AI calls through OpenRouter add another external latency surface, so end-user slowness can come from provider round-trips even when the Worker itself is healthy.

## Operational Story

- **Preview deploys**: use a separate Wrangler environment such as `staging` or `preview` that publishes to its own `*.workers.dev` URL; branch previews are not automatic unless CI is wired to deploy that environment.
- **Secrets**: store `SUPABASE_URL`, `SUPABASE_KEY`, and `OPENROUTER_API_KEY` with `wrangler secret put`; values are runtime-only, not readable back in plaintext, and rotation means updating the secret in the target environment and redeploying.
- **Rollback**: run `npx wrangler rollback` or `npx wrangler rollback <version-id>`; traffic switches quickly, but database changes or provider-side changes do not roll back automatically.
- **Approval**: a human should approve production deploys, primary secret rotation, and any destructive resource change; an agent can deploy to preview/staging and read logs unattended.
- **Logs**: use `npx wrangler tail <worker-name>` for runtime logs, Supabase logs for auth/data issues, and OpenRouter request telemetry for model failures or rate limiting.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Free-tier CPU limit causes intermittent SSR failures | Devil's advocate | M | H | Start on the paid Workers plan instead of treating Free as production-capable for SSR. |
| Deployment docs drift because the repo says Pages while Astro now deploys to Workers | Unknown unknowns | M | M | Update team docs and deploy commands to say Workers everywhere before first production rollout. |
| Future SDKs assume full Node or CommonJS and break in `workerd` | Devil's advocate | M | H | Check new server-side dependencies for Worker compatibility before adoption and isolate incompatible code behind API boundaries. |
| External dependency latency from Supabase or OpenRouter slows user requests | Research finding | M | H | Set strict request timeouts, log upstream latency separately, and keep AI calls off the critical path where possible. |
| Environment-specific builds introduce config drift between preview and production | Unknown unknowns | M | M | Build and deploy each environment explicitly with its own secrets and verify env-specific artifacts in CI. |
| Cloudflare-specific runtime assumptions make a later migration harder | Pre-mortem | M | M | Keep storage, auth, and business logic on portable HTTP/SDK abstractions rather than Worker-only platform APIs. |
| Rollback flow is not documented before the first incident | Research finding | L | M | Add `npx wrangler rollback` and version-specific rollback examples to the deploy runbook before launch. |

## Getting Started

1. Enable the paid Cloudflare Workers plan for the account you will use for production; for this stack, treat Free as local or experimental only.
2. Log in locally with `npx wrangler login`.
3. Update `wrangler.jsonc` so `name` matches the real app name you want to publish, keeping `main` pointed at `@astrojs/cloudflare/entrypoints/server`.
4. Add secrets with `npx wrangler secret put SUPABASE_URL`, `npx wrangler secret put SUPABASE_KEY`, and `npx wrangler secret put OPENROUTER_API_KEY`.
5. Deploy with `npm run build` followed by `npx wrangler deploy`.
6. Verify runtime behavior with `npx wrangler tail <worker-name>` and keep a staging environment on its own `workers.dev` URL before promoting production changes.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
