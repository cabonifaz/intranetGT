import type { ResumenMensualImpuestos } from "@/lib/facturacion/impuestos/dashboard";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

const ESTADO_ETIQUETA: Record<string, string> = {
  BORRADOR: "Borrador",
  PRESENTADA: "Presentada",
  PAGADA: "Pagada",
  ANULADA: "Anulada",
};

function monto(valor: number | null): string {
  return valor === null ? "--" : valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TablaMensualImpuestos({ datos }: { datos: ResumenMensualImpuestos[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[900px] text-left text-xs">
        <thead className="border-b border-slate-200 uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <tr>
            <th className="px-3 py-2">Mes</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2 text-right">Ventas gravadas</th>
            <th className="px-3 py-2 text-right">Compras gravadas</th>
            <th className="px-3 py-2 text-right">IGV ventas</th>
            <th className="px-3 py-2 text-right">IGV compras</th>
            <th className="px-3 py-2 text-right">IGV resultante</th>
            <th className="px-3 py-2 text-right">Pago a cta. Renta</th>
            <th className="px-3 py-2 text-right">Tasa efectiva</th>
            <th className="px-3 py-2">Presentacion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {datos.map((m) => (
            <tr key={m.mes} className={m.existe ? "" : "text-slate-300 dark:text-slate-600"}>
              <td className="px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300">{MESES[m.mes - 1]}</td>
              <td className="px-3 py-1.5">{m.estadoCodigo ? ESTADO_ETIQUETA[m.estadoCodigo] : "--"}</td>
              <td className="px-3 py-1.5 text-right">{monto(m.ventasGravadas)}</td>
              <td className="px-3 py-1.5 text-right">{monto(m.comprasGravadas)}</td>
              <td className="px-3 py-1.5 text-right">{monto(m.igvVentas)}</td>
              <td className="px-3 py-1.5 text-right">{monto(m.igvCompras)}</td>
              <td
                className={`px-3 py-1.5 text-right font-medium ${
                  m.igvResultante === null ? "" : m.igvResultante > 0 ? "text-amber-600 dark:text-amber-400" : m.igvResultante < 0 ? "text-sky-600 dark:text-sky-400" : ""
                }`}
              >
                {monto(m.igvResultante)}
              </td>
              <td className="px-3 py-1.5 text-right">{monto(m.pagoACuentaRenta)}</td>
              <td className="px-3 py-1.5 text-right">{m.tasaEfectivaPagoCuenta === null ? "--" : `${m.tasaEfectivaPagoCuenta.toFixed(2)}%`}</td>
              <td className="px-3 py-1.5">
                {m.fechaPresentacion ? (
                  <span className={m.presentadaTarde ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                    {new Date(m.fechaPresentacion).toLocaleDateString("es-PE", { dateStyle: "medium" })}
                    {m.presentadaTarde ? " (tarde)" : ""}
                  </span>
                ) : (
                  "--"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
