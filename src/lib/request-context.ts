/* eslint-disable no-console -- central request logging is intentionally emitted to runtime logs */
export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
}

type LogLevel = "info" | "warn" | "error";
type LogDetails = Record<string, boolean | number | string | null | undefined>;

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

export function attachRequestId(response: Response, requestId: string) {
  response.headers.set("x-request-id", requestId);
  return response;
}
