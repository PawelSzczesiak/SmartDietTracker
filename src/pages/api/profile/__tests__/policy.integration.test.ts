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
import { createClient } from "@/lib/supabase";
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

function buildUnauthenticatedContext(pathname: string, formData: FormData) {
  return {
    request: new Request(`http://localhost${pathname}`, { method: "POST", body: formData }),
    locals: {},
    cookies: {},
    redirect: (location: string) => new Response(null, { status: 302, headers: { Location: location } }),
  } as Parameters<typeof profileRoute>[0];
}

function getRedirectUrl(response: Response) {
  const location = response.headers.get("Location") ?? "";
  return new URL(location, "http://localhost");
}

describe("profile policy integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createClient).mockReturnValue({ mocked: true } as never);
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
    const location = getRedirectUrl(response);

    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("profileToast")).toBeTruthy();
    expect(location.searchParams.get("profileError")).toBeNull();
  });

  it("redirects unauthenticated requests to sign-in", async () => {
    const form = baseForm();
    const response = await profileRoute(buildUnauthenticatedContext("/api/profile", form));
    const location = getRedirectUrl(response);

    expect(location.pathname).toBe("/auth/signin");
    expect(location.searchParams.get("profileSuccess")).toBeNull();
    expect(location.searchParams.get("profileToast")).toBeNull();
  });

  it("returns profileError when supabase configuration is missing", async () => {
    vi.mocked(createClient).mockReturnValueOnce(null);

    const form = baseForm();
    const response = await profileRoute(buildPostContext("/api/profile", form));
    const location = getRedirectUrl(response);

    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("profileError")).toBe("Supabase is not configured");
    expect(location.searchParams.get("profileSuccess")).toBeNull();
    expect(location.searchParams.get("profileToast")).toBeNull();
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
    const location = getRedirectUrl(response);

    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.get("profileSuccess")).toBe("Profile saved");
    expect(location.searchParams.get("profileToast")).toBeNull();
  });
});
