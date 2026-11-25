interface TarjetaIndicadorProps {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: "neutral" | "bueno" | "alerta" | "malo";
}

const TONOS: Record<NonNullable<TarjetaIndicadorProps["tono"]>, string> = {
  neutral: "text-slate-900 dark:text-white",
  bueno: "text-emerald-600 dark:text-emerald-400",
  alerta: "text-amber-600 dark:text-amber-400",
  malo: "text-red-600 dark:text-red-400",
};

export default function TarjetaIndicador({ etiqueta, valor, detalle, tono = "neutral" }: TarjetaIndicadorProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{etiqueta}</p>
      <p className={`mt-1 text-xl font-semibold ${TONOS[tono]}`}>{valor}</p>
      {detalle ? <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{detalle}</p> : null}
    </div>
  );
}
