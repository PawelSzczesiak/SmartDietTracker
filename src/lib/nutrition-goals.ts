import type { DailyMealSummary, ProfileRecord } from "@/lib/nutrition-records";

const ACTIVITY_FACTOR = 1.35;
const NEAR_LIMIT_RATIO = 0.9;

export type DailyCalorieWarningState = "normal" | "near_limit" | "over_limit" | "unavailable";
export type EffectiveDailyCalorieLimit =
  | {
      calories: number;
      kind: "automatic";
      sourceLabel: string;
    }
  | {
      calories: number;
      kind: "manual";
      sourceLabel: string;
    }
  | {
      calories: null;
      kind: "unavailable";
      missingFields: string[];
      sourceLabel: string;
    };

export interface DailyCalorieWarning {
  consumedCalories: number;
  limitCalories: number | null;
  remainingCalories: number | null;
  status: DailyCalorieWarningState;
}

function roundCalories(value: number) {
  return Math.max(0, Math.round(value));
}

function getSexConstant(sex: ProfileRecord["sex"]) {
  if (sex === "male") {
    return 5;
  }

  if (sex === "female") {
    return -161;
  }

  return -78;
}

function getMissingFields(profile: ProfileRecord | null) {
  const missingFields: string[] = [];

  if (profile?.age == null) {
    missingFields.push("age");
  }

  if (profile?.sex == null) {
    missingFields.push("sex");
  }

  if (profile?.current_weight == null) {
    missingFields.push("current weight");
  }

  if (profile?.height == null) {
    missingFields.push("height");
  }

  return missingFields;
}

export function getEffectiveDailyCalorieLimit(profile: ProfileRecord | null): EffectiveDailyCalorieLimit {
  if (profile?.manual_daily_calorie_limit != null) {
    return {
      calories: profile.manual_daily_calorie_limit,
      kind: "manual",
      sourceLabel: "Manual limit",
    };
  }

  const missingFields = getMissingFields(profile);

  if (missingFields.length > 0 || profile == null) {
    return {
      calories: null,
      kind: "unavailable",
      missingFields,
      sourceLabel: "Complete profile to unlock calorie limit",
    };
  }

  const basalMetabolicRate =
    10 * profile.current_weight + 6.25 * profile.height - 5 * profile.age + getSexConstant(profile.sex);

  return {
    calories: roundCalories(basalMetabolicRate * ACTIVITY_FACTOR),
    kind: "automatic",
    sourceLabel: "Automatic estimate",
  };
}

export function getDailyCalorieWarning(
  summary: DailyMealSummary,
  effectiveLimit: EffectiveDailyCalorieLimit,
): DailyCalorieWarning {
  if (effectiveLimit.kind === "unavailable") {
    return {
      consumedCalories: summary.totalCalories,
      limitCalories: null,
      remainingCalories: null,
      status: "unavailable",
    };
  }

  const remainingCalories = effectiveLimit.calories - summary.totalCalories;

  if (summary.totalCalories > effectiveLimit.calories) {
    return {
      consumedCalories: summary.totalCalories,
      limitCalories: effectiveLimit.calories,
      remainingCalories,
      status: "over_limit",
    };
  }

  if (summary.totalCalories >= effectiveLimit.calories * NEAR_LIMIT_RATIO) {
    return {
      consumedCalories: summary.totalCalories,
      limitCalories: effectiveLimit.calories,
      remainingCalories,
      status: "near_limit",
    };
  }

  return {
    consumedCalories: summary.totalCalories,
    limitCalories: effectiveLimit.calories,
    remainingCalories,
    status: "normal",
  };
}
