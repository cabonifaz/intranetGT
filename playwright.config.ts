import { defineConfig, devices } from "@playwright/test";

// .env.test.local trae PLAYWRIGHT_TEST_USER/PASSWORD/BASE_URL -- a
// diferencia del server (que Next.js carga solo desde .env.local), este
// proceso (el test runner) necesita cargarlo el mismo a mano.
try {
  process.loadEnvFile(".env.test.local");
} catch {
  // Falta el archivo -- auth.setup.ts falla con un mensaje claro si de
  // verdad hacen falta las variables.
}

// Corre SIEMPRE contra intranetGT_staging (ver .env.local -- nunca
// produccion) y levanta su propio servidor Next en un puerto aparte
// (PLAYWRIGHT_BASE_URL, default 3100) para no chocar con un `next dev`
// que el desarrollador ya tenga corriendo en el 3000. Usuario de prueba
// dedicado (playwright.test, rol SUPER_ADMIN, solo en staging) en
// .env.test.local -- ver tests/e2e/auth.setup.ts.
const PUERTO = new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100").port || "3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "tests/e2e/.auth/user.json" },
      testIgnore: /.*\.publico\.spec\.ts/,
      dependencies: ["setup"],
    },
    {
      name: "chromium-sin-sesion",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.publico\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PORT: PUERTO },
  },
});
