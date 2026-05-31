/* eslint-disable no-console -- central request logging is intentionally emitted to runtime logs */
export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
}

type LogLevel = "info" | "warn" | "error";
type LogDetails = Record<string, boolean | number | string | null | undefined>;
type DurationDetails = LogDetails & { durationMs: number };

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }

  return Date.now();
}

function toDurationMs(startedAt: number) {
  return Number((nowMs() - startedAt).toFixed(2));
}

function getConsoleMethod(level: LogLevel) {
  if (level === "error") {
    return console.error;
  }
  if (level === "warn") {
    return console.warn;
  }
  return console.info;
}

export function createRequestContext(request: Request): RequestContext {
  return {
    requestId: request.headers.get("x-request-id") ?? request.headers.get("cf-ray") ?? crypto.randomUUID(),
    method: request.method,
    path: new URL(request.url).pathname,
  };
}

export function logRequestEvent(level: LogLevel, event: string, context: RequestContext, details: LogDetails = {}) {
  getConsoleMethod(level)(
    JSON.stringify({
      level,
      event,
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      ...details,
    }),
  );
}

export function startRequestTimer() {
  return nowMs();
}

export function logRequestDuration(
  level: LogLevel,
  event: string,
  context: RequestContext,
  startedAt: number,
  details: LogDetails = {},
) {
  const durationMs = toDurationMs(startedAt);
  logRequestEvent(level, event, context, {
    ...details,
    durationMs,
  } satisfies DurationDetails);
  return durationMs;
}

export function startRequestSpan(context: RequestContext, span: string, baseDetails: LogDetails = {}) {
  const startedAt = startRequestTimer();
  return {
    stop(level: LogLevel, event: string, details: LogDetails = {}) {
      return logRequestDuration(level, event, context, startedAt, {
        ...baseDetails,
        ...details,
        span,
      });
    },
  };
}

export function attachRequestId(response: Response, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}
