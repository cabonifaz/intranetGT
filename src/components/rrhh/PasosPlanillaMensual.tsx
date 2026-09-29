// Guia paso a paso de la corrida mensual de planilla, con barra de
// avance por etapa -- para que quien la ejecuta (Jefatura/Asistente) sepa
// en que orden hacer las cosas sin adivinar que significa cada numero de
// la tabla. Mismo patron que PasosContratacion/PasosPrestamo: sin estado
// ni hooks, funciona en Server Components.
export interface PasosPlanillaMensualProps {
  totalColaboradores: number;
  totalEmitidos: number;
  totalPagados: number;
}

interface Etapa {
  titulo: string;
  descripcion: string;
  hecho: boolean;
  progreso: number | null;
  ahora: string;
}

function armarEtapas({ totalColaboradores, totalEmitidos, totalPagados }: PasosPlanillaMensualProps): Etapa[] {
  const hayColaboradores = totalColaboradores > 0;
  const faltanEmitir = totalColaboradores - totalEmitidos;
  const faltanPagar = totalColaboradores - totalPagados;

  return [
    {
      titulo: "Generar la planilla del mes",
      descripcion: "Agrega a todos los colaboradores con contrato vigente ese mes, ya con su bruto y descuentos calculados.",
      hecho: hayColaboradores,
      progreso: null,
      ahora: 'Usa el botón "Generar planilla del mes" de arriba. Si no agrega a nadie, revisa que exista una versión de parámetros vigente.',
    },
    {
      titulo: "Revisar y emitir boletas/recibos",
      descripcion: "Revisa el monto de cada colaborador y emite su boleta o recibo -- uno por uno o todos de una vez. Al emitir, el monto queda congelado.",
      hecho: hayColaboradores && totalEmitidos === totalColaboradores,
      progreso: hayColaboradores ? totalEmitidos / totalColaboradores : 0,
      ahora: hayColaboradores
        ? `Faltan ${faltanEmitir} de ${totalColaboradores} por emitir.`
        : "Primero genera la planilla del mes.",
    },
    {
      titulo: "Marcar los pagos de aportes (AFP/EsSalud)",
      descripcion: "Una vez que hiciste el pago real de los aportes de cada colaborador, márcalo como pagado -- uno por uno o todos de una vez.",
      hecho: hayColaboradores && totalPagados === totalColaboradores,
      progreso: hayColaboradores ? totalPagados / totalColaboradores : 0,
      ahora: hayColaboradores
        ? `Faltan ${faltanPagar} de ${totalColaboradores} por marcar como pagados.`
        : "Primero genera y emite la planilla del mes.",
    },
  ];
}

export default function PasosPlanillaMensual(props: PasosPlanillaMensualProps) {
  const etapas = armarEtapas(props);
  const completadas = etapas.filter((e) => e.hecho).length;
  const finalizado = completadas === etapas.length;
  const paso = etapas.findIndex((e) => !e.hecho) + 1 || etapas.length;
  const porcentajeGeneral = Math.round((completadas / etapas.length) * 100);
  const etapaActual = etapas[paso - 1];

  return (
    <section aria-label="Pasos de la planilla mensual" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Pasos para cerrar el mes</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {finalizado ? "Mes cerrado" : `Paso ${paso} de ${etapas.length}`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentajeGeneral}
        aria-label="Avance general del mes"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${porcentajeGeneral}%` }} />
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {etapas.map((etapa, i) => {
          const numero = i + 1;
          const actual = !finalizado && numero === paso;
          return (
            <li
              key={etapa.titulo}
              aria-current={actual ? "step" : undefined}
              className={`rounded-lg border p-3 ${
                actual
                  ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                  : etapa.hecho
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    actual
                      ? "bg-blue-600 text-white"
                      : etapa.hecho
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {etapa.hecho ? "✓" : numero}
                </span>
                <span className={`text-sm font-medium ${actual || etapa.hecho ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {etapa.titulo}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{etapa.descripcion}</p>

              {etapa.progreso !== null ? (
                <div className="mt-2">
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(etapa.progreso * 100)}
                    aria-label={`Avance de ${etapa.titulo}`}
                    className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                  >
                    <div
                      className={`h-full rounded-full transition-all ${etapa.hecho ? "bg-emerald-500" : "bg-blue-500"}`}
                      style={{ width: `${Math.round(etapa.progreso * 100)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        <span className="font-semibold">{finalizado ? "Estado: " : "Ahora: "}</span>
        {finalizado ? "Todos los colaboradores están emitidos y pagados -- el mes está listo para cerrarse." : etapaActual.ahora}
      </p>
    </section>
  );
}
