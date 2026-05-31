import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const supabase = createClient(context.request.headers, context.cookies);
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logRequestEvent("warn", "auth.signout.failed", requestContext, {
        category: "supabase",
        message: error.message,
      });
    }
  } else {
    logRequestEvent("warn", "auth.signout.config_missing", requestContext, {
      category: "auth-config",
    });
  }
  return attachRequestId(context.redirect("/"), requestContext.requestId);
};
