import { OPENROUTER_API_KEY, OPENROUTER_MODEL } from "astro:env/server";
import { z } from "zod";

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4.1-mini";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 28_000;

const openRouterResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.unknown(),
      }),
    }),
  ),
});

const openRouterErrorSchema = z.object({
  error: z.object({
    message: z.string().trim().min(1).optional(),
  }),
});

const parsedNutritionSchema = z.union([
  z.object({
    status: z.literal("success"),
    calories: z.coerce
      .number()
      .nonnegative()
      .transform((value) => Math.round(value)),
    protein: z.coerce
      .number()
      .nonnegative()
      .transform((value) => Math.round(value * 100) / 100),
    carbs: z.coerce
      .number()
      .nonnegative()
      .transform((value) => Math.round(value * 100) / 100),
    fat: z.coerce
      .number()
      .nonnegative()
      .transform((value) => Math.round(value * 100) / 100),
  }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.string().trim().min(1).max(240).optional(),
  }),
]);

const parsedNutritionArraySchema = z.array(parsedNutritionSchema).min(1);

export interface ParsedMealNutrition {
  calories: number;
  carbs: number;
  fat: number;
  protein: number;
}

export type MealParserUnavailableReason = "config_missing" | "invalid_response" | "provider_error" | "timeout";

export type MealParserResult =
  | {
      nutrition: ParsedMealNutrition;
      status: "success";
    }
  | {
      detail?: string;
      message: string;
      providerStatus?: number;
      reason: MealParserUnavailableReason;
      status: "unavailable";
    };

function truncateDetail(detail: string, maxLength = 400) {
  return detail.length <= maxLength ? detail : `${detail.slice(0, maxLength - 1)}...`;
}

function isTextContentPart(part: unknown): part is { text: string } {
  if (typeof part !== "object" || part == null) {
    return false;
  }

  const candidate = part as Record<string, unknown>;
  return typeof candidate.text === "string";
}

function getAssistantContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (isTextContentPart(part)) {
          return part.text;
        }

        return "";
      })
      .join("");
  }

  return null;
}

function stripMarkdownCodeFence(content: string) {
  const trimmed = content.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function normalizeParsedNutritionPayload(payload: unknown): z.infer<typeof parsedNutritionSchema> {
  const directResult = parsedNutritionSchema.safeParse(payload);

  if (directResult.success) {
    return directResult.data;
  }

  const arrayResult = parsedNutritionArraySchema.safeParse(payload);

  if (arrayResult.success) {
    return arrayResult.data[0];
  }

  throw directResult.error;
}

function getUnavailableResult(
  reason: MealParserUnavailableReason,
  message: string,
  options: {
    detail?: string;
    providerStatus?: number;
  } = {},
): MealParserResult {
  return {
    detail: options.detail,
    message,
    providerStatus: options.providerStatus,
    reason,
    status: "unavailable",
  };
}

export function isMealParserConfigured() {
  return Boolean(OPENROUTER_API_KEY);
}

export async function parseMealNutrition(mealText: string): Promise<MealParserResult> {
  if (!isMealParserConfigured()) {
    return getUnavailableResult("config_missing", "Nutrition parsing is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
        temperature: 0,
        response_format: {
          type: "json_object",
        },
        messages: [
          {
            role: "system",
            content:
              "You extract approximate meal nutrition from free-text descriptions. Return only one JSON object, never an array. " +
              'Use {"status":"success","calories":number,"protein":number,"carbs":number,"fat":number} ' +
              'when you can estimate nutrition. Use {"status":"unavailable","reason":"short explanation"} ' +
              "when the description is too ambiguous to estimate responsibly.",
          },
          {
            role: "user",
            content: `Estimate nutrition for this meal description: ${mealText}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const providerBody = truncateDetail(await response.text());
      return getUnavailableResult(
        "provider_error",
        `Nutrition provider request failed with status ${response.status}.`,
        {
          detail: providerBody,
          providerStatus: response.status,
        },
      );
    }

    const rawResponseBody = await response.text();
    const parsedPayload = JSON.parse(rawResponseBody) as unknown;
    const providerError = openRouterErrorSchema.safeParse(parsedPayload);

    if (providerError.success) {
      return getUnavailableResult(
        "provider_error",
        providerError.data.error.message ?? "Nutrition provider returned an error.",
        {
          detail: truncateDetail(rawResponseBody),
          providerStatus: response.status,
        },
      );
    }

    const payload = openRouterResponseSchema.parse(parsedPayload);
    const content = getAssistantContent(payload.choices[0]?.message.content);

    if (!content) {
      return getUnavailableResult("invalid_response", "Nutrition provider returned an empty response.");
    }

    const parsedNutrition = normalizeParsedNutritionPayload(JSON.parse(stripMarkdownCodeFence(content)));

    if (parsedNutrition.status === "unavailable") {
      return getUnavailableResult(
        "invalid_response",
        parsedNutrition.reason ?? "Nutrition data is unavailable for this meal.",
      );
    }

    return {
      nutrition: {
        calories: parsedNutrition.calories,
        carbs: parsedNutrition.carbs,
        fat: parsedNutrition.fat,
        protein: parsedNutrition.protein,
      },
      status: "success",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return getUnavailableResult("timeout", "Nutrition parsing timed out.");
    }

    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      return getUnavailableResult("invalid_response", "Nutrition provider returned an invalid response.", {
        detail: truncateDetail(error.message),
      });
    }

    return getUnavailableResult(
      "provider_error",
      error instanceof Error ? error.message : "Nutrition provider request failed.",
      {
        detail: error instanceof Error ? truncateDetail(error.stack ?? error.message) : undefined,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
