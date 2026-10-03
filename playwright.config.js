import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    env: {
      APP_PASSWORD: "password123",
      SESSION_SECRET: "browser-tests-only-secret-32-characters",
      UPDATER_TOKEN: "browser-tests-only-updater",
      APP_ORIGIN: "http://localhost:5173",
      DATA_DIR: "/tmp/observatory-browser-tests",
      COOKIE_SECURE: "false",
    },
  },
  reporter: "list",
});
