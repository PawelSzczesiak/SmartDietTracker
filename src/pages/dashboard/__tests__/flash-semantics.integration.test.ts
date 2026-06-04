import { describe, expect, it } from "vitest";
import { getDashboardFlashMessages } from "@/pages/dashboard/flash-messages";

describe("dashboard flash semantics", () => {
  it("maps mealWarning to warning variant (not success)", () => {
    const params = new URLSearchParams({
      mealWarning: "Nutrition unavailable",
    });

    const result = getDashboardFlashMessages(params, null);

    expect(result).toEqual([
      {
        message: "Nutrition unavailable",
        prefix: "Meals",
        variant: "warning",
      },
    ]);
    expect(result.some((message) => message.variant === "success")).toBe(false);
  });

  it("maps mealSuccess to success variant", () => {
    const params = new URLSearchParams({
      mealSuccess: "Meal saved with nutrition details",
    });

    const result = getDashboardFlashMessages(params, null);

    expect(result).toEqual([
      {
        message: "Meal saved with nutrition details",
        variant: "success",
      },
    ]);
  });

  it("keeps dashboardError as error variant and preserves message order", () => {
    const params = new URLSearchParams({
      profileError: "Profile invalid",
      mealWarning: "Meal warning",
      mealSuccess: "Meal ok",
    });

    const result = getDashboardFlashMessages(params, "Dashboard load failed");

    expect(result).toEqual([
      { message: "Dashboard load failed", variant: "error" },
      { message: "Profile invalid", prefix: "Profile", variant: "error" },
      { message: "Meal warning", prefix: "Meals", variant: "warning" },
      { message: "Meal ok", variant: "success" },
    ]);
  });
});
