import type { EstadoContratoCodigo } from "@/types/db";

// Etapas del proceso de contratacion -- se muestra al crear un contrato y
// en su detalle para que quien lo gestiona vea en que etapa va y que se
// hace en cada una. Sin estado ni hooks (funciona en Server y Client
// Components). El paso actual sale del estado del contrato: BORRADOR =
// condiciones economicas, PENDIENTE_FIRMA = esperando firma, FIRMADO en
// adelante = proceso terminado.
export type RegimenPasos = "PLANILLA" | "LOCADOR" | "LOCADOR_POR_HORA" | null;

export interface EtapaProceso {
  paso: 1 | 2 | 3 | 4;
  finalizado: boolean;
  anulado: boolean;
}

export function etapaDesdeEstado(estado: EstadoContratoCodigo): EtapaProceso {
  switch (estado) {
    case "BORRADOR":
      return { paso: 2, finalizado: false, anulado: false };
    case "PENDIENTE_FIRMA":
      return { paso: 3, finalizado: false, anulado: false };
    case "ANULADO":
      return { paso: 1, finalizado: false, anulado: true };
    default:
      return { paso: 4, finalizado: true, anulado: false };
  }
}

function descripcionCondiciones(regimen: RegimenPasos): string {
  if (regimen === "PLANILLA") {
    return "Agrega los conceptos remunerativos (ingreso base, bono, movilidad...). Su suma es la remuneracion mensual que usa la planilla.";
  }
  if (regimen === "LOCADOR_POR_HORA") {
    return "Agrega los proyectos con su tarifa por hora. Las horas trabajadas se cargan por periodo y el monto se calcula solo.";
  }
  if (regimen === "LOCADOR") {
    return "Revisa la tarifa y el periodo de pago. Los periodos mensuales se generan solos desde la fecha de inicio.";
  }
  return "Se completa desde el detalle del contrato: conceptos remunerativos (planilla) o tarifa/proyectos (locador).";
}

function armarEtapas(regimen: RegimenPasos) {
  return [
    {
      titulo: "Datos del contrato",
      descripcion:
        "Elige a la persona, el tipo de contrato, cargo y fechas. Segun el tipo se pide jornada (planilla) o tipo de pago y tarifa (locador). Se guarda como borrador.",
      ahora: "Completa el formulario y pulsa \"Crear contrato\".",
    },
    {
      titulo: "Condiciones economicas",
      descripcion: descripcionCondiciones(regimen),
      ahora: "Completa esta seccion en el detalle y luego genera el link de firma (al final de la pagina).",
    },
    {
      titulo: "Firma",
      descripcion:
        "Se genera un link (vale 7 dias). La persona lo abre, revisa el contrato, completa su cuenta bancaria/CCI y firma.",
      ahora: "Comparte el link con la persona y espera su firma. Si vencio, genera uno nuevo.",
    },
    {
      titulo: "Contrato firmado",
      descripcion: "Queda vigente con su PDF firmado. Desde aqui se generan los pagos y entra a la Planilla Mensual.",
      ahora: "Proceso completo -- puedes ver el PDF firmado y gestionar sus pagos.",
    },
  ];
}

export default function PasosContratacion({
  paso,
  finalizado = false,
  anulado = false,
  regimen = null,
}: {
  paso: 1 | 2 | 3 | 4;
  finalizado?: boolean;
  anulado?: boolean;
  regimen?: RegimenPasos;
}) {
  if (anulado) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        Este contrato fue anulado -- el proceso de contratacion quedo cerrado.
      </div>
    );
  }

  const etapas = armarEtapas(regimen);
  const completados = finalizado ? etapas.length : paso - 1;
  const porcentaje = Math.round((completados / etapas.length) * 100);
  const etapaActual = etapas[paso - 1];

  return (
    <section aria-label="Etapas del proceso de contratacion" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Proceso de contratacion</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {finalizado ? "Completo" : `Paso ${paso} de ${etapas.length}`}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-label="Avance del proceso de contratacion"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>

      <ol className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                <span
                  className={`text-sm font-medium ${
                    actual || hecho ? "text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
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
