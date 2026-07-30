// BOL#AAAA-NNNN / RXH#AAAA-NNNN -- puramente informativo/autogenerado
// (no se guarda en BD), mismo criterio que formatearNroContrato en
// plantilla-tokens.ts: se recalcula desde el ID + el año de la planilla.
export function formatearNroBoleta(idPlanillaDetalle: number, anio: number): string {
  return `BOL#${anio}-${String(idPlanillaDetalle).padStart(4, "0")}`;
}

export function formatearNroRxH(idPlanillaDetalle: number, anio: number): string {
  return `RXH#${anio}-${String(idPlanillaDetalle).padStart(4, "0")}`;
}
