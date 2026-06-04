import { describe, expect, it } from "vitest";
import {
  getDailyCalorieWarning,
  type DailyCalorieWarning,
  type EffectiveDailyCalorieLimit,
} from "@/lib/nutrition-goals";

describe("test harness smoke", () => {
  it("computes near_limit at 90% threshold", () => {
    const summary = {
      hasParsedMacros: true,
      mealCount: 1,
      totalCalories: 900,
      totalCarbs: 100,
      totalFat: 20,
      totalProtein: 60,
    };

    const effectiveLimit: EffectiveDailyCalorieLimit = {
      calories: 1000,
      kind: "automatic",
      sourceLabel: "Automatic estimate",
    };

    const warning: DailyCalorieWarning = getDailyCalorieWarning(summary, effectiveLimit);

    expect(warning.status).toBe("near_limit");
    expect(warning.remainingCalories).toBe(100);
  });
});
