import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/request-context", () => ({
  attachRequestId: (response: Response) => response,
  createRequestContext: () => ({ requestId: "req-abuse" }),
  logRequestDuration: vi.fn(),
  logRequestEvent: vi.fn(),
  startRequestSpan: () => ({ stop: vi.fn() }),
  startRequestTimer: () => new Date(),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({ mocked: true })),
}));

vi.mock("@/lib/services/meal-parser", () => ({
  parseMealNutrition: vi.fn(),
}));

vi.mock("@/lib/nutrition-records", async () => {
  const actual = await vi.importActual<typeof import("@/lib/nutrition-records")>("@/lib/nutrition-records");
  return {
    ...actual,
    createMealForUser: vi.fn(),
    getMealForUser: vi.fn(),
    retryMealNutritionForUser: vi.fn(),
  };
});

import { createMealForUser, getMealForUser, retryMealNutritionForUser } from "@/lib/nutrition-records";
import { createClient } from "@/lib/supabase";
import { parseMealNutrition } from "@/lib/services/meal-parser";
import { POST as createMealRoute } from "@/pages/api/meals/index";
import { POST as retryMealRoute } from "@/pages/api/meals/retry";
import { buildPostContext, getRedirectLocation } from "@/test/setup/route-integration";

function getRedirectFlags(response: Response) {
  const location = getRedirectLocation(response);
  const params = new URL(location, "http://localhost").searchParams;
  return {
    mealSuccess: params.has("mealSuccess"),
    mealWarning: params.has("mealWarning"),
    mealError: params.has("mealError"),
  };
}

function buildMealForm(mealText: string) {
  const form = new FormData();
  form.set("meal_text", mealText);
  return form;
}

function buildRetryForm(mealId: string) {
  const form = new FormData();
  form.set("meal_id", mealId);
  return form;
}

describe("meal abuse guardrails", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createClient).mockReturnValue({ mocked: true } as never);
  });

  it("keeps a 5-action burst warning-only across repeated meal submit and retry flows", async () => {
    const mealStore = new Map<
      string,
      {
        id: string;
        meal_text: string;
        parser_status: "failed" | "success" | "skipped";
        parser_error: string | null;
        parser_attempted_at: string | null;
      }
    >();
    const mealIds = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "33333333-3333-4333-8333-333333333333",
    ];
    let mealCounter = 0;
    let parserCall = 0;
    const parserOutcomes = [
      {
        status: "unavailable" as const,
        reason: "timeout" as const,
        message: "Nutrition parsing timed out.",
      },
      {
        status: "unavailable" as const,
        reason: "provider_error" as const,
        message: "provider unavailable",
      },
      {
        status: "unavailable" as const,
        reason: "timeout" as const,
        message: "Nutrition parsing timed out.",
      },
      {
        status: "unavailable" as const,
        reason: "provider_error" as const,
        message: "provider unavailable",
      },
      {
        status: "unavailable" as const,
        reason: "timeout" as const,
        message: "Nutrition parsing timed out.",
      },
    ];

    vi.mocked(parseMealNutrition).mockImplementation(() => {
      const outcome = parserOutcomes[parserCall];
      parserCall += 1;
      return Promise.resolve(outcome);
    });

    vi.mocked(createMealForUser).mockImplementation((_client, _userId, input, nutrition) => {
      const id = mealIds[mealCounter];
      mealCounter += 1;
      mealStore.set(id, {
        id,
        meal_text: input.mealText,
        parser_status: nutrition.parserStatus,
        parser_error: nutrition.parserError,
        parser_attempted_at: nutrition.parserAttemptedAt,
      });

      return { id } as never;
    });

    vi.mocked(getMealForUser).mockImplementation((_client, _userId, mealId) => {
      const meal = mealStore.get(mealId);
      if (!meal) {
        throw new Error("Meal not found");
      }

      return meal as never;
    });

    vi.mocked(retryMealNutritionForUser).mockImplementation((_client, _userId, mealId, nutrition) => {
      const meal = mealStore.get(mealId);
      if (!meal) {
        throw new Error("Meal not found");
      }

      const updated = {
        ...meal,
        parser_status: nutrition.parserStatus,
        parser_error: nutrition.parserError,
        parser_attempted_at: nutrition.parserAttemptedAt,
      };
      mealStore.set(mealId, updated);

      return updated as never;
    });

    const createResponse1 = await createMealRoute(buildPostContext("/api/meals", buildMealForm("burst meal 1")));
    const createId1 = mealIds[0];
    const retryResponse1 = await retryMealRoute(buildPostContext("/api/meals/retry", buildRetryForm(createId1)));
    const createResponse2 = await createMealRoute(buildPostContext("/api/meals", buildMealForm("burst meal 2")));
    const createId2 = mealIds[1];
    const retryResponse2 = await retryMealRoute(buildPostContext("/api/meals/retry", buildRetryForm(createId2)));
    const createResponse3 = await createMealRoute(buildPostContext("/api/meals", buildMealForm("burst meal 3")));

    const responses = [createResponse1, retryResponse1, createResponse2, retryResponse2, createResponse3];
    const flags = responses.map(getRedirectFlags);

    expect(flags).toEqual([
      { mealSuccess: false, mealWarning: true, mealError: false },
      { mealSuccess: false, mealWarning: true, mealError: false },
      { mealSuccess: false, mealWarning: true, mealError: false },
      { mealSuccess: false, mealWarning: true, mealError: false },
      { mealSuccess: false, mealWarning: true, mealError: false },
    ]);
    expect(vi.mocked(parseMealNutrition)).toHaveBeenCalledTimes(5);
    expect(vi.mocked(createMealForUser)).toHaveBeenCalledTimes(3);
    expect(vi.mocked(retryMealNutritionForUser)).toHaveBeenCalledTimes(2);
    expect(mealStore.get(createId1)?.parser_status).toBe("failed");
    expect(mealStore.get(createId2)?.parser_status).toBe("failed");
  });
});
