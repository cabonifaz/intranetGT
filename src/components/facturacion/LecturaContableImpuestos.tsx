import type { InsightContable } from "@/lib/facturacion/impuestos/dashboard";

const ESTILOS: Record<InsightContable["tono"], string> = {
  malo: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  alerta: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
  bueno: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
};

export default function LecturaContableImpuestos({ insights }: { insights: InsightContable[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Lectura del periodo</h3>
      <ul className="mt-3 space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className={`rounded-lg border px-3 py-2 text-xs leading-relaxed ${ESTILOS[insight.tono]}`}>
            {insight.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
