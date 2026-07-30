import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarVersionesParametro } from "@/lib/db/repositories/rrhh-planilla-parametro.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { crearVersionParametrosAction } from "@/lib/actions/rrhh-planilla";

function formatearFecha(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

export default async function ParametrosPlanillaPage() {
  await requirePermiso("RRHH_PLANILLA", "ADMIN");

  const [versiones, afpFondos] = await Promise.all([listarVersionesParametro(), listarMaestros("AFP_FONDO")]);
  const vigente = versiones[0] ?? null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/rrhh/planilla" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          &larr; Planilla Mensual
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Parametros de planilla</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          UIT, tasas AFP/ONP/EsSalud/Renta -- cambian cada año o trimestre segun SUNAT/SBS. Es un historial de versiones, nunca
          se edita una version existente: corregir una tasa es crear una version nueva.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Crear nueva version</h2>
        <form action={crearVersionParametrosAction} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo name="anio" label="Año" type="number" defaultValue={String(new Date().getFullYear())} />
            <Campo name="fechaVigenciaDesde" label="Vigente desde" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <Campo name="uit" label="UIT (S/)" defaultValue={vigente?.UIT ?? "5500.00"} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo name="porcentajeOnp" label="ONP (%)" defaultValue={vigente?.PORCENTAJE_ONP ?? "13.00"} />
            <Campo name="porcentajeEssalud" label="EsSalud (%)" defaultValue={vigente?.PORCENTAJE_ESSALUD ?? "9.00"} />
            <Campo name="uitDeduccionRenta5ta" label="UIT deduccion Renta 5ta" defaultValue={vigente?.UIT_DEDUCCION_RENTA_5TA ?? "7.00"} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo name="aporteObligatorioAfpPorcentaje" label="AFP aporte obligatorio (%)" defaultValue={vigente?.APORTE_OBLIGATORIO_AFP_PORCENTAJE ?? "10.00"} />
            <Campo name="primaSeguroAfpPorcentaje" label="AFP prima de seguro (%)" defaultValue={vigente?.PRIMA_SEGURO_AFP_PORCENTAJE ?? "1.37"} />
            <Campo name="topeAsegurableAfp" label="AFP tope asegurable (S/)" defaultValue={vigente?.TOPE_ASEGURABLE_AFP ?? "12672.65"} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo name="porcentajeRenta4ta" label="Retencion Renta 4ta (%)" defaultValue={vigente?.PORCENTAJE_RENTA_4TA ?? "8.00"} />
            <Campo name="umbralRenta4ta" label="Umbral Renta 4ta (S/)" defaultValue={vigente?.UMBRAL_RENTA_4TA ?? "1500.00"} />
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Tramos progresivos Renta 5ta</h3>
            <div className="mt-2 space-y-2">
              {[
                { desde: 0, hasta: 5, tasa: 8 },
                { desde: 5, hasta: 20, tasa: 14 },
                { desde: 20, hasta: 35, tasa: 17 },
                { desde: 35, hasta: 45, tasa: 20 },
                { desde: 45, hasta: null, tasa: 30 },
              ].map((tramo, indice) => (
                <div key={indice} className="grid grid-cols-3 gap-2">
                  <input type="number" step="0.01" name="tramoDesdeUit" defaultValue={tramo.desde} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  <input
                    type="number"
                    step="0.01"
                    name="tramoHastaUit"
                    defaultValue={tramo.hasta ?? ""}
                    placeholder="sin tope"
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  <input type="number" step="0.01" name="tramoTasa" defaultValue={tramo.tasa} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              ))}
              <p className="text-xs text-slate-400 dark:text-slate-500">Desde UIT / Hasta UIT (vacio = sin tope) / Tasa %.</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Comision por fondo AFP (%)</h3>
            <div className="mt-2 space-y-2">
              {afpFondos.map((fondo) => (
                <div key={fondo.ID_MAESTRO} className="grid grid-cols-3 gap-2">
                  <input type="hidden" name="afpFondoId" value={fondo.ID_MAESTRO} />
                  <span className="col-span-2 flex items-center text-sm text-slate-700 dark:text-slate-300">{fondo.DESCRIPCION}</span>
                  <input
                    type="number"
                    step="0.01"
                    name="afpFondoComision"
                    placeholder="Comision %"
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Crear version
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Historial de versiones</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-2 py-2">Vigente desde</th>
                <th className="px-2 py-2 text-right">UIT</th>
                <th className="px-2 py-2 text-right">ONP</th>
                <th className="px-2 py-2 text-right">EsSalud</th>
                <th className="px-2 py-2 text-right">Tope AFP</th>
                <th className="px-2 py-2 text-right">Renta 4ta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {versiones.map((v) => (
                <tr key={v.ID_PARAMETRO}>
                  <td className="px-2 py-2 text-slate-700 dark:text-slate-300">{formatearFecha(v.FECHA_VIGENCIA_DESDE)}</td>
                  <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">S/ {v.UIT}</td>
                  <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">{v.PORCENTAJE_ONP}%</td>
                  <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">{v.PORCENTAJE_ESSALUD}%</td>
                  <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">S/ {v.TOPE_ASEGURABLE_AFP}</td>
                  <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">{v.PORCENTAJE_RENTA_4TA}%</td>
                </tr>
              ))}
              {versiones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400 dark:text-slate-500">
                    Aun no hay ninguna version cargada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Campo({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        step={type === "number" ? "0.01" : undefined}
        required
        defaultValue={defaultValue}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
