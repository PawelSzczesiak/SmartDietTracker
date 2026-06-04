import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/request-context", () => ({
  attachRequestId: (response: Response) => response,
  createRequestContext: () => ({ requestId: "req-policy" }),
  logRequestEvent: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => ({ mocked: true })),
}));

vi.mock("@/lib/nutrition-records", () => ({
  upsertProfileForUser: vi.fn(),
}));

import { upsertProfileForUser } from "@/lib/nutrition-records";
import { POST as profileRoute } from "@/pages/api/profile/index";
import { buildPostContext } from "@/test/setup/route-integration";

function baseForm() {
  const form = new FormData();
  form.set("age", "30");
  form.set("sex", "male");
  form.set("current_weight", "80");
  form.set("height", "180");
  form.set("target_weight", "75");
  form.set("manual_daily_calorie_limit", "1700");
  form.set("activity_level", "normal");
  return form;
}

describe("profile policy integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns profileToast when target pace changes", async () => {
    vi.mocked(upsertProfileForUser).mockResolvedValue({
      user_id: "user-1",
      age: 30,
      sex: "male",
      current_weight: 80,
      height: 180,
      target_weight: 75,
      target_pace: "fast",
      manual_daily_calorie_limit: 1700,
      activity_level: "normal",
      created_at: "2026-06-02T00:00:00.000Z",
      updated_at: "2026-06-02T00:00:00.000Z",
    } as never);

    const form = baseForm();
    form.set("target_pace", "fast");
    form.set("previous_target_pace", "normal");

    const response = await profileRoute(buildPostContext("/api/profile", form));
    const location = response.headers.get("Location") ?? "";

    expect(location).toContain("profileToast=");
    expect(location).not.toContain("profileError=");
  });

  it("returns profileSuccess when pace is unchanged", async () => {
    vi.mocked(upsertProfileForUser).mockResolvedValue({
      user_id: "user-1",
      age: 30,
      sex: "male",
      current_weight: 80,
      height: 180,
      target_weight: 75,
      target_pace: "normal",
      manual_daily_calorie_limit: 1700,
      activity_level: "normal",
      created_at: "2026-06-02T00:00:00.000Z",
      updated_at: "2026-06-02T00:00:00.000Z",
    } as never);

    const form = baseForm();
    form.set("target_pace", "normal");
    form.set("previous_target_pace", "normal");

    const response = await profileRoute(buildPostContext("/api/profile", form));
    const location = response.headers.get("Location") ?? "";

    expect(location).toContain("profileSuccess=");
    expect(location).not.toContain("profileToast=");
  });
});
