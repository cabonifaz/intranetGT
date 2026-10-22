import { test, expect } from "@playwright/test";

// Flujo BORRADOR -> PRESENTADA del modulo de Impuestos. Usa un año muy a
// futuro (nunca colisiona con un periodo real ni con otra corrida de
// este mismo test) para que SP_DECLARACION_TRIBUTARIA_CREAR, que es
// idempotente por periodo, nunca reutilice una fila de una corrida
// anterior a medio terminar.
const ANIO_PRUEBA = 2090 + Math.floor(Math.random() * 9);

test("crear una declaracion mensual, cargar montos y presentarla", async ({ page }) => {
  await page.goto("/facturacion/impuestos/nueva");

  await page.locator("#anio").fill(String(ANIO_PRUEBA));
  await page.locator("#mes").selectOption("3");
  await page.locator("#fechaVencimiento").fill("2090-04-14");
  await page.getByRole("button", { name: "Crear declaracion" }).click();

  await expect(page).toHaveURL(/\/facturacion\/impuestos\/\d+$/);
  await expect(page.getByRole("heading", { name: /IGV \+ Renta mensual.*Marzo/i })).toBeVisible();

  // Carga de montos -- IGV resultante negativo (saldo a favor) y nada
  // por pagar, para no depender de que exista una cuenta bancaria fija
  // en staging.
  await page.locator("#igvResultante").fill("-150.50");
  await page.locator("#montoTotalAPagar").fill("0");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado.")).toBeVisible();

  await page.getByRole("button", { name: "Marcar como presentada" }).click();

  // El paso "Presentada" del stepper siempre queda marcado como hecho
  // (tooltip con la fecha, via title) independientemente de si tambien
  // hubo aviso de "sin cuenta IGV_FAVOR" -- esto es lo que de verdad
  // confirma que el estado avanzo, sin depender de un mensaje efimero.
  await expect(page.getByTitle(/^Presentada: Presentada el/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como presentada" })).toHaveCount(0);
});

test("una declaracion con tipo DJ anual no muestra el campo de mes", async ({ page }) => {
  await page.goto("/facturacion/impuestos/nueva");
  await page.locator("#idTipoDeclaracion").selectOption({ label: "Declaracion Jurada Anual de Renta" });

  await expect(page.locator("#mes")).toHaveCount(0);
  await expect(page.locator("#anio")).toBeVisible();
});
