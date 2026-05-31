import type { APIRoute } from "astro";
import {
  attachRequestId,
  createRequestContext,
  logRequestDuration,
  logRequestEvent,
  startRequestSpan,
  startRequestTimer,
} from "@/lib/request-context";
import { createMealForUser, getMealNutritionPersistence } from "@/lib/nutrition-records";
import { parseMealNutrition } from "@/lib/services/meal-parser";
import { getValidationMessage, parseMealFormData } from "@/lib/nutrition-validation";
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
      operation: "meals.create",
      ...details,
    });

  if (!user) {
    logRequestEvent("warn", "meals.create.unauthenticated", requestContext, {
      category: "auth",
    });
    logTotalDuration("warn", "meals.create.duration", {
      outcome: "unauthenticated",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.create.config_missing", requestContext, {
      category: "auth-config",
    });
    logTotalDuration("warn", "meals.create.duration", {
      outcome: "config_missing",
      userId: user.id,
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
    logTotalDuration("warn", "meals.create.duration", {
      outcome: "validation_failed",
      userId: user.id,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent(message)}`),
      requestContext.requestId,
    );
  }

  try {
    const parseSpan = startRequestSpan(requestContext, "parse", {
      category: "performance",
      operation: "meals.create",
    });
    const parserResult = await parseMealNutrition(parsed.data.mealText);
    parseSpan.stop("info", "meals.create.span.completed", {
      parserStatus: parserResult.status,
      userId: user.id,
    });

    const persistSpan = startRequestSpan(requestContext, "persist", {
      category: "performance",
      operation: "meals.create",
    });
    const meal = await createMealForUser(supabase, user.id, parsed.data, getMealNutritionPersistence(parserResult));
    persistSpan.stop("info", "meals.create.span.completed", {
      parserStatus: parserResult.status,
      userId: user.id,
    });

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
      const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
        category: "performance",
        operation: "meals.create",
      });
      redirectSpan.stop("info", "meals.create.span.completed", {
        parserStatus: parserResult.status,
        userId: user.id,
      });
      logTotalDuration("warn", "meals.create.duration", {
        outcome: "saved_without_nutrition",
        parserStatus: parserResult.status,
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
    logTotalDuration("error", "meals.create.duration", {
      outcome: "failed",
      userId: user.id,
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
  const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
    category: "performance",
    operation: "meals.create",
  });
  redirectSpan.stop("info", "meals.create.span.completed", {
    parserStatus: "success",
    userId: user.id,
  });
  logTotalDuration("info", "meals.create.duration", {
    outcome: "succeeded",
    parserStatus: "success",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Meal saved with nutrition details")}`),
    requestContext.requestId,
  );
};
