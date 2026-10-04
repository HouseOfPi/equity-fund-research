import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5201",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:5201",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "",
      APP_PASSWORD: "password123",
      SESSION_SECRET: "browser-tests-only-secret-32-characters",
      UPDATER_TOKEN: "browser-tests-only-updater",
      APP_ORIGIN: "http://127.0.0.1:5201",
      DATA_DIR: "/tmp/observatory-browser-tests",
      COOKIE_SECURE: "false",
      PORT: "5201",
      NODE_ENV: "test",
    },
  },
  reporter: "list",
});
