import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { upsertProfileForUser } from "@/lib/nutrition-records";
import { getValidationMessage, parseProfileFormData } from "@/lib/nutrition-validation";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const form = await context.request.formData();
  const user = context.locals.user;

  if (!user) {
    logRequestEvent("warn", "profile.save.unauthenticated", requestContext, {
      category: "auth",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "profile.save.config_missing", requestContext, {
      category: "auth-config",
    });
    return attachRequestId(
      context.redirect(`/dashboard?profileError=${encodeURIComponent("Supabase is not configured")}`),
      requestContext.requestId,
    );
  }

  const parsed = parseProfileFormData(form);
  if (!parsed.success) {
    const message = getValidationMessage(parsed.error);
    logRequestEvent("warn", "profile.save.validation_failed", requestContext, {
      category: "validation",
      message,
    });
    return attachRequestId(
      context.redirect(`/dashboard?profileError=${encodeURIComponent(message)}`),
      requestContext.requestId,
    );
  }

  try {
    await upsertProfileForUser(supabase, user.id, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save profile";
    logRequestEvent("error", "profile.save.failed", requestContext, {
      category: "supabase",
      message,
    });
    return attachRequestId(
      context.redirect(`/dashboard?profileError=${encodeURIComponent("Unable to save profile")}`),
      requestContext.requestId,
    );
  }

  logRequestEvent("info", "profile.save.succeeded", requestContext, {
    category: "app",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?profileSuccess=${encodeURIComponent("Profile saved")}`),
    requestContext.requestId,
  );
};
