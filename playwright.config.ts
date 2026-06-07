import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://localhost:4321",
  },
  projects: [
    {
      name: "setup db",
      testMatch: /global\.setup\.ts/,
      teardown: "cleanup db",
    },
    {
      name: "cleanup db",
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: "chromium",
      use: { storageState: "playwright/.auth/user.json" },
      dependencies: ["setup db"],
    },
  ],
});
