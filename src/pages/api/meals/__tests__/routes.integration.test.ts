import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/request-context", () => ({
  attachRequestId: (response: Response) => response,
  createRequestContext: () => ({ requestId: "req-test" }),
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
    updateMealForUser: vi.fn(),
  };
});

import {
  createMealForUser,
  getMealForUser,
  retryMealNutritionForUser,
  updateMealForUser,
} from "@/lib/nutrition-records";
import { parseMealNutrition } from "@/lib/services/meal-parser";
import { POST as createMealRoute } from "@/pages/api/meals/index";
import { POST as retryMealRoute } from "@/pages/api/meals/retry";
import { POST as updateMealRoute } from "@/pages/api/meals/update";
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

describe("meal route integration semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createMealForUser).mockResolvedValue({
      id: "meal-1",
    } as never);
    vi.mocked(updateMealForUser).mockResolvedValue({
      id: "meal-1",
    } as never);
    vi.mocked(retryMealNutritionForUser).mockResolvedValue({
      id: "meal-1",
    } as never);
  });

  it("create route returns success redirect and persists success parser status", async () => {
    vi.mocked(parseMealNutrition).mockResolvedValue({
      status: "success",
      nutrition: {
        calories: 600,
        protein: 40,
        carbs: 55,
        fat: 20,
      },
    });
    const form = new FormData();
    form.set("meal_text", "chicken rice bowl");

    const response = await createMealRoute(buildPostContext("/api/meals", form));
    const flags = getRedirectFlags(response);

    expect(flags.mealSuccess).toBe(true);
    expect(flags.mealWarning).toBe(false);
    expect(flags.mealError).toBe(false);
    expect(createMealForUser).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      { mealText: "chicken rice bowl" },
      expect.objectContaining({ parserStatus: "success", calories: 600 }),
    );
  });

  it("create route returns warning redirect and persists failed parser status on unavailable", async () => {
    vi.mocked(parseMealNutrition).mockResolvedValue({
      status: "unavailable",
      reason: "timeout",
      message: "Nutrition parsing timed out.",
    });
    const form = new FormData();
    form.set("meal_text", "ambiguous meal");

    const response = await createMealRoute(buildPostContext("/api/meals", form));
    const flags = getRedirectFlags(response);

    expect(flags.mealWarning).toBe(true);
    expect(flags.mealSuccess).toBe(false);
    expect(flags.mealError).toBe(false);
    expect(createMealForUser).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      { mealText: "ambiguous meal" },
      expect.objectContaining({ parserStatus: "failed", parserError: "Nutrition parsing timed out." }),
    );
  });

  it("update route returns warning redirect and persists failed parser status on unavailable", async () => {
    vi.mocked(parseMealNutrition).mockResolvedValue({
      status: "unavailable",
      reason: "provider_error",
      message: "provider unavailable",
    });
    const form = new FormData();
    form.set("meal_id", "b7e927ad-7ca5-4eb0-a781-005f4de3f324");
    form.set("meal_text", "edited meal");

    const response = await updateMealRoute(buildPostContext("/api/meals/update", form));
    const flags = getRedirectFlags(response);

    expect(flags.mealWarning).toBe(true);
    expect(flags.mealSuccess).toBe(false);
    expect(flags.mealError).toBe(false);
    expect(updateMealForUser).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      {
        mealId: "b7e927ad-7ca5-4eb0-a781-005f4de3f324",
        mealText: "edited meal",
      },
      expect.objectContaining({ parserStatus: "failed", parserError: "provider unavailable" }),
    );
  });

  it("retry route returns success when previously failed meal parses successfully", async () => {
    vi.mocked(getMealForUser).mockResolvedValue({
      id: "b7e927ad-7ca5-4eb0-a781-005f4de3f324",
      meal_text: "saved meal",
      parser_status: "failed",
    } as never);
    vi.mocked(parseMealNutrition).mockResolvedValue({
      status: "success",
      nutrition: {
        calories: 480,
        protein: 30,
        carbs: 40,
        fat: 16,
      },
    });
    const form = new FormData();
    form.set("meal_id", "b7e927ad-7ca5-4eb0-a781-005f4de3f324");

    const response = await retryMealRoute(buildPostContext("/api/meals/retry", form));
    const flags = getRedirectFlags(response);

    expect(flags.mealSuccess).toBe(true);
    expect(flags.mealWarning).toBe(false);
    expect(flags.mealError).toBe(false);
    expect(retryMealNutritionForUser).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "b7e927ad-7ca5-4eb0-a781-005f4de3f324",
      expect.objectContaining({ parserStatus: "success", calories: 480 }),
    );
  });

  it("retry route prevents false success when meal already has nutrition", async () => {
    vi.mocked(getMealForUser).mockResolvedValue({
      id: "b7e927ad-7ca5-4eb0-a781-005f4de3f324",
      meal_text: "saved meal",
      parser_status: "success",
    } as never);
    const form = new FormData();
    form.set("meal_id", "b7e927ad-7ca5-4eb0-a781-005f4de3f324");

    const response = await retryMealRoute(buildPostContext("/api/meals/retry", form));
    const flags = getRedirectFlags(response);

    expect(flags.mealError).toBe(true);
    expect(flags.mealSuccess).toBe(false);
    expect(flags.mealWarning).toBe(false);
    expect(retryMealNutritionForUser).not.toHaveBeenCalled();
  });
});
