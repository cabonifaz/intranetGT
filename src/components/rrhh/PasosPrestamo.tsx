import type { EstadoPrestamoCodigo } from "@/types/db";

// Etapas de un prestamo/adelanto -- se muestra en el detalle para que
// quien solicito (y quien lo gestiona) vea en que paso va, sin tener que
// adivinar que significa cada estado. Sin estado ni hooks (funciona en
// Server y Client Components), mismo patron que PasosContratacion.
export interface EtapaPrestamo {
  paso: 1 | 2 | 3;
  finalizado: boolean;
  anulado: boolean;
}

export function etapaDesdeEstadoPrestamo(estado: EstadoPrestamoCodigo): EtapaPrestamo {
  switch (estado) {
    case "SOLICITADO":
      return { paso: 1, finalizado: false, anulado: false };
    case "PENDIENTE_FIRMA":
      return { paso: 2, finalizado: false, anulado: false };
    case "ANULADO":
      return { paso: 1, finalizado: false, anulado: true };
    default:
      return { paso: 3, finalizado: true, anulado: false };
  }
}

function armarEtapas(esContacto: boolean) {
  return [
    {
      titulo: "Solicitud enviada",
      descripcion: "Se registró el monto, la moneda y (si es un préstamo) el cronograma propuesto.",
      ahora: "En revisión por RRHH, Administración o Gerencia.",
    },
    {
      titulo: "Otorgado, pendiente de firma",
      descripcion: "Se definió el cronograma de cuotas y la cuenta de desembolso (si aplica).",
      ahora: "Descarga el compromiso de pago, fírmalo y súbelo firmado para activarlo.",
    },
    {
      titulo: "Firmado y activo",
      descripcion: esContacto
        ? "El compromiso fue firmado. Como el beneficiario es un contacto (sin planilla), cada cuota se marca pagada a mano."
        : "El compromiso fue firmado. Las cuotas se descuentan solas en la planilla de cada mes.",
      ahora: "Proceso completo -- revisa el cronograma y el estado de cada cuota.",
    },
  ];
}

export default function PasosPrestamo({
  paso,
  finalizado = false,
  anulado = false,
  esContacto = false,
}: {
  paso: 1 | 2 | 3;
  finalizado?: boolean;
  anulado?: boolean;
  esContacto?: boolean;
}) {
  if (anulado) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Esta solicitud fue anulada -- el proceso quedó cerrado.
      </div>
    );
  }

  const etapas = armarEtapas(esContacto);
  const completados = finalizado ? etapas.length : paso - 1;
  const porcentaje = Math.round((completados / etapas.length) * 100);
  const etapaActual = etapas[paso - 1];

  return (
    <section aria-label="Etapas de la solicitud" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Proceso de la solicitud</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{finalizado ? "Completo" : `Paso ${paso} de ${etapas.length}`}</span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-label="Avance de la solicitud"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {etapas.map((etapa, i) => {
          const numero = i + 1;
          const hecho = finalizado || numero < paso;
          const actual = !finalizado && numero === paso;
          return (
            <li
              key={etapa.titulo}
              aria-current={actual ? "step" : undefined}
              className={`rounded-lg border p-3 ${
                actual
                  ? "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                  : hecho
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
                      : hecho
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {hecho ? "✓" : numero}
                </span>
                <span className={`text-sm font-medium ${actual || hecho ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {etapa.titulo}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{etapa.descripcion}</p>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
        <span className="font-semibold">{finalizado ? "Estado: " : "Ahora: "}</span>
        {etapaActual.ahora}
      </p>
    </section>
  );
}
