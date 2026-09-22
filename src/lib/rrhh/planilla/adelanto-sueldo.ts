import { listarMaestros } from "@/lib/db/repositories/maestro.repository";

// Un adelanto de sueldo (a diferencia de un prestamo) esta limitado a un
// % del sueldo fijo del beneficiario. El porcentaje se administra como un
// maestro (TIPO_MAESTRO='PARAMETRO_PRESTAMO', CODIGO=
// 'PORCENTAJE_MAXIMO_ADELANTO', DESCRIPCION=el numero, ej. "70") en vez
// de vivir hardcodeado -- ver 045_parametro_prestamo.sql. SQL
// (SP_RRHH_PRESTAMO_CREAR/SOLICITAR) es la fuente de verdad; esto es solo
// para que la UI y la accion de servidor precalculen el mismo numero.
const PORCENTAJE_MAXIMO_ADELANTO_DEFECTO = 70;

export async function obtenerPorcentajeMaximoAdelanto(): Promise<number> {
  const parametros = await listarMaestros("PARAMETRO_PRESTAMO");
  const fila = parametros.find((p) => p.CODIGO === "PORCENTAJE_MAXIMO_ADELANTO");
  const valor = fila ? Number(fila.DESCRIPCION) : NaN;
  return (Number.isFinite(valor) ? valor : PORCENTAJE_MAXIMO_ADELANTO_DEFECTO) / 100;
}

export function montoMaximoAdelanto(sueldoFijo: number, porcentajeMaximo: number): number {
  return Math.floor(sueldoFijo * porcentajeMaximo * 100) / 100;
}
