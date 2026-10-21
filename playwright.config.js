import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    headless: true,
    launchOptions: process.env.FINCA_CHROMIUM_EXECUTABLE_PATH ? {
      executablePath: process.env.FINCA_CHROMIUM_EXECUTABLE_PATH,
      args: ["--no-zygote", "--disable-dev-shm-usage"]
    } : {}
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI
  }
});
