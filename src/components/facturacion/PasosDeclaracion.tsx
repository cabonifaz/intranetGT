import type { EstadoDeclaracionTributariaCodigo } from "@/types/db";

// Checklist de UNA declaracion tributaria -- mismo patron sin estado que
// PasosConformidad.tsx (funciona en Server Components), con tooltip de
// fecha exacta (si ya se hizo) o que falta (si no).
//   1. Montos registrados (al menos el campo de resultado del periodo cargado).
//   2. Presentada (a SUNAT).
//   3. Pagada -- solo aplica si quedo un monto por pagar; si no, se marca
//      como "no aplica" en vez de pendiente para siempre.
export interface PasosDeclaracionProps {
  datosCargados: boolean;
  estadoCodigo: EstadoDeclaracionTributariaCodigo;
  montoTotalAPagar: number;
  fechaPresentacion: string | null;
  fechaPago: string | null;
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

export default function PasosDeclaracion({
  datosCargados,
  estadoCodigo,
  montoTotalAPagar,
  fechaPresentacion,
  fechaPago,
  compact = false,
}: PasosDeclaracionProps) {
  const anulada = estadoCodigo === "ANULADA";
  const presentada = estadoCodigo === "PRESENTADA" || estadoCodigo === "PAGADA";
  const pagada = estadoCodigo === "PAGADA";
  const requierePago = montoTotalAPagar > 0;

  const pasos: Paso[] = [
    {
      etiqueta: "Montos",
      hecho: datosCargados,
      tooltip: datosCargados ? "Montos del periodo registrados" : "Falta registrar los montos del periodo",
    },
    {
      etiqueta: "Presentada",
      hecho: presentada,
      tooltip: anulada ? "Declaracion anulada" : presentada ? `Presentada el ${formatearFecha(fechaPresentacion)}` : "Pendiente de presentar a SUNAT",
    },
    {
      etiqueta: "Pagada",
      hecho: pagada || !requierePago,
      tooltip: anulada
        ? "Declaracion anulada"
        : !requierePago
          ? "No aplica -- no quedo ningun monto por pagar"
          : pagada
            ? `Pagada el ${formatearFecha(fechaPago)}`
            : "Pendiente de pago",
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
