import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "auth.signin.config_missing", requestContext, {
      category: "auth-config",
    });
    return attachRequestId(
      context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`),
      requestContext.requestId,
    );
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    logRequestEvent("warn", "auth.signin.failed", requestContext, {
      category: "supabase",
      message: error.message,
    });
    return attachRequestId(
      context.redirect(`/auth/signin?error=${encodeURIComponent(error.message)}`),
      requestContext.requestId,
    );
  }

  return attachRequestId(context.redirect("/"), requestContext.requestId);
};
