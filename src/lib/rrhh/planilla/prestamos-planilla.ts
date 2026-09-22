import { listarCuotasPendientesDelPeriodo, vincularCuotaADetalle } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { etiquetaPeriodoMensual } from "@/lib/rrhh/periodos-pago";
import type { PrestamoCuotaAplicableRow } from "@/types/db";

// Descuento de cuotas de prestamo dentro de la Planilla Mensual. Los
// prestamos pueden estar en cualquier moneda pero la planilla es siempre
// en soles (ver calculo.ts): una cuota en USD se descuenta al TIPO_CAMBIO
// pactado del prestamo (el mismo que quedo escrito en el compromiso
// firmado), no al TC vigente del dia.

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// null si la moneda no es soles y el prestamo no tiene TC -- no deberia
// pasar (se exige al crearlo), pero en ese caso la cuota no se toma en
// vez de descontar un monto equivocado.
export function montoCuotaEnSoles(monto: number, monedaCodigo: string, tipoCambio: string | null): number | null {
  if (monedaCodigo === "PEN") return redondear(monto);
  const tc = Number(tipoCambio);
  if (!tc) return null;
  return redondear(monto * tc);
}

// "Prestamo #3 (Laptop) - cuota 2/6" / "Adelanto de sueldo #4 - cuota 1/1", con el tipo de cambio si esta en
// otra moneda y el periodo original si es una cuota que se descuenta
// despues de su mes.
export function etiquetaCuotaPrestamo(c: PrestamoCuotaAplicableRow, periodoPlanilla?: { anio: number; mes: number }): string {
  const nombreTipo = c.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO" ? "Adelanto de sueldo" : "Prestamo";
  const base = `${nombreTipo} #${c.ID_PRESTAMO}${c.DESCRIPCION ? ` (${c.DESCRIPCION})` : ""} - cuota ${c.NRO_CUOTA}/${c.TOTAL_CUOTAS}`;
  const partes: string[] = [];
  if (c.MONEDA_CODIGO !== "PEN") {
    partes.push(`US$ ${Number(c.MONTO).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x TC ${c.TIPO_CAMBIO}`);
  }
  if (periodoPlanilla && c.ANIO * 12 + c.MES < periodoPlanilla.anio * 12 + periodoPlanilla.mes) {
    partes.push(`periodo ${etiquetaPeriodoMensual(c.ANIO, c.MES - 1)}`);
  }
  return partes.length > 0 ? `${base} (${partes.join(", ")})` : base;
}

export interface CuotaADescontar {
  idCuota: number;
  montoSoles: number;
}

// Cuotas que la planilla de (anio, mes) debe descontarle a este usuario y
// su total en soles. Solo lee -- la reserva (vincular al detalle) se hace
// recien cuando el detalle existe, ver vincularCuotasADetalle.
export async function cuotasADescontar(idUsuario: number, anio: number, mes: number): Promise<{ cuotas: CuotaADescontar[]; total: number }> {
  const pendientes = await listarCuotasPendientesDelPeriodo(idUsuario, anio, mes);

  const cuotas: CuotaADescontar[] = [];
  for (const c of pendientes) {
    const montoSoles = montoCuotaEnSoles(Number(c.MONTO), c.MONEDA_CODIGO, c.TIPO_CAMBIO);
    if (montoSoles !== null) cuotas.push({ idCuota: c.ID_CUOTA, montoSoles });
  }

  return { cuotas, total: redondear(cuotas.reduce((suma, c) => suma + c.montoSoles, 0)) };
}

export async function vincularCuotasADetalle(cuotas: CuotaADescontar[], idPlanillaDetalle: number): Promise<void> {
  for (const c of cuotas) {
    await vincularCuotaADetalle(c.idCuota, idPlanillaDetalle, c.montoSoles);
  }
}
