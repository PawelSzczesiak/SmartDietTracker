import { afterEach, describe, expect, it, vi } from "vitest";
import { parserContractCases } from "@/test/fixtures/parser-contract/cases";

async function importParserWithEnv(apiKey: string | undefined) {
  vi.resetModules();
  vi.doMock("astro:env/server", () => ({
    OPENROUTER_API_KEY: apiKey,
    OPENROUTER_MODEL: "openai/gpt-4.1-mini",
  }));

  return import("@/lib/services/meal-parser");
}

describe("parseMealNutrition", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it.each(parserContractCases)("parses oracle case: $name", async ({ providerResponse, expected }) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response(JSON.stringify(providerResponse), { status: 200 }))),
    );
    const { parseMealNutrition } = await importParserWithEnv("test-key");

    const result = await parseMealNutrition("grilled chicken with rice and olive oil");

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Expected parser success");
    }
    expect(result.nutrition).toEqual(expected);
  });

  it("returns explicit config_missing when parser key is absent", async () => {
    const { parseMealNutrition } = await importParserWithEnv(undefined);

    const result = await parseMealNutrition("any meal");

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "config_missing",
    });
  });

  it("maps timeout abort to timeout unavailable result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new DOMException("Aborted", "AbortError");
      }),
    );
    const { parseMealNutrition } = await importParserWithEnv("test-key");

    const result = await parseMealNutrition("meal that times out");

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "timeout",
      message: "Nutrition parsing timed out.",
    });
  });

  it("maps provider non-2xx into provider_error unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("bad gateway", { status: 502 }))),
    );
    const { parseMealNutrition } = await importParserWithEnv("test-key");

    const result = await parseMealNutrition("meal with provider error");

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "provider_error",
      providerStatus: 502,
    });
  });

  it("maps malformed payload into invalid_response unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: "not-a-json-payload" } }],
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const { parseMealNutrition } = await importParserWithEnv("test-key");

    const result = await parseMealNutrition("adversarial malformed response");

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "invalid_response",
    });
  });
});
