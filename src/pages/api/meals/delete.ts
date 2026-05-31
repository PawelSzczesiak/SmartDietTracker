import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { deleteMealForUser } from "@/lib/nutrition-records";
import { getValidationMessage, parseMealMutationIdFormData } from "@/lib/nutrition-validation";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const form = await context.request.formData();
  const user = context.locals.user;

  if (!user) {
    logRequestEvent("warn", "meals.delete.unauthenticated", requestContext, {
      category: "auth",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.delete.config_missing", requestContext, {
      category: "auth-config",
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
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent(message)}`),
      requestContext.requestId,
    );
  }

  try {
    await deleteMealForUser(supabase, user.id, parsed.data.mealId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete meal";
    logRequestEvent("error", "meals.delete.failed", requestContext, {
      category: "supabase",
      message,
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
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Meal deleted")}`),
    requestContext.requestId,
  );
};
