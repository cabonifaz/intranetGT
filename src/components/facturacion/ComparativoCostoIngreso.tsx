// A diferencia de BarraProgreso (una razon valor/total, cada barra con su
// propia referencia), esto compara 3 montos independientes -- costo,
// facturado, cobrado -- en una sola escala compartida (el mayor de los
// tres = 100%), para que el largo de cada barra sea directamente
// comparable entre si y el margen (facturado - costo) se pueda "ver" en
// el grafico, no solo leer como numero aparte. Un solo eje, tres series
// categoricas de color fijo (nunca reordenadas): ambar = costo (egreso),
// azul = facturado (mismo azul que ya usa "Facturado vs esperado"),
// esmeralda = cobrado (mismo verde que ya usa el resto de la app para
// "pagado/cobrado").
interface ComparativoCostoIngresoProps {
  costoReal: number;
  montoFacturado: number;
  ingresoReal: number;
  margenFacturado: number;
  monedaCodigo: string | null;
}

function formatearMonto(monto: number, monedaCodigo: string | null): string {
  const simbolo = monedaCodigo === "USD" ? "US$" : "S/";
  const signo = monto < 0 ? "-" : "";
  return `${signo}${simbolo} ${Math.abs(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ComparativoCostoIngreso({
  costoReal,
  montoFacturado,
  ingresoReal,
  margenFacturado,
  monedaCodigo,
}: ComparativoCostoIngresoProps) {
  const escala = Math.max(costoReal, montoFacturado, ingresoReal, 1);
  const pctMargen = montoFacturado > 0 ? (margenFacturado / montoFacturado) * 100 : 0;
  const esNegativo = margenFacturado < 0;

  const filas: { etiqueta: string; valor: number; color: string }[] = [
    { etiqueta: "Costo real", valor: costoReal, color: "bg-amber-500" },
    { etiqueta: "Facturado", valor: montoFacturado, color: "bg-blue-600" },
    { etiqueta: "Cobrado", valor: ingresoReal, color: "bg-emerald-600" },
  ];

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Costo vs Facturado</h3>
        <span className={`text-sm font-semibold ${esNegativo ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}>
          Margen: {formatearMonto(margenFacturado, monedaCodigo)} ({Math.round(pctMargen)}%)
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        {filas.map((fila) => (
          <div key={fila.etiqueta} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-slate-500 dark:text-slate-400">{fila.etiqueta}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${fila.color}`}
                style={{ width: `${Math.max((fila.valor / escala) * 100, fila.valor > 0 ? 1.5 : 0)}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
              {formatearMonto(fila.valor, monedaCodigo)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Margen = Facturado − Costo real (renta ya devengada, se haya cobrado o no todavia). Las tres barras comparten
        la misma escala para que se puedan comparar entre si.
      </p>
    </div>
  );
}
