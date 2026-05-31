import type { APIRoute } from "astro";
import {
  attachRequestId,
  createRequestContext,
  logRequestDuration,
  logRequestEvent,
  startRequestSpan,
  startRequestTimer,
} from "@/lib/request-context";
import { getMealForUser, getMealNutritionPersistence, retryMealNutritionForUser } from "@/lib/nutrition-records";
import { parseMealNutrition } from "@/lib/services/meal-parser";
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
      operation: "meals.retry",
      ...details,
    });

  if (!user) {
    logRequestEvent("warn", "meals.retry.unauthenticated", requestContext, {
      category: "auth",
    });
    logTotalDuration("warn", "meals.retry.duration", {
      outcome: "unauthenticated",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.retry.config_missing", requestContext, {
      category: "auth-config",
    });
    logTotalDuration("warn", "meals.retry.duration", {
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
    logRequestEvent("warn", "meals.retry.validation_failed", requestContext, {
      category: "validation",
      message,
    });
    logTotalDuration("warn", "meals.retry.duration", {
      outcome: "validation_failed",
      userId: user.id,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent(message)}`),
      requestContext.requestId,
    );
  }

  try {
    const lookupSpan = startRequestSpan(requestContext, "lookup", {
      category: "performance",
      operation: "meals.retry",
    });
    const meal = await getMealForUser(supabase, user.id, parsed.data.mealId);
    lookupSpan.stop("info", "meals.retry.span.completed", {
      userId: user.id,
    });

    if (meal.parser_status === "success") {
      const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
        category: "performance",
        operation: "meals.retry",
      });
      redirectSpan.stop("info", "meals.retry.span.completed", {
        userId: user.id,
      });
      logTotalDuration("warn", "meals.retry.duration", {
        outcome: "already_available",
        userId: user.id,
      });
      return attachRequestId(
        context.redirect(`/dashboard?mealError=${encodeURIComponent("Nutrition is already available for this meal")}`),
        requestContext.requestId,
      );
    }

    const parseSpan = startRequestSpan(requestContext, "parse", {
      category: "performance",
      operation: "meals.retry",
    });
    const parserResult = await parseMealNutrition(meal.meal_text);
    parseSpan.stop("info", "meals.retry.span.completed", {
      parserStatus: parserResult.status,
      userId: user.id,
    });

    const persistSpan = startRequestSpan(requestContext, "persist", {
      category: "performance",
      operation: "meals.retry",
    });
    await retryMealNutritionForUser(supabase, user.id, meal.id, getMealNutritionPersistence(parserResult));
    persistSpan.stop("info", "meals.retry.span.completed", {
      parserStatus: parserResult.status,
      userId: user.id,
    });

    if (parserResult.status === "unavailable") {
      logRequestEvent("warn", "meals.retry.unavailable", requestContext, {
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
        operation: "meals.retry",
      });
      redirectSpan.stop("info", "meals.retry.span.completed", {
        parserStatus: parserResult.status,
        userId: user.id,
      });
      logTotalDuration("warn", "meals.retry.duration", {
        outcome: "unavailable",
        parserStatus: parserResult.status,
        userId: user.id,
      });
      return attachRequestId(
        context.redirect(
          `/dashboard?mealWarning=${encodeURIComponent("Nutrition is still unavailable for this meal")}`,
        ),
        requestContext.requestId,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retry nutrition";
    logRequestEvent("error", "meals.retry.failed", requestContext, {
      category: "supabase",
      message,
    });
    logTotalDuration("error", "meals.retry.duration", {
      outcome: "failed",
      userId: user.id,
    });
    return attachRequestId(
      context.redirect(`/dashboard?mealError=${encodeURIComponent("Unable to retry nutrition")}`),
      requestContext.requestId,
    );
  }

  logRequestEvent("info", "meals.retry.succeeded", requestContext, {
    category: "app",
    userId: user.id,
  });
  const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
    category: "performance",
    operation: "meals.retry",
  });
  redirectSpan.stop("info", "meals.retry.span.completed", {
    parserStatus: "success",
    userId: user.id,
  });
  logTotalDuration("info", "meals.retry.duration", {
    outcome: "succeeded",
    parserStatus: "success",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Nutrition updated for meal")}`),
    requestContext.requestId,
  );
};
