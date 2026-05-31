import type { APIRoute } from "astro";
import {
  attachRequestId,
  createRequestContext,
  logRequestDuration,
  logRequestEvent,
  startRequestSpan,
  startRequestTimer,
} from "@/lib/request-context";
import { getMealNutritionPersistence, updateMealForUser } from "@/lib/nutrition-records";
import { parseMealNutrition } from "@/lib/services/meal-parser";
import { getValidationMessage, parseMealUpdateFormData } from "@/lib/nutrition-validation";
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
      operation: "meals.update",
      ...details,
    });

  if (!user) {
    logRequestEvent("warn", "meals.update.unauthenticated", requestContext, {
      category: "auth",
    });
    logTotalDuration("warn", "meals.update.duration", {
      outcome: "unauthenticated",
    });
    return attachRequestId(context.redirect("/auth/signin"), requestContext.requestId);
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    logRequestEvent("warn", "meals.update.config_missing", requestContext, {
      category: "auth-config",
    });
    logTotalDuration("warn", "meals.update.duration", {
      outcome: "config_missing",
      userId: user.id,
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
    logTotalDuration("warn", "meals.update.duration", {
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
      operation: "meals.update",
    });
    const parserResult = await parseMealNutrition(parsed.data.mealText);
    parseSpan.stop("info", "meals.update.span.completed", {
      parserStatus: parserResult.status,
      userId: user.id,
    });

    const persistSpan = startRequestSpan(requestContext, "persist", {
      category: "performance",
      operation: "meals.update",
    });
    await updateMealForUser(supabase, user.id, parsed.data, getMealNutritionPersistence(parserResult));
    persistSpan.stop("info", "meals.update.span.completed", {
      parserStatus: parserResult.status,
      userId: user.id,
    });

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
      const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
        category: "performance",
        operation: "meals.update",
      });
      redirectSpan.stop("info", "meals.update.span.completed", {
        parserStatus: parserResult.status,
        userId: user.id,
      });
      logTotalDuration("warn", "meals.update.duration", {
        outcome: "saved_without_nutrition",
        parserStatus: parserResult.status,
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
    logTotalDuration("error", "meals.update.duration", {
      outcome: "failed",
      userId: user.id,
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
  const redirectSpan = startRequestSpan(requestContext, "redirect_ready", {
    category: "performance",
    operation: "meals.update",
  });
  redirectSpan.stop("info", "meals.update.span.completed", {
    parserStatus: "success",
    userId: user.id,
  });
  logTotalDuration("info", "meals.update.duration", {
    outcome: "succeeded",
    parserStatus: "success",
    userId: user.id,
  });
  return attachRequestId(
    context.redirect(`/dashboard?mealSuccess=${encodeURIComponent("Meal updated with refreshed nutrition")}`),
    requestContext.requestId,
  );
};
