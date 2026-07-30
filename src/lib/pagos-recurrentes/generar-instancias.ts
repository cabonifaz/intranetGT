import { etiquetaPeriodoMensual, anioMes, esAnterior } from "@/lib/rrhh/periodos-pago";

// Ultimo dia real del mes (28/29/30/31) -- para clampear DIA_VENCIMIENTO
// cuando el mes es mas corto (ej. 31 en febrero -> 28 o 29). Construido
// con componentes numericos (anio, mes, dia), no parseando un string --
// a diferencia de `new Date(string)` (que interpreta la fecha como
// medianoche UTC y puede correr el dia en Peru/UTC-5), este constructor
// siempre usa la zona horaria local, sin el mismo riesgo.
function ultimoDiaDelMes(anio: number, mesIndice0: number): number {
  return new Date(anio, mesIndice0 + 1, 0).getDate();
}

function calcularFechaVencimiento(anio: number, mesIndice0: number, diaVencimiento: number): string {
  const dia = Math.min(diaVencimiento, ultimoDiaDelMes(anio, mesIndice0));
  const mes = String(mesIndice0 + 1).padStart(2, "0");
  return `${anio}-${mes}-${String(dia).padStart(2, "0")}`;
}

export interface InstanciaPorGenerar {
  periodo: string;
  fechaVencimiento: string;
}

// Un periodo cada `intervaloMeses` meses calendario entre fechaInicio y
// hoy (o fechaFin si el pago recurrente ya termino y eso es antes que
// hoy), saltando los periodos que ya tienen una instancia con esa
// etiqueta -- mismo criterio que generarPeriodosPendientes de RRHH,
// extendido de "cada mes" a "cada N meses" (intervaloMeses=1 es el caso
// mensual, cubre trimestral/semestral/anual con el mismo mecanismo). La
// etiqueta de cada periodo es siempre el mes en que arranca (ej. un
// trimestre que empieza en julio se etiqueta "JULIO 2026"), sin importar
// el intervalo.
export function generarInstanciasPendientes(
  fechaInicio: string,
  fechaFin: string | null,
  intervaloMeses: number,
  diaVencimiento: number,
  periodosExistentes: string[],
): InstanciaPorGenerar[] {
  const existentes = new Set(periodosExistentes.map((p) => p.trim().toUpperCase()));
  const inicio = anioMes(fechaInicio);
  const hoy = new Date();
  let limite = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  if (fechaFin) {
    const fin = anioMes(fechaFin);
    if (esAnterior(fin, limite)) limite = fin;
  }

  const instancias: InstanciaPorGenerar[] = [];
  let anio = inicio.anio;
  let mes = inicio.mes;
  while (!esAnterior(limite, { anio, mes })) {
    const periodo = etiquetaPeriodoMensual(anio, mes);
    if (!existentes.has(periodo)) {
      instancias.push({ periodo, fechaVencimiento: calcularFechaVencimiento(anio, mes, diaVencimiento) });
    }
    mes += intervaloMeses;
    while (mes > 11) {
      mes -= 12;
      anio += 1;
    }
  }
  return instancias;
}
