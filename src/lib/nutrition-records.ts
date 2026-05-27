import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { MealFormInput, ProfileFormInput } from "@/lib/nutrition-validation";

type ServerClient = SupabaseClient<Database>;

export type ProfileRecord = Database["public"]["Tables"]["profiles"]["Row"];
export type MealRecord = Database["public"]["Tables"]["meals"]["Row"];

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

export async function createMealForUser(client: ServerClient, userId: string, input: MealFormInput) {
  const payload: Database["public"]["Tables"]["meals"]["Insert"] = {
    user_id: userId,
    meal_text: input.mealText,
  };

  const { data, error } = await client.from("meals").insert(payload).select("*").single();

  if (error) {
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
