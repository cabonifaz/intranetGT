// Cronograma de un prestamo: funciones puras (sin IO) para armar las
// cuotas iguales automaticas y avanzar meses. Las cuotas se agendan
// contra un periodo (anio + mes 1-12), la misma granularidad que
// RRHH_PLANILLA_MENSUAL -- ver 041_rrhh_prestamo.sql.

export interface CuotaCronograma {
  nroCuota: number;
  anio: number;
  mes: number;
  monto: number;
}

export function avanzarMes(anio: number, mes: number, cantidad: number): { anio: number; mes: number } {
  const indice = anio * 12 + (mes - 1) + cantidad;
  return { anio: Math.floor(indice / 12), mes: (indice % 12) + 1 };
}

// N cuotas iguales, una por mes desde (anioInicio, mesInicio). Se reparte
// en centavos para no acumular error de redondeo: las primeras N-1 cuotas
// llevan la parte entera y la ultima absorbe el resto, asi la suma da
// exactamente el monto total (ej. 100 en 3 cuotas = 33.33 + 33.33 + 33.34).
export function generarCuotasIguales(montoTotal: number, nroCuotas: number, anioInicio: number, mesInicio: number): CuotaCronograma[] {
  const totalCentavos = Math.round(montoTotal * 100);
  const baseCentavos = Math.floor(totalCentavos / nroCuotas);

  const cuotas: CuotaCronograma[] = [];
  for (let i = 0; i < nroCuotas; i++) {
    const { anio, mes } = avanzarMes(anioInicio, mesInicio, i);
    const centavos = i === nroCuotas - 1 ? totalCentavos - baseCentavos * (nroCuotas - 1) : baseCentavos;
    cuotas.push({ nroCuota: i + 1, anio, mes, monto: centavos / 100 });
  }
  return cuotas;
}
