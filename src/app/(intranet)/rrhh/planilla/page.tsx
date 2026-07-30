import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarPlanillasMensuales } from "@/lib/db/repositories/rrhh-planilla.repository";
import { generarPlanillaMensualAction } from "@/lib/actions/rrhh-planilla";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default async function PlanillaMensualPage() {
  await requirePermiso("RRHH_PLANILLA", "LECTURA");

  const planillas = await listarPlanillasMensuales();

  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const mesActual = hoy.getMonth() + 1;
  const yaExisteMesActual = planillas.some((p) => p.ANIO === anioActual && p.MES === mesActual);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Planilla Mensual</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Planilla del mes de todos los colaboradores -- boletas de pago y recibos por honorarios.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/rrhh/planilla/parametros"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Parametros
          </Link>
          <form action={generarPlanillaMensualAction}>
            <input type="hidden" name="anio" value={anioActual} />
            <input type="hidden" name="mes" value={mesActual} />
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {yaExisteMesActual ? `Actualizar planilla de ${MESES[mesActual - 1]}` : `Generar planilla de ${MESES[mesActual - 1]}`}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2 text-right">Colaboradores</th>
              <th className="px-4 py-2 text-right">Emitidos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {planillas.map((p) => (
              <tr key={p.ID_PLANILLA_MENSUAL}>
                <td className="px-4 py-2">
                  <Link
                    href={`/rrhh/planilla/${p.ID_PLANILLA_MENSUAL}`}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {p.PERIODO}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.ESTADO_PLANILLA_CODIGO === "EMITIDA"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    {p.ESTADO_PLANILLA_DESCRIPCION}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">{p.TOTAL_COLABORADORES ?? 0}</td>
                <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">
                  {p.TOTAL_EMITIDOS ?? 0} / {p.TOTAL_COLABORADORES ?? 0}
                </td>
              </tr>
            ))}
            {planillas.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400 dark:text-slate-500">
                  Aun no hay planillas generadas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
