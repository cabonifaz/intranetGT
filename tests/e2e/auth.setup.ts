import { test as setup, expect } from "@playwright/test";

const ARCHIVO_AUTH = "tests/e2e/.auth/user.json";

// Inicia sesion UNA vez con el usuario dedicado de pruebas (ver
// .env.test.local) y guarda las cookies/localStorage para que el resto
// de specs del proyecto "chromium" arranquen ya autenticados -- patron
// estandar de Playwright (project dependencies + storageState).
setup("autenticar como usuario de pruebas", async ({ page }) => {
  const usuario = process.env.PLAYWRIGHT_TEST_USER;
  const clave = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!usuario || !clave) {
    throw new Error("Falta PLAYWRIGHT_TEST_USER/PLAYWRIGHT_TEST_PASSWORD en .env.test.local (ver playwright.config.ts).");
  }

  await page.goto("/login");
  await page.locator("#usuario").fill(usuario);
  await page.locator("#clave").fill(clave);
  await page.getByRole("button", { name: "Ingresar" }).click();

  // Timeout largo: primera compilacion en caliente de next dev de la
  // pagina "/" (dashboard) puede tardar bastante la primerisima vez.
  await expect(page).toHaveURL("/", { timeout: 30_000 });
  await page.context().storageState({ path: ARCHIVO_AUTH });
});
