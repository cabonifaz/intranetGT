import { test, expect } from "@playwright/test";

// Los 4 flujos de firma publica (sin sesion) comparten el mismo
// contrato de guard: un token con forma valida (TOKEN_FIRMA es CHAR(36),
// formato UUID) pero inexistente siempre muestra "Link no disponible",
// nunca un error 500 -- ver auditoria de seguridad: cada uno revalida
// token+estado+vencimiento en servidor en cada visita, no solo al
// generar el link.
const TOKEN_INEXISTENTE = "00000000-0000-0000-0000-000000000000";
const RUTAS_FIRMA_PUBLICA = [
  `/contratos/firmar/${TOKEN_INEXISTENTE}`,
  `/prestamos/firmar/${TOKEN_INEXISTENTE}`,
  `/conformidades/firmar/${TOKEN_INEXISTENTE}`,
  `/boletas/firmar/${TOKEN_INEXISTENTE}`,
];

for (const ruta of RUTAS_FIRMA_PUBLICA) {
  test(`token invalido en ${ruta} muestra "Link no disponible", no un error`, async ({ page }) => {
    const respuesta = await page.goto(ruta);
    expect(respuesta?.status()).toBeLessThan(500);
    await expect(page.getByRole("heading", { name: "Link no disponible" })).toBeVisible();
  });
}

test("las rutas publicas de firma no exigen sesion (no redirigen a /login)", async ({ page }) => {
  await page.goto(`/conformidades/firmar/${TOKEN_INEXISTENTE}`);
  await expect(page).not.toHaveURL(/\/login/);
});

// Un token con forma invalida (ni UUID) no debe tumbar la pagina con un
// 500 -- antes del fix en src/lib/validar-token.ts, pasarle un token mas
// largo que CHAR(36) producia "Data too long for column 'p_token'" sin
// manejar, visible como un error crudo en las 4 rutas publicas.
test("un token con forma invalida (no UUID) tambien muestra Link no disponible, no un 500", async ({ page }) => {
  const respuesta = await page.goto("/conformidades/firmar/esto-no-tiene-forma-de-uuid-y-es-mas-largo-que-36");
  expect(respuesta?.status()).toBeLessThan(500);
  await expect(page.getByRole("heading", { name: "Link no disponible" })).toBeVisible();
});
