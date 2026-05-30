import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { NutritionDayWindow } from "@/lib/nutrition-day";
import type { MealParserResult } from "@/lib/services/meal-parser";
import type { MealFormInput, MealUpdateFormInput, ProfileFormInput } from "@/lib/nutrition-validation";

type ServerClient = SupabaseClient<Database>;

export type ProfileRecord = Database["public"]["Tables"]["profiles"]["Row"];
export type MealRecord = Database["public"]["Tables"]["meals"]["Row"];
export type MealParserStatus = NonNullable<MealRecord["parser_status"]>;

export interface MealNutritionPersistence {
  calories: number | null;
  carbs: number | null;
  fat: number | null;
  parserAttemptedAt: string | null;
  parserError: string | null;
  parserStatus: MealParserStatus;
  protein: number | null;
}

export interface DailyMealSummary {
  hasParsedMacros: boolean;
  mealCount: number;
  totalCalories: number;
  totalCarbs: number;
  totalFat: number;
  totalProtein: number;
}

function isMissingRowError(error: unknown) {
  return typeof error === "object" && error != null && "code" in error && error.code === "PGRST116";
}

export async function getProfileForUser(client: ServerClient, userId: string) {
  const { data, error } = await client.from("profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfileForUser(client: ServerClient, userId: string, input: ProfileFormInput) {
  const payload: Database["public"]["Tables"]["profiles"]["Insert"] = {
    user_id: userId,
    age: input.age,
    sex: input.sex,
    current_weight: input.currentWeight,
    height: input.height,
    target_weight: input.targetWeight,
    manual_daily_calorie_limit: input.manualDailyCalorieLimit,
  };

  const { data, error } = await client.from("profiles").upsert(payload, { onConflict: "user_id" }).select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getMealForUser(client: ServerClient, userId: string, mealId: string): Promise<MealRecord> {
  const { data, error } = await client.from("meals").select("*").eq("id", mealId).eq("user_id", userId).single();

  if (error) {
    if (isMissingRowError(error)) {
      throw new Error("Meal not found");
    }

    throw error;
  }

  return data;
}

export function getMealNutritionPersistence(result: MealParserResult, now = new Date()): MealNutritionPersistence {
  if (result.status === "success") {
    return {
      calories: result.nutrition.calories,
      carbs: result.nutrition.carbs,
      fat: result.nutrition.fat,
      parserAttemptedAt: now.toISOString(),
      parserError: null,
      parserStatus: "success",
      protein: result.nutrition.protein,
    };
  }

  return {
    calories: null,
    carbs: null,
    fat: null,
    parserAttemptedAt: result.reason === "config_missing" ? null : now.toISOString(),
    parserError: result.message,
    parserStatus: result.reason === "config_missing" ? "skipped" : "failed",
    protein: null,
  };
}

export async function createMealForUser(
  client: ServerClient,
  userId: string,
  input: MealFormInput,
  nutrition: MealNutritionPersistence,
): Promise<MealRecord> {
  const payload: Database["public"]["Tables"]["meals"]["Insert"] = {
    calories: nutrition.calories,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    meal_text: input.mealText,
    parser_attempted_at: nutrition.parserAttemptedAt,
    parser_error: nutrition.parserError,
    parser_status: nutrition.parserStatus,
    protein: nutrition.protein,
    user_id: userId,
  };

  const { data, error } = await client.from("meals").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  return data;
}

export async function retryMealNutritionForUser(
  client: ServerClient,
  userId: string,
  mealId: string,
  nutrition: MealNutritionPersistence,
): Promise<MealRecord> {
  const payload: Database["public"]["Tables"]["meals"]["Update"] = {
    calories: nutrition.calories,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    parser_attempted_at: nutrition.parserAttemptedAt,
    parser_error: nutrition.parserError,
    parser_status: nutrition.parserStatus,
    protein: nutrition.protein,
  };

  const { data, error } = await client
    .from("meals")
    .update(payload)
    .eq("id", mealId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isMissingRowError(error)) {
      throw new Error("Meal not found");
    }

    throw error;
  }

  return data;
}

export async function updateMealForUser(
  client: ServerClient,
  userId: string,
  input: MealUpdateFormInput,
  nutrition: MealNutritionPersistence,
): Promise<MealRecord> {
  const payload: Database["public"]["Tables"]["meals"]["Update"] = {
    calories: nutrition.calories,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    meal_text: input.mealText,
    parser_attempted_at: nutrition.parserAttemptedAt,
    parser_error: nutrition.parserError,
    parser_status: nutrition.parserStatus,
    protein: nutrition.protein,
  };

  const { data, error } = await client
    .from("meals")
    .update(payload)
    .eq("id", input.mealId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    if (isMissingRowError(error)) {
      throw new Error("Meal not found");
    }

    throw error;
  }

  return data;
}

export async function deleteMealForUser(client: ServerClient, userId: string, mealId: string) {
  const { data, error } = await client
    .from("meals")
    .delete()
    .eq("id", mealId)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error) {
    if (isMissingRowError(error)) {
      throw new Error("Meal not found");
    }

    throw error;
  }

  return data;
}

export async function listMealsForUser(client: ServerClient, userId: string, limit = 10) {
  const { data, error } = await client
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .order("consumed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

export async function listMealsForUserOnDay(
  client: ServerClient,
  userId: string,
  dayWindow: NutritionDayWindow,
  // MVP cap: daily totals computed from this list will undercount if a user logs more than 50 meals in a day.
  limit = 50,
) {
  const { data, error } = await client
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gte("consumed_at", dayWindow.startIso)
    .lt("consumed_at", dayWindow.endIso)
    .order("consumed_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
}

export function getDailyMealSummary(meals: MealRecord[]): DailyMealSummary {
  return meals.reduce<DailyMealSummary>(
    (summary, meal) => ({
      hasParsedMacros: summary.hasParsedMacros || meal.parser_status === "success",
      mealCount: summary.mealCount + 1,
      totalCalories: summary.totalCalories + (meal.calories ?? 0),
      totalCarbs: summary.totalCarbs + (meal.carbs ?? 0),
      totalFat: summary.totalFat + (meal.fat ?? 0),
      totalProtein: summary.totalProtein + (meal.protein ?? 0),
    }),
    {
      hasParsedMacros: false,
      mealCount: 0,
      totalCalories: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalProtein: 0,
    },
  );
}
