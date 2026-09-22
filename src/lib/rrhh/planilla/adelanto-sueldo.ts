// Un adelanto de sueldo (a diferencia de un prestamo) esta limitado a un
// % del sueldo fijo del beneficiario -- mismo tope aplicado en
// SP_RRHH_PRESTAMO_CREAR/SOLICITAR (SQL es la fuente de verdad; esto es
// solo para que la UI y la accion de servidor muestren/precalculen el
// mismo numero sin round-trip a la base).
export const PORCENTAJE_MAXIMO_ADELANTO = 0.7;

export function montoMaximoAdelanto(sueldoFijo: number): number {
  return Math.floor(sueldoFijo * PORCENTAJE_MAXIMO_ADELANTO * 100) / 100;
}
