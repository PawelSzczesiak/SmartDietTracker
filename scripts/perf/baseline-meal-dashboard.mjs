import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";

const MEAL_P95_TARGET_MS = 3000;
const DASHBOARD_P99_TARGET_MS = 400;
const DEFAULT_BASE_URL = "http://127.0.0.1:4321";
const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
const DEFAULT_SAMPLE_SIZE = 10;
const DEFAULT_TEST_PASSWORD = "PerfBaseline!12345";
const MAX_REDIRECTS = 8;

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toRunId(date = new Date()) {
  const pad = (value) => value.toString().padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(
    date.getUTCHours(),
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

function buildDefaultCredentials(runId) {
  return {
    email: `perf.baseline+${runId}@local.test`,
    password: DEFAULT_TEST_PASSWORD,
  };
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return Number((sum / values.length).toFixed(2));
}

function buildStats(values) {
  return {
    sampleSize: values.length,
    min: values.length > 0 ? Number(Math.min(...values).toFixed(2)) : 0,
    max: values.length > 0 ? Number(Math.max(...values).toFixed(2)) : 0,
    avg: average(values),
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
  };
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  loadFromHeader(cookieHeader) {
    for (const cookie of cookieHeader.split(";")) {
      const [name, value] = cookie.trim().split("=");
      if (!name || value == null) {
        continue;
      }

      this.cookies.set(name, value);
    }
  }

  applyToHeaders(headers) {
    if (this.cookies.size === 0) {
      return;
    }

    const serialized = [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    headers.set("cookie", serialized);
  }

  ingestFromResponse(response) {
    const setCookieLines = this.getSetCookieLines(response);
    for (const line of setCookieLines) {
      const [firstPair] = line.split(";");
      const [name, value] = firstPair.trim().split("=");
      if (!name || value == null) {
        continue;
      }

      this.cookies.set(name, value);
    }
  }

  getSetCookieLines(response) {
    if (typeof response.headers.getSetCookie === "function") {
      return response.headers.getSetCookie();
    }

    const single = response.headers.get("set-cookie");
    if (!single) {
      return [];
    }

    return [single];
  }
}

async function requestWithCookies(jar, baseUrl, requestPath, init = {}) {
  let url = new URL(requestPath, baseUrl);
  let method = init.method ?? "GET";
  let body = init.body;
  const headers = new Headers(init.headers ?? {});
  let response = null;
  const startedAt = performance.now();

  for (let redirectIndex = 0; redirectIndex <= MAX_REDIRECTS; redirectIndex += 1) {
    const requestHeaders = new Headers(headers);
    jar.applyToHeaders(requestHeaders);
    if (method !== "GET" && method !== "HEAD") {
      requestHeaders.set("origin", new URL(baseUrl).origin);
      requestHeaders.set("referer", `${baseUrl}/`);
    }

    response = await fetch(url, {
      ...init,
      method,
      body,
      headers: requestHeaders,
      redirect: "manual",
    });

    jar.ingestFromResponse(response);

    const location = response.headers.get("location");
    const isRedirect = response.status >= 300 && response.status < 400 && location;
    if (!isRedirect) {
      break;
    }

    url = new URL(location, url);
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method !== "GET")) {
      method = "GET";
      body = undefined;
    }
  }

  if (!response) {
    throw new Error(`No response received for ${requestPath}`);
  }

  return {
    durationMs: Number((performance.now() - startedAt).toFixed(2)),
    finalUrl: url.toString(),
    response,
  };
}

function evaluateAgainstNfr(mealStats, dashboardStats) {
  const mealStatus = mealStats.p95 <= MEAL_P95_TARGET_MS ? "pass" : "warn";
  const dashboardStatus = dashboardStats.p99 <= DASHBOARD_P99_TARGET_MS ? "pass" : "warn";
  const overall = mealStatus === "pass" && dashboardStatus === "pass" ? "pass" : "warn";

  const warnings = [];
  if (mealStatus === "warn") {
    warnings.push({
      flow: "meal_submit",
      reason: `p95 ${mealStats.p95}ms exceeds ${MEAL_P95_TARGET_MS}ms target`,
      breakdownHint: "Inspect meals.create span events (`span=parse`, `span=persist`, `span=redirect_ready`).",
      recommendation:
        "If parse dominates, prioritize parser timeout/reliability work; if persist dominates, inspect Supabase latency.",
    });
  }

  if (dashboardStatus === "warn") {
    warnings.push({
      flow: "dashboard_refresh",
      reason: `p99 ${dashboardStats.p99}ms exceeds ${DASHBOARD_P99_TARGET_MS}ms target`,
      breakdownHint: "Inspect dashboard.load span events (`span=data_fetch`, `span=suggestions_compute`).",
      recommendation:
        "If data_fetch dominates, optimize DB queries; if suggestions_compute dominates, optimize suggestion logic/data size.",
    });
  }

  return {
    overall,
    thresholds: {
      mealP95Ms: MEAL_P95_TARGET_MS,
      dashboardP99Ms: DASHBOARD_P99_TARGET_MS,
    },
    flows: {
      meal_submit: {
        status: mealStatus,
        metric: "p95",
        measuredMs: mealStats.p95,
      },
      dashboard_refresh: {
        status: dashboardStatus,
        metric: "p99",
        measuredMs: dashboardStats.p99,
      },
    },
    warnings,
  };
}

function toMarkdownReport({ runId, createdAtIso, sampleSize, baseUrl, mealStats, dashboardStats, evaluation }) {
  const warningLines =
    evaluation.warnings.length === 0
      ? "- none"
      : evaluation.warnings
          .map(
            (warning) =>
              `- **${warning.flow}**: ${warning.reason}\n  - breakdown: ${warning.breakdownHint}\n  - recommendation: ${warning.recommendation}`,
          )
          .join("\n");

  return `# F-02 Baseline Run ${runId}

- createdAt: ${createdAtIso}
- baseUrl: ${baseUrl}
- sampleSize: ${sampleSize}
- overall: **${evaluation.overall.toUpperCase()}**

| flow | metric | measured | target | status |
| --- | --- | --- | --- | --- |
| meal_submit | p95 | ${mealStats.p95} ms | <= ${evaluation.thresholds.mealP95Ms} ms | ${evaluation.flows.meal_submit.status} |
| dashboard_refresh | p99 | ${dashboardStats.p99} ms | <= ${evaluation.thresholds.dashboardP99Ms} ms | ${evaluation.flows.dashboard_refresh.status} |

## Distribution details

- meal_submit: min ${mealStats.min} ms, avg ${mealStats.avg} ms, p50 ${mealStats.p50} ms, p95 ${mealStats.p95} ms, p99 ${mealStats.p99} ms, max ${mealStats.max} ms
- dashboard_refresh: min ${dashboardStats.min} ms, avg ${dashboardStats.avg} ms, p50 ${dashboardStats.p50} ms, p95 ${dashboardStats.p95} ms, p99 ${dashboardStats.p99} ms, max ${dashboardStats.max} ms

## NFR warning breakdown and recommendations

${warningLines}
`;
}

async function authenticate(jar, baseUrl) {
  const sessionCookie = process.env.PERF_SESSION_COOKIE;
  if (sessionCookie) {
    jar.loadFromHeader(sessionCookie);
    return;
  }

  const email = process.env.PERF_EMAIL;
  const password = process.env.PERF_PASSWORD;
  const runId = toRunId();
  const { email: defaultEmail, password: defaultPassword } = buildDefaultCredentials(runId);
  const authEmail = email ?? defaultEmail;
  const authPassword = password ?? defaultPassword;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.PERF_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PERF_SUPABASE_SECRET_KEY;

  const trySignIn = async () => {
    const body = new URLSearchParams({
      email: authEmail,
      password: authPassword,
    });
    const signInResult = await requestWithCookies(jar, baseUrl, "/api/auth/signin", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    return !new URL(signInResult.finalUrl).pathname.startsWith("/auth/signin");
  };

  if (await trySignIn()) {
    return;
  }

  if (serviceRoleKey) {
    const createUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: authEmail,
        password: authPassword,
        email_confirm: true,
      }),
    });

    if (!createUserResponse.ok && createUserResponse.status !== 422) {
      const responseText = await createUserResponse.text();
      throw new Error(`Unable to create perf auth user (${createUserResponse.status}): ${responseText}`);
    }

    if (await trySignIn()) {
      return;
    }
  }

  const signUpBody = new URLSearchParams({
    email: authEmail,
    password: authPassword,
  });
  const signUpResult = await requestWithCookies(jar, baseUrl, "/api/auth/signup", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: signUpBody,
  });

  const signUpPath = new URL(signUpResult.finalUrl).pathname;
  if (signUpPath.startsWith("/auth/signup")) {
    throw new Error("Sign-up failed during perf baseline authentication. Verify local auth configuration.");
  }

  if (await trySignIn()) {
    return;
  }

  throw new Error("Unable to establish perf baseline session with local auth.");
}

async function main() {
  const baseUrl = process.env.PERF_BASE_URL ?? DEFAULT_BASE_URL;
  const sampleSize = toNumber(process.env.PERF_SAMPLES, DEFAULT_SAMPLE_SIZE);
  const runId = toRunId();
  const createdAtIso = new Date().toISOString();
  const artifactDir = path.resolve("context", "changes", "performance-verification-path", "verification", "runs");
  const jar = new CookieJar();

  await authenticate(jar, baseUrl);

  const dashboardProbe = await requestWithCookies(jar, baseUrl, "/dashboard", {
    method: "GET",
  });
  if (new URL(dashboardProbe.finalUrl).pathname.startsWith("/auth/signin")) {
    throw new Error("Authenticated dashboard probe redirected to /auth/signin. Session is not valid.");
  }

  const mealDurations = [];
  const dashboardDurations = [];

  for (let index = 1; index <= sampleSize; index += 1) {
    const mealPayload = new URLSearchParams({
      meal_text: `F-02 baseline meal ${runId} #${index} (oats banana yogurt)`,
    });
    const mealResult = await requestWithCookies(jar, baseUrl, "/api/meals", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: mealPayload,
    });

    if (new URL(mealResult.finalUrl).pathname.startsWith("/auth/signin")) {
      throw new Error(`Meal submit sample ${index} redirected to /auth/signin. Session expired or invalid.`);
    }

    mealDurations.push(mealResult.durationMs);

    const dashboardResult = await requestWithCookies(jar, baseUrl, "/dashboard", {
      method: "GET",
    });
    if (new URL(dashboardResult.finalUrl).pathname.startsWith("/auth/signin")) {
      throw new Error(`Dashboard sample ${index} redirected to /auth/signin. Session expired or invalid.`);
    }

    dashboardDurations.push(dashboardResult.durationMs);
  }

  const mealStats = buildStats(mealDurations);
  const dashboardStats = buildStats(dashboardDurations);
  const evaluation = evaluateAgainstNfr(mealStats, dashboardStats);

  const result = {
    runId,
    createdAtIso,
    baseUrl,
    sampleSize,
    metrics: {
      meal_submit: mealStats,
      dashboard_refresh: dashboardStats,
    },
    evaluation,
  };

  const markdown = toMarkdownReport({
    runId,
    createdAtIso,
    sampleSize,
    baseUrl,
    mealStats,
    dashboardStats,
    evaluation,
  });

  await fs.mkdir(artifactDir, { recursive: true });
  const jsonPath = path.join(artifactDir, `${runId}.json`);
  const markdownPath = path.join(artifactDir, `${runId}.md`);
  await fs.writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await fs.writeFile(markdownPath, markdown, "utf8");

  console.log(`Baseline run complete (${evaluation.overall.toUpperCase()}).`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${markdownPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown perf baseline failure";
  console.error(`perf:baseline failed: ${message}`);
  process.exit(1);
});
