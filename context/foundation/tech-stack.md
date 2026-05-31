---
starter_id: 10x-astro-starter
package_manager: npm
project_name: smart-diet-tracker
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
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
---

## Why this stack

For a medium-scale web app built after hours with a 1-week MVP target, the recommended JavaScript starter is the safest path to ship quickly: it already combines typed frontend and backend contracts, built-in auth and data tooling, and a deployment path that matches your chosen target. Your PRD requires login and a fast first end-to-end user flow, so this stack minimizes setup decisions and keeps implementation focused on meal parsing, calorie tracking, and dashboard feedback. The selected CI and deploy defaults keep delivery simple for a solo build while preserving room to evolve the architecture if scope grows after MVP.
