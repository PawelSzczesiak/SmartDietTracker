import { describe, expect, it } from "vitest";
import {
  getDailyCalorieWarning,
  getEffectiveDailyCalorieLimit,
  getNutritionGoalDirection,
  getTargetCaloriePolicy,
  type EffectiveDailyCalorieLimit,
} from "@/lib/nutrition-goals";
import type { ProfileRecord } from "@/lib/nutrition-records";

const baseProfile: ProfileRecord = {
  user_id: "user-1",
  age: 30,
  sex: "male",
  current_weight: 80,
  height: 180,
  target_weight: 75,
  target_pace: "normal",
  manual_daily_calorie_limit: null,
  activity_level: "normal",
  created_at: "2026-06-02T00:00:00.000Z",
  updated_at: "2026-06-02T00:00:00.000Z",
};

const baseSummary = {
  hasParsedMacros: true,
  mealCount: 1,
  totalCalories: 0,
  totalCarbs: 0,
  totalFat: 0,
  totalProtein: 0,
};

describe("getDailyCalorieWarning boundaries", () => {
  const automaticLimit: EffectiveDailyCalorieLimit = {
    calories: 1000,
    kind: "automatic",
    sourceLabel: "Automatic estimate",
  };

  it("returns normal below 90% threshold", () => {
    const warning = getDailyCalorieWarning(
      {
        ...baseSummary,
        totalCalories: 899,
      },
      automaticLimit,
    );

    expect(warning.status).toBe("normal");
    expect(warning.remainingCalories).toBe(101);
  });

  it("returns near_limit at exactly 90% threshold", () => {
    const warning = getDailyCalorieWarning(
      {
        ...baseSummary,
        totalCalories: 900,
      },
      automaticLimit,
    );

    expect(warning.status).toBe("near_limit");
    expect(warning.remainingCalories).toBe(100);
  });

  it("keeps near_limit at exact limit", () => {
    const warning = getDailyCalorieWarning(
      {
        ...baseSummary,
        totalCalories: 1000,
      },
      automaticLimit,
    );

    expect(warning.status).toBe("near_limit");
    expect(warning.remainingCalories).toBe(0);
  });

  it("returns over_limit only above limit", () => {
    const warning = getDailyCalorieWarning(
      {
        ...baseSummary,
        totalCalories: 1001,
      },
      automaticLimit,
    );

    expect(warning.status).toBe("over_limit");
    expect(warning.remainingCalories).toBe(-1);
  });
});

describe("goal direction and effective limit policy", () => {
  it("returns no_direction when target weight is missing", () => {
    expect(getNutritionGoalDirection({ ...baseProfile, target_weight: null })).toBe("no_direction");
  });

  it("returns maintain when target equals current", () => {
    expect(getNutritionGoalDirection({ ...baseProfile, target_weight: 80 })).toBe("maintain");
  });

  it("keeps manual limit as active budget and exposes recommendation", () => {
    const limit = getEffectiveDailyCalorieLimit({
      ...baseProfile,
      manual_daily_calorie_limit: 1800,
      target_pace: "fast",
    });

    expect(limit.kind).toBe("manual");
    if (limit.kind !== "manual") {
      throw new Error("Expected manual limit");
    }
    expect(limit.calories).toBe(1800);
    expect(limit.recommendedCalories).toBeTypeOf("number");
  });

  it("uses automatic estimate for maintain flow when manual is absent", () => {
    const limit = getEffectiveDailyCalorieLimit({
      ...baseProfile,
      target_weight: 80,
      target_pace: null,
    });

    expect(limit.kind).toBe("automatic");
    if (limit.kind !== "automatic") {
      throw new Error("Expected automatic limit");
    }
    expect(limit.calories).toBeGreaterThan(0);
  });
});

describe("target policy branches", () => {
  it("returns incomplete when required fields are missing", () => {
    const profile: ProfileRecord = {
      ...baseProfile,
      age: null,
      height: null,
    };
    const effective = getEffectiveDailyCalorieLimit(profile);
    const policy = getTargetCaloriePolicy(profile, effective);

    expect(policy.kind).toBe("incomplete");
  });

  it("returns pace_missing for loss/gain goal without selected pace", () => {
    const profile: ProfileRecord = {
      ...baseProfile,
      target_pace: null,
    };
    const effective = getEffectiveDailyCalorieLimit(profile);
    const policy = getTargetCaloriePolicy(profile, effective);

    expect(policy.kind).toBe("pace_missing");
  });

  it("returns guided with at_least comparison for loss direction", () => {
    const profile: ProfileRecord = {
      ...baseProfile,
      target_weight: 75,
      target_pace: "normal",
    };
    const effective: EffectiveDailyCalorieLimit = {
      calories: 1800,
      kind: "manual",
      sourceLabel: "Manual limit",
    };

    const policy = getTargetCaloriePolicy(profile, effective);

    expect(policy.kind).toBe("guided");
    if (policy.kind !== "guided") {
      throw new Error("Expected guided policy");
    }
    expect(policy.direction).toBe("loss");
    expect(policy.comparison).toBe("at_least");
  });

  it("returns guided with at_most comparison for gain direction", () => {
    const profile: ProfileRecord = {
      ...baseProfile,
      target_weight: 85,
      target_pace: "normal",
    };
    const effective: EffectiveDailyCalorieLimit = {
      calories: 3600,
      kind: "manual",
      sourceLabel: "Manual limit",
    };

    const policy = getTargetCaloriePolicy(profile, effective);

    expect(policy.kind).toBe("guided");
    if (policy.kind !== "guided") {
      throw new Error("Expected guided policy");
    }
    expect(policy.direction).toBe("gain");
    expect(policy.comparison).toBe("at_most");
  });
});
