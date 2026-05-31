---
bootstrapped_at: 2026-05-20T13:25:46Z
starter_id: 10x-astro-starter
starter_name: 10x Astro Starter (Astro + Supabase + Cloudflare)
project_name: smart-diet-tracker
language_family: js
package_manager: npm
cwd_strategy: git-clone
bootstrapper_confidence: first-class
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: 10x-astro-starter
package_manager: npm
project_name: smart-diet-tracker
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-pages
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
```

## Why this stack

For a medium-scale web app built after hours with a 3-week MVP target, the recommended JavaScript starter is the safest path to ship quickly: it already combines typed frontend and backend contracts, built-in auth and data tooling, and a deployment path that matches your chosen target. Your PRD requires login and a fast first end-to-end user flow, so this stack minimizes setup decisions and keeps implementation focused on meal parsing, calorie tracking, and dashboard feedback. The selected CI and deploy defaults keep delivery simple for a solo build while preserving room to evolve the architecture if scope grows after MVP.

## Pre-scaffold verification

| Signal | Value | Severity | Notes |
| --- | --- | --- | --- |
| npm package | not run | n/a | starter command uses git clone |
| GitHub repo (gh) | not run | n/a | gh CLI not available in environment |
| GitHub repo (API fallback) | przeprogramowani/10x-astro-starter last pushed 2026-05-17T10:33:39Z | fresh | fallback via GitHub REST API |

## Scaffold log

**Resolved invocation**: `git clone https://github.com/przeprogramowani/10x-astro-starter .bootstrap-scaffold && cd .bootstrap-scaffold && npm install`
**Strategy**: git-clone
**Exit code**: 0
**Files moved**: 19 top-level entries
**Conflicts (.scaffold siblings)**: `.github.scaffold`
**.gitignore handling**: moved silently
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 1 HIGH, 10 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/3/0 direct of total 0/1/10/0

#### CRITICAL findings

None.

#### HIGH findings

- `devalue` 5.6.3-5.8.0: DoS via sparse array deserialization (GHSA-77vg-94rm-hx3p), CVSS 7.5.

#### MODERATE findings

- `@astrojs/check` via `@astrojs/language-server`
- `@astrojs/cloudflare` via `@cloudflare/vite-plugin`, `wrangler`
- `@astrojs/language-server` via `volar-service-yaml`
- `@cloudflare/vite-plugin` via `miniflare`, `wrangler`, `ws`
- `miniflare` via `ws`
- `volar-service-yaml` via `yaml-language-server`
- `wrangler` via `miniflare`
- `ws` uninitialized memory disclosure (GHSA-58qx-3vcg-4xpx)
- `yaml` stack overflow on deeply nested collections (GHSA-48c2-rrv3-qjmp)
- `yaml-language-server` via `yaml`

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint | Value |
| --- | --- |
| bootstrapper_confidence | first-class |
| quality_override | false |
| path_taken | standard |
| self_check_answers | null |
| team_size | solo |
| deployment_target | cloudflare-pages |
| ci_provider | github-actions |
| ci_default_flow | auto-deploy-on-merge |
| has_auth | true |
| has_payments | false |
| has_realtime | false |
| has_ai | true |
| has_background_jobs | false |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified - happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review `.github.scaffold` and decide whether to merge any workflow or metadata changes.
- Address audit findings per your project's risk tolerance - full details are in this log.
