import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { createMealForUser, getMealNutritionPersistence } from "@/lib/nutrition-records";
import { parseMealNutrition } from "@/lib/services/meal-parser";
import { getValidationMessage, parseMealFormData } from "@/lib/nutrition-validation";
import { createClient } from "@/lib/supabase";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const requestContext = createRequestContext(context.request);
  const form = await context.request.formData();
  const user = context.locals.user;

  if (!user) {
    logRequestEvent("warn", "meals.create.unauthenticated", requestContext, {
      category: "auth",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.create.config_missing", requestContext, {
      category: "auth-config",
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Supabase is not configured")}`),
      requestContext.requestId,
    );
  }

  const parsed = parseMealFormData(form);
  if (!parsed.success) {
    const message = getValidationMessage(parsed.error);
    logRequestEvent("warn", "meals.create.validation_failed", requestContext, {
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
    const meal = await createMealForUser(supabase, user.id, parsed.data, getMealNutritionPersistence(parserResult));

    if (parserResult.status === "unavailable") {
      logRequestEvent("warn", "meals.create.saved_without_nutrition", requestContext, {
        category: "parser",
        detail: parserResult.detail,
        mealId: meal.id,
        message: parserResult.message,
        providerStatus: parserResult.providerStatus,
        reason: parserResult.reason,
        userId: user.id,
      });
      return attachRequestId(
        context.redirect(
          `/dashboard?mealWarning=${encodeURIComponent("Meal saved, but nutrition data is unavailable right now")}`,
        ),
        requestContext.requestId,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save meal";
    logRequestEvent("error", "meals.create.failed", requestContext, {
      category: "supabase",
      message,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Unable to save meal")}`),
      requestContext.requestId,
    );
  }

  logRequestEvent("info", "meals.create.succeeded", requestContext, {
    category: "app",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Meal saved with nutrition details")}`),
    requestContext.requestId,
  );
};
