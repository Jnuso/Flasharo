import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL: "http://localhost:3000", headless: true },
  timeout: 45_000,
  expect: { timeout: 10_000 },
});
