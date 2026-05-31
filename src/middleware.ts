import { defineMiddleware } from "astro:middleware";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard"];

export const onRequest = defineMiddleware(async (context, next) => {
  const requestContext = createRequestContext(context.request);
  context.locals.requestId = requestContext.requestId;

  const supabase = createClient(context.request.headers, context.cookies);
  const supabaseConfigured = isSupabaseConfigured();

  if (supabase) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logRequestEvent("error", "supabase.auth.get_user_failed", requestContext, {
        category: "supabase",
        message: error.message,
      });
    }

    context.locals.user = user ?? null;
  } else {
    if (supabaseConfigured) {
      logRequestEvent("warn", "supabase.client_unavailable", requestContext, {
        category: "app",
      });
    } else {
      logRequestEvent("warn", "supabase.config_missing", requestContext, {
        category: "auth-config",
      });
    }
    context.locals.user = null;
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      const destination = supabaseConfigured
        ? "/auth/signin"
        : `/auth/signin?error=${encodeURIComponent("Authentication is unavailable")}`;

      return attachRequestId(context.redirect(destination), requestContext.requestId);
    }
  }

  return attachRequestId(await next(), requestContext.requestId);
});
