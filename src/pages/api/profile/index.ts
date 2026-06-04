import type { APIRoute } from "astro";
import { attachRequestId, createRequestContext, logRequestEvent } from "@/lib/request-context";
import { getEffectiveDailyCalorieLimit, getTargetCaloriePolicy, getPaceLabel } from "@/lib/nutrition-goals";
import { upsertProfileForUser } from "@/lib/nutrition-records";
import { getValidationMessage, parseProfileFormData } from "@/lib/nutrition-validation";
import { createClient } from "@/lib/supabase";

export const prerender = false;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error != null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Unable to save profile";
}

function parsePreviousTargetPace(formData: FormData) {
  const value = formData.get("previous_target_pace");
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

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

  const previousTargetPace = parsePreviousTargetPace(form);
  const redirectParams = new URLSearchParams();

  try {
    const savedProfile = await upsertProfileForUser(supabase, user.id, parsed.data);

    if (
      previousTargetPace != null &&
      savedProfile.target_pace != null &&
      previousTargetPace !== savedProfile.target_pace
    ) {
      const effectiveLimit = getEffectiveDailyCalorieLimit(savedProfile);
      const targetPolicy = getTargetCaloriePolicy(savedProfile, effectiveLimit);
      const pace = savedProfile.target_pace;
      const paceLabel = getPaceLabel(pace);
      const toastMessage =
        targetPolicy.kind === "guided"
          ? `Pace updated to ${paceLabel}. Recommended healthy edge: ${targetPolicy.comparison === "at_least" ? "at least" : "at most"} ${targetPolicy.healthyEdgeCalories} kcal.`
          : `Pace updated to ${paceLabel}.`;

      redirectParams.set("profileToast", toastMessage);
    } else {
      redirectParams.set("profileSuccess", "Profile saved");
    }

    redirectParams.set("t", `${Date.now()}`);
  } catch (error) {
    logRequestEvent("error", "profile.save.failed", requestContext, {
      category: "supabase",
      message: getErrorMessage(error),
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
  return attachRequestId(context.redirect(`/dashboard?${redirectParams.toString()}`), requestContext.requestId);
};
