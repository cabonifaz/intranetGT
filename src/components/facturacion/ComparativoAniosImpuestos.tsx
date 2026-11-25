// Magnitud (total de impuestos pagados por año) -- un solo hue secuencial
// (azul, el mismo "primario" que ya usa el resto de la app), no
// categorico: todas las barras son la misma serie, solo cambia el año.
function formatearMonto(monto: number): string {
  return `S/ ${monto.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function ComparativoAniosImpuestos({ datos }: { datos: { anio: number; totalImpuestosPagados: number }[] }) {
  const escala = Math.max(...datos.map((d) => d.totalImpuestosPagados), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total de impuestos pagados por año</h3>
      <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">IGV resultante (solo cuando se pago) + pago a cuenta Renta + saldo de Renta por regularizar de la DJ anual.</p>

      <div className="mt-3 space-y-2">
        {datos.map((d) => (
          <div key={d.anio} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-xs text-slate-500 dark:text-slate-400">{d.anio}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max((d.totalImpuestosPagados / escala) * 100, d.totalImpuestosPagados > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
              {formatearMonto(d.totalImpuestosPagados)}
            </span>
          </div>
        ))}
        {datos.length === 0 ? <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos todavia.</p> : null}
      </div>
    </div>
  );
}
