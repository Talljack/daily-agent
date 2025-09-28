import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  retries: 0,
  timeout: 60000
});
