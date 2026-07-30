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

// Un periodo por mes calendario entre FECHA_INICIO y hoy (o FECHA_FIN si
// el contrato ya termino y eso es antes que hoy), saltando los meses que
// ya tienen un periodo con esa etiqueta.
export function generarPeriodosPendientes(
  fechaInicio: string,
  fechaFin: string | null,
  periodosExistentes: string[],
): string[] {
  const existentes = new Set(periodosExistentes.map((p) => p.trim().toUpperCase()));
  const inicio = anioMes(fechaInicio);
  const hoy = new Date();
  let limite = { anio: hoy.getFullYear(), mes: hoy.getMonth() };
  if (fechaFin) {
    const fin = anioMes(fechaFin);
    if (esAnterior(fin, limite)) limite = fin;
  }

  const etiquetas: string[] = [];
  let anio = inicio.anio;
  let mes = inicio.mes;
  while (!esAnterior(limite, { anio, mes })) {
    const etiqueta = etiquetaPeriodoMensual(anio, mes);
    if (!existentes.has(etiqueta)) etiquetas.push(etiqueta);
    mes += 1;
    if (mes > 11) {
      mes = 0;
      anio += 1;
    }
  }
  return etiquetas;
}
