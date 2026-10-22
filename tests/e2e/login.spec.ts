import { test, expect } from "@playwright/test";

// Sin sesion -- se corre en el proyecto "chromium" (que normalmente ya
// trae storageState autenticado via auth.setup.ts), asi que cada test
// pisa el storageState con uno vacio para arrancar realmente desconectado.
test.use({ storageState: { cookies: [], origins: [] } });

test("una ruta protegida sin sesion redirige a /login", async ({ page }) => {
  await page.goto("/rrhh/directorio");
  await expect(page).toHaveURL(/\/login/);
});

test("clave incorrecta muestra un error generico, sin decir si el usuario existe", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#usuario").fill("usuario-que-no-existe-xyz");
  await page.locator("#clave").fill("cualquier-clave-123");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByText(/usuario o clave incorrectos/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("usuario y clave correctos entra y llega al dashboard", async ({ page }) => {
  const usuario = process.env.PLAYWRIGHT_TEST_USER;
  const clave = process.env.PLAYWRIGHT_TEST_PASSWORD;
  test.skip(!usuario || !clave, "Falta PLAYWRIGHT_TEST_USER/PASSWORD en .env.test.local");

  await page.goto("/login");
  await page.locator("#usuario").fill(usuario!);
  await page.locator("#clave").fill(clave!);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL("/");
});
