interface DatosCosteo {
  COSTO_COMPRAS: string;
  COSTO_MANO_OBRA_HORAS: string;
  COSTO_MANO_OBRA_MANUAL: string;
  COSTO_MANO_OBRA_TARIFA_UNICA: string;
  COSTO_PAGOS_RECURRENTES: string;
  INGRESO_REAL: string;
  COSTO_PRESUPUESTADO: string;
  INGRESO_ESPERADO: string;
}

export interface Costeo {
  costoReal: number;
  costoPresupuestado: number;
  ingresoReal: number;
  ingresoEsperado: number;
  margenActual: number;
  margenAlCierre: number;
  pctCosto: number; // costoReal / costoPresupuestado, 0 si no hay presupuesto
  pctIngreso: number; // ingresoReal / ingresoEsperado, 0 si no hay ingreso esperado
}

// Costo real total = compras (comprometido) + mano de obra por horas +
// mano de obra manual + tarifa unica de locadores "por proyecto"
// enlazados (pago fijo por entregable, se cuenta una sola vez -- no asi
// los locadores mensuales/por jornada, que son recurrentes y se cargan a
// mano periodo a periodo) + pagos recurrentes linkeados a este proyecto
// (alquiler, internet, etc. -- ver PAGO_RECURRENTE.ID_PROYECTO). Margen
// actual = ingreso real - costo real. Margen al cierre = ingreso
// esperado - costo presupuestado (los dos numeros fijos que se cargan al
// crear el proyecto, no una proyeccion por tendencia).
export function calcularCosteo(p: DatosCosteo): Costeo {
  const costoReal =
    Number(p.COSTO_COMPRAS) +
    Number(p.COSTO_MANO_OBRA_HORAS) +
    Number(p.COSTO_MANO_OBRA_MANUAL) +
    Number(p.COSTO_MANO_OBRA_TARIFA_UNICA) +
    Number(p.COSTO_PAGOS_RECURRENTES);
  const costoPresupuestado = Number(p.COSTO_PRESUPUESTADO);
  const ingresoReal = Number(p.INGRESO_REAL);
  const ingresoEsperado = Number(p.INGRESO_ESPERADO);

  return {
    costoReal,
    costoPresupuestado,
    ingresoReal,
    ingresoEsperado,
    margenActual: ingresoReal - costoReal,
    margenAlCierre: ingresoEsperado - costoPresupuestado,
    pctCosto: costoPresupuestado > 0 ? costoReal / costoPresupuestado : 0,
    pctIngreso: ingresoEsperado > 0 ? ingresoReal / ingresoEsperado : 0,
  };
}
