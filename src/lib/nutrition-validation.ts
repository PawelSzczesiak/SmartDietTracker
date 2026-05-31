import { z } from "zod";

type ProfileSex = "male" | "female" | "other" | "prefer_not_to_say";
type TargetPace = "slow" | "normal" | "fast";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function nullableNumberField(label: string, options: { int?: boolean; min?: number; max?: number } = {}) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value ?? null;
      }

      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    },
    z.coerce
      .number({
        error: `${label} must be a valid number`,
      })
      .refine((value) => (!options.int ? true : Number.isInteger(value)), {
        message: `${label} must be a whole number`,
      })
      .refine((value) => (options.min === undefined ? true : value >= options.min), {
        message: `${label} must be at least ${options.min}`,
      })
      .refine((value) => (options.max === undefined ? true : value <= options.max), {
        message: `${label} must be at most ${options.max}`,
      })
      .nullable(),
  );
}

const profileSchema = z
  .object({
    age: nullableNumberField("Age", { int: true, min: 0, max: 150 }),
    sex: z.preprocess(
      (value) => {
        if (typeof value !== "string") {
          return value ?? null;
        }

        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      },
      z.enum(["male", "female", "other", "prefer_not_to_say"] satisfies [ProfileSex, ...ProfileSex[]]).nullable(),
    ),
    current_weight: nullableNumberField("Current weight", { min: 0.01 }),
    height: nullableNumberField("Height", { min: 0.01 }),
    target_weight: nullableNumberField("Target weight", { min: 0.01 }),
    target_pace: z.preprocess(
      (value) => {
        if (typeof value !== "string") {
          return value ?? null;
        }

        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed;
      },
      z.enum(["slow", "normal", "fast"] satisfies [TargetPace, ...TargetPace[]]).nullable(),
    ),
    manual_daily_calorie_limit: nullableNumberField("Manual daily calorie limit", { int: true, min: 1 }),
  })
  .transform((values) => ({
    age: values.age,
    sex: values.sex,
    currentWeight: values.current_weight,
    height: values.height,
    targetWeight: values.target_weight,
    targetPace: values.target_pace,
    manualDailyCalorieLimit: values.manual_daily_calorie_limit,
  }));

const mealSchema = z
  .object({
    meal_text: z
      .string()
      .trim()
      .min(1, "Meal description is required")
      .max(2000, "Meal description must be 2000 characters or fewer"),
  })
  .transform((values) => ({
    mealText: values.meal_text,
  }));

const mealMutationIdSchema = z
  .object({
    meal_id: z.uuid("Meal reference is invalid"),
  })
  .transform((values) => ({
    mealId: values.meal_id,
  }));

const mealUpdateSchema = z
  .object({
    meal_id: z.uuid("Meal reference is invalid"),
    meal_text: z
      .string()
      .trim()
      .min(1, "Meal description is required")
      .max(2000, "Meal description must be 2000 characters or fewer"),
  })
  .transform((values) => ({
    mealId: values.meal_id,
    mealText: values.meal_text,
  }));

export type ProfileFormInput = z.output<typeof profileSchema>;
export type MealFormInput = z.output<typeof mealSchema>;
export type MealMutationIdInput = z.output<typeof mealMutationIdSchema>;
export type MealUpdateFormInput = z.output<typeof mealUpdateSchema>;

export function parseProfileFormData(formData: FormData) {
  return profileSchema.safeParse({
    age: getFormValue(formData, "age"),
    sex: getFormValue(formData, "sex"),
    current_weight: getFormValue(formData, "current_weight"),
    height: getFormValue(formData, "height"),
    target_weight: getFormValue(formData, "target_weight"),
    target_pace: getFormValue(formData, "target_pace"),
    manual_daily_calorie_limit: getFormValue(formData, "manual_daily_calorie_limit"),
  });
}

export function parseMealFormData(formData: FormData) {
  return mealSchema.safeParse({
    meal_text: getFormValue(formData, "meal_text"),
  });
}

export function parseMealMutationIdFormData(formData: FormData) {
  return mealMutationIdSchema.safeParse({
    meal_id: getFormValue(formData, "meal_id"),
  });
}

export function parseMealUpdateFormData(formData: FormData) {
  return mealUpdateSchema.safeParse({
    meal_id: getFormValue(formData, "meal_id"),
    meal_text: getFormValue(formData, "meal_text"),
  });
}

export function getValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Invalid form submission";
}
