import type { APIRoute } from "astro";
import {
  attachRequestId,
  createRequestContext,
  logRequestDuration,
  logRequestEvent,
  startRequestSpan,
  startRequestTimer,
} from "@/lib/request-context";
import { deleteMealForUser } from "@/lib/nutrition-records";
import { getValidationMessage, parseMealMutationIdFormData } from "@/lib/nutrition-validation";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const requestStartedAt = startRequestTimer();
  const form = await context.request.formData();
  const user = context.locals.user;

  const logTotalDuration = (level: "info" | "warn" | "error", event: string, details = {}) =>
    logRequestDuration(level, event, requestContext, requestStartedAt, {
      category: "performance",
      operation: "meals.delete",
      ...details,
    });

  if (!user) {
    logRequestEvent("warn", "meals.delete.unauthenticated", requestContext, {
      category: "auth",
    });
    logTotalDuration("warn", "meals.delete.duration", {
      outcome: "unauthenticated",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.delete.config_missing", requestContext, {
      category: "auth-config",
    });
    logTotalDuration("warn", "meals.delete.duration", {
      outcome: "config_missing",
      userId: user.id,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Supabase is not configured")}`),
      requestContext.requestId,
    );
  }

  const parsed = parseMealMutationIdFormData(form);
  if (!parsed.success) {
    const message = getValidationMessage(parsed.error);
    logRequestEvent("warn", "meals.delete.validation_failed", requestContext, {
      category: "validation",
      message,
    });
    logTotalDuration("warn", "meals.delete.duration", {
      outcome: "validation_failed",
      userId: user.id,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent(message)}`),
      requestContext.requestId,
    );
  }

  try {
    const deleteSpan = startRequestSpan(requestContext, "persist", {
      category: "performance",
      operation: "meals.delete",
    });
    await deleteMealForUser(supabase, user.id, parsed.data.mealId);
    deleteSpan.stop("info", "meals.delete.span.completed", {
      userId: user.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete meal";
    logRequestEvent("error", "meals.delete.failed", requestContext, {
      category: "supabase",
      message,
    });
    logTotalDuration("error", "meals.delete.duration", {
      outcome: "failed",
      userId: user.id,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Unable to delete meal")}`),
      requestContext.requestId,
    );
  }

  logRequestEvent("info", "meals.delete.succeeded", requestContext, {
    category: "app",
    userId: user.id,
  });
  const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
    category: "performance",
    operation: "meals.delete",
  });
  redirectSpan.stop("info", "meals.delete.span.completed", {
    userId: user.id,
  });
  logTotalDuration("info", "meals.delete.duration", {
    outcome: "succeeded",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Meal deleted")}`),
    requestContext.requestId,
  );
};
