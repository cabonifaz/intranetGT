const MESES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SETIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
];

export function etiquetaPeriodoMensual(anio: number, mesIndice0: number): string {
  return `${MESES[mesIndice0]} ${anio}`;
}

// Recibe fechas en formato "YYYY-MM-DD" (lo que devuelve MySQL) y las
// parsea con un slice de texto, no `new Date(string)` -- ese constructor
// interpreta la fecha como medianoche UTC, y en horario de Peru (UTC-5)
// eso puede retroceder un dia y correr el mes de inicio. Exportado --
// reusado por src/lib/pagos-recurrentes/generar-instancias.ts.
export function anioMes(fechaISO: string): { anio: number; mes: number } {
  const anio = Number(fechaISO.slice(0, 4));
  const mes = Number(fechaISO.slice(5, 7)) - 1;
  return { anio, mes };
}

export function esAnterior(a: { anio: number; mes: number }, b: { anio: number; mes: number }): boolean {
  return a.anio < b.anio || (a.anio === b.anio && a.mes < b.mes);
}

export interface PeriodoPendiente {
  etiqueta: string;
  anio: number;
  mes: number; // 0-indexado, coherente con mesIndice0 de etiquetaPeriodoMensual
}

// Un periodo por mes calendario entre FECHA_INICIO y hoy (o FECHA_FIN si
// el contrato ya termino y eso es antes que hoy), saltando los meses que
// ya tienen un periodo con esa etiqueta. Version detallada (con anio/mes
// numericos, no solo la etiqueta) para poder prorratear el mes de inicio
// o de fin -- ver factorProrateoDelMes.
export function generarPeriodosPendientesDetallado(
  fechaInicio: string,
  fechaFin: string | null,
  periodosExistentes: string[],
): PeriodoPendiente[] {
  const existentes = new Set(periodosExistentes.map((p) => p.trim().toUpperCase()));
  const inicio = anioMes(fechaInicio);
  const hoy = new Date();
  let limite = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  if (fechaFin) {
    const fin = anioMes(fechaFin);
    if (esAnterior(fin, limite)) limite = fin;
  }

  const resultado: PeriodoPendiente[] = [];
  let anio = inicio.anio;
  let mes = inicio.mes;
  while (!esAnterior(limite, { anio, mes })) {
    const etiqueta = etiquetaPeriodoMensual(anio, mes);
    if (!existentes.has(etiqueta)) resultado.push({ etiqueta, anio, mes });
    mes += 1;
    if (mes > 11) {
      mes = 0;
      anio += 1;
    }
  }
  return resultado;
}

export function generarPeriodosPendientes(fechaInicio: string, fechaFin: string | null, periodosExistentes: string[]): string[] {
  return generarPeriodosPendientesDetallado(fechaInicio, fechaFin, periodosExistentes).map((p) => p.etiqueta);
}

function diaDelMes30(fechaISO: string): number {
  // Convencion comercial 30/360 (estandar en planillas peruanas: la
  // remuneracion mensual se prorratea sobre 30 dias fijos, no sobre los
  // dias calendario reales) -- el dia 31 cuenta como dia 30.
  return Math.min(Number(fechaISO.slice(8, 10)), 30);
}

// Fraccion (0-1] de un mes de 30 dias fijos que el contrato realmente
// cubrio -- 1 si el mes cae integro dentro de [fechaInicio, fechaFin],
// menor a 1 solo en el mes en que el contrato empieza y/o termina.
// mes0 es 0-indexado (Enero=0), igual que etiquetaPeriodoMensual.
export function factorProrateoDelMes(anio: number, mes0: number, fechaInicio: string, fechaFin: string | null): number {
  const inicioContrato = anioMes(fechaInicio);
  const esMesDeInicio = anio === inicioContrato.anio && mes0 === inicioContrato.mes;

  const finContrato = fechaFin ? anioMes(fechaFin) : null;
  const esMesDeFin = finContrato !== null && anio === finContrato.anio && mes0 === finContrato.mes;

  if (!esMesDeInicio && !esMesDeFin) return 1;

  const diaInicio = esMesDeInicio ? diaDelMes30(fechaInicio) : 1;
  const diaFin = esMesDeFin && fechaFin ? diaDelMes30(fechaFin) : 30;

  const dias = Math.max(0, diaFin - diaInicio + 1);
  return dias / 30;
}
