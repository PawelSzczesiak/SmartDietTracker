import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { getMealNutritionPersistence, updateMealForUser } from "@/lib/nutrition-records";
import { parseMealNutrition } from "@/lib/services/meal-parser";
import { getValidationMessage, parseMealUpdateFormData } from "@/lib/nutrition-validation";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const form = await context.request.formData();
  const user = context.locals.user;

  if (!user) {
    logRequestEvent("warn", "meals.update.unauthenticated", requestContext, {
      category: "auth",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.update.config_missing", requestContext, {
      category: "auth-config",
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Supabase is not configured")}`),
      requestContext.requestId,
    );
  }

  const parsed = parseMealUpdateFormData(form);
  if (!parsed.success) {
    const message = getValidationMessage(parsed.error);
    logRequestEvent("warn", "meals.update.validation_failed", requestContext, {
      category: "validation",
      message,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent(message)}`),
      requestContext.requestId,
    );
  }

  try {
    const parserResult = await parseMealNutrition(parsed.data.mealText);
    await updateMealForUser(supabase, user.id, parsed.data, getMealNutritionPersistence(parserResult));

    if (parserResult.status === "unavailable") {
      logRequestEvent("warn", "meals.update.saved_without_nutrition", requestContext, {
        category: "parser",
        detail: parserResult.detail,
        mealId: parsed.data.mealId,
        message: parserResult.message,
        providerStatus: parserResult.providerStatus,
        reason: parserResult.reason,
        userId: user.id,
      });
      return attachRequestId(
        context.redirect(
          `/dashboard?mealWarning=${encodeURIComponent("Meal updated, but nutrition data is unavailable right now")}`,
        ),
        requestContext.requestId,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update meal";
    logRequestEvent("error", "meals.update.failed", requestContext, {
      category: "supabase",
      message,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Unable to update meal")}`),
      requestContext.requestId,
    );
  }

  logRequestEvent("info", "meals.update.succeeded", requestContext, {
    category: "app",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Meal updated with refreshed nutrition")}`),
    requestContext.requestId,
  );
};
