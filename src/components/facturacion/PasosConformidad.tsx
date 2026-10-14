import type { EstadoConformidadCodigo } from "@/types/db";

// Checklist de UNA conformidad -- mismo patron sin estado/hooks que
// PasosDetallePlanilla.tsx (funciona en Server Components), con la
// diferencia de que aca el tooltip de cada paso muestra la fecha exacta
// de cumplimiento (si ya se hizo) o que es lo que falta (si no), para la
// matriz de cumplimiento del proyecto.
//   1. Items definidos (al menos 1 item cargado).
//   2. Emitida (PDF generado, items congelados).
//   3. Firmada (el cliente ya dio su conformidad).
export interface PasosConformidadProps {
  totalItems: number;
  estadoCodigo: EstadoConformidadCodigo | null; // null = todavia no se creo la conformidad
  fechaEmision: string | null;
  fechaFirma: string | null;
  compact?: boolean;
}

interface Paso {
  etiqueta: string;
  hecho: boolean;
  tooltip: string;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default function PasosConformidad({ totalItems, estadoCodigo, fechaEmision, fechaFirma, compact = false }: PasosConformidadProps) {
  const anulada = estadoCodigo === "ANULADA";
  const emitida = estadoCodigo === "EMITIDA" || estadoCodigo === "FIRMADA";
  const firmada = estadoCodigo === "FIRMADA";

  const pasos: Paso[] = [
    {
      etiqueta: "Items definidos",
      hecho: totalItems > 0,
      tooltip: totalItems > 0 ? `${totalItems} item${totalItems === 1 ? "" : "s"} definido${totalItems === 1 ? "" : "s"}` : "Agrega al menos un item",
    },
    {
      etiqueta: "Emitida",
      hecho: emitida,
      tooltip: anulada ? "Conformidad anulada" : emitida ? `Emitida el ${formatearFecha(fechaEmision)}` : "Pendiente de emitir el documento",
    },
    {
      etiqueta: "Firmada",
      hecho: firmada,
      tooltip: anulada ? "Conformidad anulada" : firmada ? `Firmada el ${formatearFecha(fechaFirma)}` : "Pendiente de firma del cliente",
    },
  ];

  const completados = pasos.filter((p) => p.hecho).length;
  const todoListo = completados === pasos.length;

  return (
    <div
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`${completados} de ${pasos.length} pasos completos: ${pasos.map((p) => `${p.etiqueta} -- ${p.tooltip}`).join(", ")}`}
    >
      {pasos.map((paso, i) => (
        <span key={paso.etiqueta} className="flex items-center">
          <span
            title={`${paso.etiqueta}: ${paso.tooltip}`}
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
              paso.hecho
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : anulada
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
            }`}
          >
            {paso.hecho ? "✓" : i + 1}
          </span>
          {!compact ? (
            <span className={`ml-1 mr-2 text-xs ${paso.hecho ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
              {paso.etiqueta}
            </span>
          ) : i < pasos.length - 1 ? (
            <span className="mx-0.5 h-px w-2 bg-slate-200 dark:bg-slate-700" />
          ) : null}
        </span>
      ))}
      {anulada ? <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">(Anulada)</span> : null}
      {todoListo && compact && !anulada ? <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">✓ Completo</span> : null}
    </div>
  );
}
