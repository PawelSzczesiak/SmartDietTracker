import type { DailyCalorieWarning } from "@/lib/nutrition-goals";
import type { MealRecord } from "@/lib/nutrition-records";

const PERSONALIZATION_THRESHOLD = 10;
const DEFAULT_SUGGESTION_LIMIT = 3;

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "bo",
  "by",
  "czy",
  "da",
  "dla",
  "do",
  "for",
  "from",
  "i",
  "in",
  "jak",
  "jest",
  "juz",
  "już",
  "lub",
  "na",
  "nie",
  "of",
  "or",
  "po",
  "the",
  "to",
  "w",
  "with",
  "z",
  "ze",
]);

export type FoodSuggestionState = "hidden_over_limit" | "hidden_unavailable" | "visible_suggestions";
export type FoodSuggestionMode = "fallback" | "personalized" | null;
export type FoodSuggestionsReason = "insufficient_catalog" | "over_limit" | "unavailable" | null;

export interface FoodSuggestion {
  calories: number;
  id: string;
  name: string;
  tags: readonly string[];
}

export interface FoodTokenReadiness {
  isPersonalizationReady: boolean;
  tokens: string[];
  uniqueTokenCount: number;
}

export interface FoodSuggestionsResult {
  items: FoodSuggestion[];
  mode: FoodSuggestionMode;
  reason: FoodSuggestionsReason;
  remainingCalories: number | null;
  state: FoodSuggestionState;
}

export interface FoodSuggestionsInput {
  calorieWarning: DailyCalorieWarning;
  meals: MealRecord[];
  suggestionLimit?: number;
}

export const FOOD_SUGGESTION_CATALOG: readonly FoodSuggestion[] = [
  { id: "skyr-berries", name: "Skyr z owocami", calories: 180, tags: ["skyr", "jogurt", "berries", "fruit"] },
  { id: "omelette-spinach", name: "Omlet ze szpinakiem", calories: 320, tags: ["egg", "omelette", "spinach"] },
  { id: "chicken-rice", name: "Kurczak z ryżem", calories: 520, tags: ["chicken", "rice"] },
  { id: "salmon-potatoes", name: "Łosoś z ziemniakami", calories: 560, tags: ["salmon", "fish", "potato"] },
  { id: "cottage-salad", name: "Serek wiejski z sałatką", calories: 250, tags: ["cottage", "cheese", "salad"] },
  { id: "tuna-wrap", name: "Wrap z tuńczykiem", calories: 410, tags: ["tuna", "wrap", "tortilla"] },
  { id: "tofu-bowl", name: "Tofu bowl", calories: 430, tags: ["tofu", "rice", "vegetables"] },
  { id: "oatmeal-banana", name: "Owsianka z bananem", calories: 350, tags: ["oatmeal", "banana", "porridge"] },
  { id: "greek-salad", name: "Sałatka grecka", calories: 290, tags: ["salad", "feta", "vegetables"] },
  { id: "lentil-soup", name: "Zupa z soczewicy", calories: 300, tags: ["lentil", "soup"] },
  { id: "protein-sandwich", name: "Kanapka proteinowa", calories: 340, tags: ["bread", "ham", "turkey", "sandwich"] },
  { id: "shrimp-pasta", name: "Makaron z krewetkami", calories: 610, tags: ["shrimp", "pasta"] },
  { id: "beef-stir-fry", name: "Beef stir-fry", calories: 540, tags: ["beef", "stirfry", "vegetables"] },
  { id: "hummus-veggies", name: "Hummus i warzywa", calories: 220, tags: ["hummus", "vegetables"] },
  { id: "yogurt-nuts", name: "Jogurt z orzechami", calories: 260, tags: ["yogurt", "nuts"] },
] as const;

function normalizeToken(token: string) {
  return token
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function extractMealTextTokens(mealText: string) {
  return mealText
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizeToken)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function getSortedUniqueTokens(tokens: string[]) {
  return [...new Set(tokens)].sort((left, right) => left.localeCompare(right));
}

function getOverlapScore(tags: readonly string[], tokenSet: Set<string>) {
  let score = 0;

  for (const tag of tags) {
    const normalizedTag = normalizeToken(tag);

    if (tokenSet.has(normalizedTag)) {
      score += 1;
    }
  }

  return score;
}

function getSuggestionSeed(meals: MealRecord[]) {
  const fingerprint = meals
    .map((meal) => `${meal.id}:${meal.updated_at}`)
    .sort((left, right) => left.localeCompare(right))
    .join("|");

  let hash = 0;
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash = (hash * 31 + fingerprint.charCodeAt(index)) % 2147483647;
  }

  return hash;
}

function rotateSuggestions(items: FoodSuggestion[], seed: number) {
  if (items.length <= 1) {
    return items;
  }

  const offset = Math.abs(seed) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function rankFallbackSuggestions(items: FoodSuggestion[], remainingCalories: number) {
  return [...items].sort((left, right) => {
    const leftDistance = Math.abs(remainingCalories - left.calories);
    const rightDistance = Math.abs(remainingCalories - right.calories);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    if (left.calories !== right.calories) {
      return left.calories - right.calories;
    }

    return left.id.localeCompare(right.id);
  });
}

function buildHistorySuggestions(meals: MealRecord[]) {
  const byNormalizedText = new Map<string, FoodSuggestion>();

  for (const meal of meals) {
    if (meal.parser_status !== "success" || meal.calories == null || meal.calories <= 0) {
      continue;
    }

    const tokens = getSortedUniqueTokens(extractMealTextTokens(meal.meal_text));
    if (tokens.length === 0) {
      continue;
    }

    const normalizedName = normalizeToken(meal.meal_text);
    if (!normalizedName) {
      continue;
    }

    if (!byNormalizedText.has(normalizedName)) {
      byNormalizedText.set(normalizedName, {
        calories: Math.round(meal.calories),
        id: `history-${meal.id}`,
        name: meal.meal_text.trim(),
        tags: tokens.slice(0, 6),
      });
    }
  }

  return [...byNormalizedText.values()];
}

function rankPersonalizedHistorySuggestions(
  items: FoodSuggestion[],
  tokenSet: Set<string>,
  remainingCalories: number,
  seed: number,
) {
  const sorted = [...items].sort((left, right) => {
    const leftScore = getOverlapScore(left.tags, tokenSet);
    const rightScore = getOverlapScore(right.tags, tokenSet);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const leftDistance = Math.abs(remainingCalories - left.calories);
    const rightDistance = Math.abs(remainingCalories - right.calories);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    return left.name.localeCompare(right.name);
  });

  return rotateSuggestions(sorted, seed);
}

function limitSuggestions(items: FoodSuggestion[], suggestionLimit: number) {
  return items.slice(0, Math.max(1, suggestionLimit));
}

export function getFoodTokenReadiness(meals: MealRecord[]): FoodTokenReadiness {
  const successfulMeals = meals.filter((meal) => meal.parser_status === "success");
  const tokens = successfulMeals.flatMap((meal) => extractMealTextTokens(meal.meal_text));
  const uniqueTokens = getSortedUniqueTokens(tokens);

  return {
    isPersonalizationReady: uniqueTokens.length >= PERSONALIZATION_THRESHOLD,
    tokens: uniqueTokens,
    uniqueTokenCount: uniqueTokens.length,
  };
}

export function getFoodSuggestionsForRemainingBudget(input: FoodSuggestionsInput): FoodSuggestionsResult {
  const { calorieWarning, meals, suggestionLimit = DEFAULT_SUGGESTION_LIMIT } = input;

  if (calorieWarning.status === "unavailable" || calorieWarning.remainingCalories == null) {
    return {
      items: [],
      mode: null,
      reason: "unavailable",
      remainingCalories: null,
      state: "hidden_unavailable",
    };
  }

  if (calorieWarning.remainingCalories <= 0) {
    return {
      items: [],
      mode: null,
      reason: "over_limit",
      remainingCalories: calorieWarning.remainingCalories,
      state: "hidden_over_limit",
    };
  }

  const readiness = getFoodTokenReadiness(meals);
  const mode: FoodSuggestionMode = readiness.isPersonalizationReady ? "personalized" : "fallback";
  const tokenSet = new Set(readiness.tokens);
  const remaining = calorieWarning.remainingCalories;
  const fallbackCandidates = FOOD_SUGGESTION_CATALOG.filter((item) => item.calories <= remaining);

  let ranked: FoodSuggestion[] = [];
  if (mode === "personalized") {
    const historyCandidates = buildHistorySuggestions(meals).filter((item) => item.calories <= remaining);
    ranked = rankPersonalizedHistorySuggestions(historyCandidates, tokenSet, remaining, getSuggestionSeed(meals));
  } else {
    ranked = rankFallbackSuggestions(fallbackCandidates, remaining);
  }

  let items = limitSuggestions(ranked, suggestionLimit);
  if (items.length < suggestionLimit) {
    const existingIds = new Set(items.map((item) => item.id));
    const fallbackFill = rankFallbackSuggestions(fallbackCandidates, remaining).filter(
      (item) => !existingIds.has(item.id),
    );
    items = limitSuggestions([...items, ...fallbackFill], suggestionLimit);
  }

  return {
    items,
    mode,
    reason: items.length < suggestionLimit ? "insufficient_catalog" : null,
    remainingCalories: remaining,
    state: "visible_suggestions",
  };
}
