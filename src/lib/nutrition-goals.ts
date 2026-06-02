import type { DailyMealSummary, ProfileRecord } from "@/lib/nutrition-records";

const ACTIVITY_MULTIPLIERS = {
  low: 1.2,
  normal: 1.375,
  high: 1.55,
} as const;
const KCAL_PER_KILOGRAM = 7700;
const MINIMUM_HEALTHY_CALORIES = {
  female: 1200,
  male: 1500,
  other: 1200,
  prefer_not_to_say: 1200,
} as const;
const NEAR_LIMIT_RATIO = 0.9;
const TARGET_PACE_BANDS = {
  gain: {
    slow: 0.25,
    normal: 0.4,
    fast: 0.5,
  },
  loss: {
    slow: 0.25,
    normal: 0.5,
    fast: 0.9,
  },
} as const;

function getActivityMultiplier(activityLevel: ProfileRecord["activity_level"]): number {
  if (!activityLevel || activityLevel === "normal") return ACTIVITY_MULTIPLIERS.normal;
  if (activityLevel === "low") return ACTIVITY_MULTIPLIERS.low;
  if (activityLevel === "high") return ACTIVITY_MULTIPLIERS.high;
  return ACTIVITY_MULTIPLIERS.normal;
}

export type DailyCalorieWarningState = "normal" | "near_limit" | "over_limit" | "unavailable";
export type EffectiveDailyCalorieLimit =
  | {
      calories: number;
      kind: "automatic";
      sourceLabel: string;
      recommendedCalories?: number;
      recommendedLabel?: string;
    }
  | {
      calories: number;
      kind: "manual";
      sourceLabel: string;
      recommendedCalories?: number;
      recommendedLabel?: string;
    }
  | {
      calories: null;
      kind: "unavailable";
      missingFields: string[];
      sourceLabel: string;
    };

export type NutritionGoalDirection = "gain" | "loss" | "maintain" | "no_direction" | "unknown";
export type TargetPaceMode = NonNullable<ProfileRecord["target_pace"]>;
export type TargetPolicyComparison = "at_least" | "at_most";
export type TargetPolicyComparisonStatus = "within_healthy_edge" | "outside_healthy_edge";

export interface DailyCalorieWarning {
  consumedCalories: number;
  limitCalories: number | null;
  remainingCalories: number | null;
  status: DailyCalorieWarningState;
}

interface TargetPolicyBase {
  activeLimitCalories: number | null;
  activeLimitKind: EffectiveDailyCalorieLimit["kind"];
  activeLimitSourceLabel: string;
  advisoryLabel: string;
  boundaryLabel: string | null;
  comparison: TargetPolicyComparison | null;
  direction: NutritionGoalDirection;
  healthyEdgeClamped: boolean;
  healthyEdgeCalories: number | null;
  healthyEdgeLabel: string | null;
  selectedPace: ProfileRecord["target_pace"];
  weeklyRateKg: number | null;
}

export type TargetCaloriePolicy =
  | (TargetPolicyBase & {
      kind: "guided";
      comparison: TargetPolicyComparison;
      comparisonStatus: TargetPolicyComparisonStatus;
      direction: "gain" | "loss";
      healthyEdgeCalories: number;
      healthyEdgeLabel: string;
      selectedPace: TargetPaceMode;
      weeklyRateKg: number;
    })
  | (TargetPolicyBase & {
      kind: "incomplete";
      direction: "unknown";
      missingFields: string[];
    })
  | (TargetPolicyBase & {
      kind: "maintain";
      direction: "maintain";
    })
  | (TargetPolicyBase & {
      kind: "no_direction";
      direction: "no_direction";
    })
  | (TargetPolicyBase & {
      kind: "pace_missing";
      direction: "gain" | "loss";
    });

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

function getMaintenanceCalories(profile: ProfileRecord | null) {
  const missingFields = getMissingFields(profile);

  if (missingFields.length > 0 || profile == null) {
    return null;
  }

  const basalMetabolicRate =
    10 * profile.current_weight + 6.25 * profile.height - 5 * profile.age + getSexConstant(profile.sex);

  return roundCalories(basalMetabolicRate * getActivityMultiplier(profile.activity_level));
}

function getPaceLabel(pace: TargetPaceMode) {
  if (pace === "slow") {
    return "Slow";
  }

  if (pace === "normal") {
    return "Normal";
  }

  return "Fast";
}

function getMinimumHealthyCalories(sex: NonNullable<ProfileRecord["sex"]>) {
  return MINIMUM_HEALTHY_CALORIES[sex];
}

function getDailyCalorieDeltaForPace(weeklyRateKg: number) {
  return roundCalories((weeklyRateKg * KCAL_PER_KILOGRAM) / 7);
}

export function getNutritionGoalDirection(profile: ProfileRecord | null): NutritionGoalDirection {
  if (profile?.current_weight == null) {
    return "unknown";
  }

  if (profile.target_weight == null) {
    return "no_direction";
  }

  if (profile.target_weight === profile.current_weight) {
    return "maintain";
  }

  return profile.target_weight < profile.current_weight ? "loss" : "gain";
}

export function getEffectiveDailyCalorieLimit(profile: ProfileRecord | null): EffectiveDailyCalorieLimit {
  const missingFields = getMissingFields(profile);
  const maintenanceCalories = getMaintenanceCalories(profile);

  if (missingFields.length > 0 || maintenanceCalories == null) {
    return {
      calories: null,
      kind: "unavailable",
      missingFields,
      sourceLabel: "Complete profile to unlock calorie limit",
    };
  }

  const direction = getNutritionGoalDirection(profile);

  // If manual limit is set
  if (profile?.manual_daily_calorie_limit != null) {
    const result: EffectiveDailyCalorieLimit = {
      calories: profile.manual_daily_calorie_limit,
      kind: "manual",
      sourceLabel: "Manual limit",
    };

    // If there's also a target_pace, add recommendation
    if (profile.target_pace != null && (direction === "gain" || direction === "loss")) {
      const weeklyRateKg = TARGET_PACE_BANDS[direction][profile.target_pace];
      const dailyCalorieDelta = getDailyCalorieDeltaForPace(weeklyRateKg);
      const recommendedCalories =
        direction === "loss"
          ? roundCalories(Math.max(getMinimumHealthyCalories(profile.sex), maintenanceCalories - dailyCalorieDelta))
          : roundCalories(maintenanceCalories + dailyCalorieDelta);
      const paceLabel = getPaceLabel(profile.target_pace).toLowerCase();
      result.recommendedCalories = recommendedCalories;
      result.recommendedLabel = `For ${paceLabel} ${direction}, the recommended limit is ${recommendedCalories} kcal.`;
    }

    return result;
  }

  // No manual limit - use automatic based on target_pace or direction
  if (direction === "maintain" || direction === "no_direction" || direction === "unknown") {
    return {
      calories: maintenanceCalories,
      kind: "automatic",
      sourceLabel: "Automatic estimate",
    };
  }

  // Has a goal (gain or loss)
  const pace = profile.target_pace ?? "normal";
  const weeklyRateKg = TARGET_PACE_BANDS[direction][pace];
  const dailyCalorieDelta = getDailyCalorieDeltaForPace(weeklyRateKg);
  const automaticCalories =
    direction === "loss"
      ? roundCalories(Math.max(getMinimumHealthyCalories(profile.sex), maintenanceCalories - dailyCalorieDelta))
      : roundCalories(maintenanceCalories + dailyCalorieDelta);

  return {
    calories: automaticCalories,
    kind: "automatic",
    sourceLabel: "Automatic estimate",
  };
}

export function getTargetCaloriePolicy(
  profile: ProfileRecord | null,
  effectiveLimit: EffectiveDailyCalorieLimit,
): TargetCaloriePolicy {
  const missingFields = getMissingFields(profile);
  const maintenanceCalories = getMaintenanceCalories(profile);
  const activeLimitCalories = effectiveLimit.kind === "unavailable" ? null : effectiveLimit.calories;
  const direction = getNutritionGoalDirection(profile);

  if (missingFields.length > 0 || maintenanceCalories == null || direction === "unknown") {
    return {
      kind: "incomplete",
      activeLimitCalories,
      activeLimitKind: effectiveLimit.kind,
      activeLimitSourceLabel: effectiveLimit.sourceLabel,
      advisoryLabel: `Complete ${missingFields.join(", ")} to unlock evidence-based goal guidance.`,
      boundaryLabel: null,
      comparison: null,
      direction: "unknown",
      healthyEdgeClamped: false,
      healthyEdgeCalories: null,
      healthyEdgeLabel: null,
      missingFields,
      selectedPace: profile?.target_pace ?? null,
      weeklyRateKg: null,
    };
  }

  if (direction === "no_direction") {
    return {
      kind: "no_direction",
      activeLimitCalories,
      activeLimitKind: effectiveLimit.kind,
      activeLimitSourceLabel: effectiveLimit.sourceLabel,
      advisoryLabel: "Set a target weight to see the recommended healthy edge for your goal.",
      boundaryLabel: null,
      comparison: null,
      direction,
      healthyEdgeClamped: false,
      healthyEdgeCalories: null,
      healthyEdgeLabel: null,
      selectedPace: profile.target_pace,
      weeklyRateKg: null,
    };
  }

  if (direction === "maintain") {
    return {
      kind: "maintain",
      activeLimitCalories,
      activeLimitKind: effectiveLimit.kind,
      activeLimitSourceLabel: effectiveLimit.sourceLabel,
      advisoryLabel: "Current and target weight match, so no pace-based healthy edge applies.",
      boundaryLabel: null,
      comparison: null,
      direction,
      healthyEdgeClamped: false,
      healthyEdgeCalories: null,
      healthyEdgeLabel: null,
      selectedPace: profile.target_pace,
      weeklyRateKg: null,
    };
  }

  if (profile.target_pace == null) {
    return {
      kind: "pace_missing",
      activeLimitCalories,
      activeLimitKind: effectiveLimit.kind,
      activeLimitSourceLabel: effectiveLimit.sourceLabel,
      advisoryLabel: "Pick a target pace to see the recommended healthy edge for your goal.",
      boundaryLabel: null,
      comparison: null,
      direction,
      healthyEdgeClamped: false,
      healthyEdgeCalories: null,
      healthyEdgeLabel: null,
      selectedPace: null,
      weeklyRateKg: null,
    };
  }

  const weeklyRateKg = TARGET_PACE_BANDS[direction][profile.target_pace];
  const dailyCalorieDelta = getDailyCalorieDeltaForPace(weeklyRateKg);
  const rawHealthyEdgeCalories =
    direction === "loss" ? maintenanceCalories - dailyCalorieDelta : maintenanceCalories + dailyCalorieDelta;
  const minimumHealthyCalories = getMinimumHealthyCalories(profile.sex);
  const healthyEdgeCalories =
    direction === "loss"
      ? roundCalories(Math.max(minimumHealthyCalories, rawHealthyEdgeCalories))
      : roundCalories(rawHealthyEdgeCalories);
  const healthyEdgeClamped = direction === "loss" && rawHealthyEdgeCalories < minimumHealthyCalories;
  const boundaryLabel = direction === "loss" ? "Minimum healthy limit" : "Maximum healthy limit";
  const comparison: TargetPolicyComparison = direction === "loss" ? "at_least" : "at_most";
  const comparisonStatus =
    direction === "loss"
      ? activeLimitCalories != null && activeLimitCalories >= healthyEdgeCalories
        ? "within_healthy_edge"
        : "outside_healthy_edge"
      : activeLimitCalories != null && activeLimitCalories <= healthyEdgeCalories
        ? "within_healthy_edge"
        : "outside_healthy_edge";
  const healthyEdgeLabel =
    direction === "loss"
      ? `Set at least ${healthyEdgeCalories} kcal to stay within the recommended healthy edge for your goal.`
      : `Set at most ${healthyEdgeCalories} kcal to stay within the recommended healthy edge for your goal.`;
  const paceLabel = getPaceLabel(profile.target_pace).toLowerCase();
  const advisoryLabel =
    comparisonStatus === "within_healthy_edge"
      ? `${effectiveLimit.sourceLabel} stays within the recommended healthy edge for ${paceLabel} ${direction}.`
      : `${effectiveLimit.sourceLabel} sits outside the recommended healthy edge for ${paceLabel} ${direction}.`;

  return {
    kind: "guided",
    activeLimitCalories,
    activeLimitKind: effectiveLimit.kind,
    activeLimitSourceLabel: effectiveLimit.sourceLabel,
    advisoryLabel,
    boundaryLabel,
    comparison,
    comparisonStatus,
    direction,
    healthyEdgeClamped,
    healthyEdgeCalories,
    healthyEdgeLabel,
    selectedPace: profile.target_pace,
    weeklyRateKg,
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
