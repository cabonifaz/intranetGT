import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarDeclaraciones } from "@/lib/db/repositories/declaracion-tributaria.repository";
import { construirResumenImpuestos, generarInsightsContables } from "@/lib/facturacion/impuestos/dashboard";
import TarjetaIndicador from "@/components/facturacion/TarjetaIndicador";
import GraficoIgvMensual from "@/components/facturacion/GraficoIgvMensual";
import ComparativoAniosImpuestos from "@/components/facturacion/ComparativoAniosImpuestos";
import AlertasCumplimientoImpuestos from "@/components/facturacion/AlertasCumplimientoImpuestos";
import TablaMensualImpuestos from "@/components/facturacion/TablaMensualImpuestos";
import LecturaContableImpuestos from "@/components/facturacion/LecturaContableImpuestos";

function formatearMonto(monto: number): string {
  const signo = monto < 0 ? "-" : "";
  return `${signo}S/ ${Math.abs(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function DashboardImpuestosPage({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  await requirePermiso("IMPUESTOS_EMPRESA", "LECTURA");
  const { anio } = await searchParams;

  const todas = await listarDeclaraciones(null, null);
  const anioSeleccionado = anio ? Number(anio) : new Date().getFullYear();
  const resumen = construirResumenImpuestos(todas, anioSeleccionado);
  const insights = generarInsightsContables(resumen);

  return (
    <div>
      <Link href="/facturacion/impuestos" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; Impuestos
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Dashboard de impuestos</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Indicadores de IGV + Renta mensual y Renta anual, para apoyar decisiones de estrategia tributaria.</p>
        </div>
        <form className="flex items-end gap-2 text-sm" action="/facturacion/impuestos/dashboard">
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Año</label>
            <select
              name="anio"
              defaultValue={anioSeleccionado}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {resumen.aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Ver
          </button>
        </form>
      </div>

      <div className="mt-5">
        <LecturaContableImpuestos insights={insights} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <TarjetaIndicador etiqueta="IGV pagado" valor={formatearMonto(resumen.anual.totalIgvPagado)} detalle={`${anioSeleccionado} -- meses a pagar`} />
        <TarjetaIndicador
          etiqueta="Saldo a favor IGV generado"
          valor={formatearMonto(resumen.anual.totalSaldoFavorIgvGenerado)}
          detalle={`${anioSeleccionado} -- suma de meses a favor`}
          tono={resumen.anual.totalSaldoFavorIgvGenerado > 0 ? "alerta" : "neutral"}
        />
        <TarjetaIndicador etiqueta="Pago a cuenta Renta" valor={formatearMonto(resumen.anual.totalPagoACuentaRenta)} detalle={anioSeleccionado.toString()} />
        <TarjetaIndicador
          etiqueta="Total impuestos pagados"
          valor={formatearMonto(resumen.anual.totalImpuestosPagados)}
          detalle="IGV + pago a cuenta + regularizacion DJ anual"
          tono="bueno"
        />
        <TarjetaIndicador
          etiqueta="Declaraciones mensuales cargadas"
          valor={`${resumen.anual.mesesConDatos} / 12`}
          detalle={anioSeleccionado.toString()}
          tono={resumen.anual.mesesConDatos === 12 ? "bueno" : "alerta"}
        />
      </div>

      {resumen.anual.djAnual.existe ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TarjetaIndicador etiqueta="DJ Anual -- Impuesto calculado" valor={formatearMonto(resumen.anual.djAnual.impuestoCalculadoRenta ?? 0)} />
          <TarjetaIndicador etiqueta="DJ Anual -- Pagos a cuenta acumulados" valor={formatearMonto(resumen.anual.djAnual.pagosACuentaAcumulados ?? 0)} />
          <TarjetaIndicador
            etiqueta={resumen.anual.djAnual.saldoRenta !== null && resumen.anual.djAnual.saldoRenta < 0 ? "DJ Anual -- Saldo a favor" : "DJ Anual -- Por regularizar"}
            valor={formatearMonto(resumen.anual.djAnual.saldoRenta ?? 0)}
            tono={resumen.anual.djAnual.saldoRenta !== null && resumen.anual.djAnual.saldoRenta > 0 ? "alerta" : "bueno"}
          />
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraficoIgvMensual datos={resumen.mensual} />
        <ComparativoAniosImpuestos datos={resumen.comparativoAnios} />
      </div>

      <div className="mt-4">
        <AlertasCumplimientoImpuestos
          vencidasSinPresentar={resumen.vencidasSinPresentar}
          vencidasSinPagar={resumen.vencidasSinPagar}
          proximosVencimientos={resumen.proximosVencimientos}
        />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-300">Detalle mensual -- {anioSeleccionado}</h2>
      <div className="mt-2">
        <TablaMensualImpuestos datos={resumen.mensual} />
      </div>
    </div>
  );
}
