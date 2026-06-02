import { strict as assert } from "assert";
import { getActivityMultiplier, getMaintenanceCalories, getEffectiveDailyCalorieLimit } from "./nutrition-goals.ts";

// Mock ProfileRecord for testing
interface TestProfile {
  age: number | null;
  sex: "male" | "female" | null;
  current_weight: number | null;
  height: number | null;
  target_weight: number | null;
  target_pace: "slow" | "normal" | "fast" | null;
  activity_level: "low" | "normal" | "high" | null;
  manual_daily_calorie_limit: number | null;
}

console.log("Testing nutrition-goals.ts functions...\n");

// Test 1: getActivityMultiplier with different activity levels
console.log("Test 1: getActivityMultiplier()");
assert.strictEqual(getActivityMultiplier("low"), 1.2, "Low activity should be 1.2");
assert.strictEqual(getActivityMultiplier("normal"), 1.375, "Normal activity should be 1.375");
assert.strictEqual(getActivityMultiplier("high"), 1.55, "High activity should be 1.55");
assert.strictEqual(getActivityMultiplier(null), 1.375, "Null activity should default to normal (1.375)");
console.log("✅ All getActivityMultiplier tests passed\n");

// Test 2: getMaintenanceCalories with activity levels
console.log("Test 2: getMaintenanceCalories() with activity levels");

// Test case: Male, 80kg, 180cm, 30y
const maleProfile: TestProfile = {
  age: 30,
  sex: "male",
  current_weight: 80,
  height: 180,
  target_weight: null,
  target_pace: null,
  activity_level: "normal",
  manual_daily_calorie_limit: null,
};

const maintenanceNormal = getMaintenanceCalories(maleProfile);
console.log(`Male 80kg 180cm 30y, activity=normal: ${maintenanceNormal} kcal`);
assert(maintenanceNormal > 0, "Maintenance calories should be positive");
assert(maintenanceNormal > 2300 && maintenanceNormal < 2500, "Expected ~2400 kcal for normal activity");

// Same profile but low activity
const maleProfileLow = { ...maleProfile, activity_level: "low" as const };
const maintenanceLow = getMaintenanceCalories(maleProfileLow);
console.log(`Male 80kg 180cm 30y, activity=low: ${maintenanceLow} kcal`);
assert(maintenanceLow < maintenanceNormal, "Low activity should result in lower maintenance calories");

// Same profile but high activity
const maleProfileHigh = { ...maleProfile, activity_level: "high" as const };
const maintenanceHigh = getMaintenanceCalories(maleProfileHigh);
console.log(`Male 80kg 180cm 30y, activity=high: ${maintenanceHigh} kcal`);
assert(maintenanceHigh > maintenanceNormal, "High activity should result in higher maintenance calories");

console.log("✅ All getMaintenanceCalories tests passed\n");

// Test 3: Missing fields handling
console.log("Test 3: Missing required fields returns null");
const incompleteProfile: TestProfile = {
  age: null, // missing
  sex: "male",
  current_weight: 80,
  height: 180,
  target_weight: null,
  target_pace: null,
  activity_level: "normal",
  manual_daily_calorie_limit: null,
};

const incompleteCalories = getMaintenanceCalories(incompleteProfile);
assert.strictEqual(incompleteCalories, null, "Should return null when required fields are missing");
console.log("✅ Missing fields test passed\n");

// Test 4: Sex field null handling (new logic)
console.log("Test 4: Sex field null (average multiplier) handling");
const noSexProfile: TestProfile = {
  age: 30,
  sex: null, // No sex specified
  current_weight: 80,
  height: 180,
  target_weight: null,
  target_pace: null,
  activity_level: "normal",
  manual_daily_calorie_limit: null,
};

const maintenanceNoSex = getMaintenanceCalories(noSexProfile);
console.log(`Profile with no sex specified: ${maintenanceNoSex} kcal`);
assert(maintenanceNoSex > 0, "Should calculate calories even without sex");
// Expected: (1500 + 1200) / 2 = 1350 min instead of 1500 (male) or 1200 (female)
console.log("✅ Null sex handling test passed\n");

// Test 5: Effective daily calorie limit with activity level impact
console.log("Test 5: getEffectiveDailyCalorieLimit() with activity levels");
const gainProfile: TestProfile = {
  age: 30,
  sex: "male",
  current_weight: 70,
  height: 180,
  target_weight: 80, // Gain goal
  target_pace: "normal",
  activity_level: "normal",
  manual_daily_calorie_limit: null,
};

const limitGain = getEffectiveDailyCalorieLimit(gainProfile);
assert(limitGain.calories !== null && limitGain.calories > 0, "Should return positive calorie limit for gain goal");
assert(limitGain.kind === "automatic", "Should be automatic limit when no manual limit");
console.log(`Gain goal with normal pace: ${limitGain.calories} kcal`);

// Loss goal
const lossProfile: TestProfile = {
  ...gainProfile,
  target_weight: 60, // Loss goal
};

const limitLoss = getEffectiveDailyCalorieLimit(lossProfile);
assert(limitLoss.calories !== null && limitLoss.calories > 0, "Should return positive calorie limit for loss goal");
assert(limitLoss.calories < 2000, "Loss goal should result in lower limit");
console.log(`Loss goal with normal pace: ${limitLoss.calories} kcal`);

console.log("✅ Effective daily calorie limit test passed\n");

console.log("═".repeat(50));
console.log("✅ ALL TESTS PASSED");
console.log("═".repeat(50));
