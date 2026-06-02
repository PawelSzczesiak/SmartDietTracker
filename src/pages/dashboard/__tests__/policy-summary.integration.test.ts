import { describe, expect, it } from "vitest";
import { getDailyCalorieWarning, getEffectiveDailyCalorieLimit, getTargetCaloriePolicy } from "@/lib/nutrition-goals";
import { getDailyMealSummary } from "@/lib/nutrition-records";
import type { ProfileRecord } from "@/lib/nutrition-records";

const baseProfile: ProfileRecord = {
  user_id: "user-1",
  age: 29,
  sex: "female",
  current_weight: 70,
  height: 168,
  target_weight: 63,
  target_pace: "normal",
  manual_daily_calorie_limit: null,
  activity_level: "normal",
  created_at: "2026-06-02T00:00:00.000Z",
  updated_at: "2026-06-02T00:00:00.000Z",
};

describe("dashboard policy summary integration", () => {
  it("propagates profile + meals into near_limit warning at 90% boundary", () => {
    const effective = getEffectiveDailyCalorieLimit(baseProfile);
    if (effective.kind === "unavailable") {
      throw new Error("Expected available limit");
    }
    const targetCalories = Math.ceil(effective.calories * 0.9);
    const meals = [
      {
        id: "meal-1",
        user_id: "user-1",
        meal_text: "lunch",
        consumed_at: "2026-06-02T12:00:00.000Z",
        calories: targetCalories,
        protein: 30,
        carbs: 80,
        fat: 20,
        parser_status: "success",
        parser_error: null,
        parser_attempted_at: "2026-06-02T12:00:00.000Z",
        created_at: "2026-06-02T12:00:00.000Z",
        updated_at: "2026-06-02T12:00:00.000Z",
      },
    ];

    const summary = getDailyMealSummary(meals);
    const warning = getDailyCalorieWarning(summary, effective);

    expect(warning.status).toBe("near_limit");
  });

  it("keeps manual limit active while policy advisory can be outside healthy edge", () => {
    const profile: ProfileRecord = {
      ...baseProfile,
      manual_daily_calorie_limit: 900,
      target_pace: "fast",
      target_weight: 65,
    };

    const effective = getEffectiveDailyCalorieLimit(profile);
    const policy = getTargetCaloriePolicy(profile, effective);

    expect(effective.kind).toBe("manual");
    expect(policy.kind).toBe("guided");
    if (policy.kind !== "guided") {
      throw new Error("Expected guided policy");
    }
    expect(policy.comparisonStatus).toBe("outside_healthy_edge");
  });
});
