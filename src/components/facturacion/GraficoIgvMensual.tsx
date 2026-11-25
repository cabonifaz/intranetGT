import type { ResumenMensualImpuestos } from "@/lib/facturacion/impuestos/dashboard";

// Grafico divergente (un solo eje, cero al centro): IGV resultante
// positivo = a pagar (color calido, mismo ambar que el resto de la app
// usa para "costo/egreso") crece hacia arriba; negativo = saldo a favor
// del periodo (color frio, mismo celeste/azul que "neutral/activo") crece
// hacia abajo. Nunca rojo/verde para esta pareja -- es la combinacion
// menos distinguible para daltonismo, y aca ninguno de los dos es "malo".
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
const ALTURA_MITAD = 96;

function formatearMonto(monto: number): string {
  return `S/ ${Math.abs(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function GraficoIgvMensual({ datos }: { datos: ResumenMensualImpuestos[] }) {
  const escala = Math.max(...datos.map((d) => Math.abs(d.igvResultante ?? 0)), 1);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">IGV resultante por mes</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> A pagar
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-sky-600" /> Saldo a favor
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-stretch gap-1">
        {datos.map((d) => {
          const valor = d.igvResultante;
          const esPositivo = valor !== null && valor > 0;
          const esNegativo = valor !== null && valor < 0;
          const pctArriba = esPositivo ? Math.max((valor! / escala) * 100, 6) : 0;
          const pctAbajo = esNegativo ? Math.max((Math.abs(valor!) / escala) * 100, 6) : 0;

          return (
            <div key={d.mes} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col justify-end" style={{ height: ALTURA_MITAD }}>
                {esPositivo ? (
                  <div
                    title={`${MESES[d.mes - 1]}: ${formatearMonto(valor!)} a pagar`}
                    className="w-full rounded-t bg-amber-500"
                    style={{ height: `${pctArriba}%` }}
                  />
                ) : null}
              </div>
              <div className="h-px w-full bg-slate-300 dark:bg-slate-600" />
              <div className="flex w-full flex-col justify-start" style={{ height: ALTURA_MITAD }}>
                {esNegativo ? (
                  <div
                    title={`${MESES[d.mes - 1]}: ${formatearMonto(valor!)} de saldo a favor`}
                    className="w-full rounded-b bg-sky-600"
                    style={{ height: `${pctAbajo}%` }}
                  />
                ) : null}
              </div>
              <span className={`text-[10px] ${d.existe ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600"}`}>
                {MESES[d.mes - 1]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
