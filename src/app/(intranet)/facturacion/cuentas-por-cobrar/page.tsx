import Link from "next/link";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { listarHitosPendientes } from "@/lib/db/repositories/proyecto.repository";
import HitoFilaAcciones from "@/components/facturacion/HitoFilaAcciones";

function formatearMonto(monto: string | number): string {
  return `S/ ${Number(monto).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "Sin fecha estimada";
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { dateStyle: "medium" });
}

// Vista consolidada del plan de facturacion de todos los proyectos que
// aun no se cobraron (PLANEADO/FACTURADO) -- mismo HitoFilaAcciones.tsx
// que ya usa el detalle de cada proyecto, asi "Marcar facturado"/"Cobrar"
// funcionan identico aca (incluido el fix de controles pegados de esta
// sesion).
export default async function CuentasPorCobrarPage() {
  await requirePermiso("CUENTAS_POR_COBRAR", "LECTURA");

  const hitos = await listarHitosPendientes();

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Cuentas por cobrar</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Items del plan de facturacion de todos los proyectos que todavia no se cobraron.
        </p>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Fecha estimada</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {hitos.map((h) => (
              <tr key={h.ID_HITO}>
                <td className="px-4 py-3">
                  <Link href={`/facturacion/proyectos/${h.ID_PROYECTO}`} className="text-blue-600 hover:underline dark:text-blue-400">
                    {h.PROYECTO_NOMBRE}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                  {h.NOMBRE}
                  {h.PORCENTAJE ? <span className="ml-1 text-xs text-slate-400">({h.PORCENTAJE}%)</span> : null}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{h.TIPO_HITO_DESCRIPCION}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatearFecha(h.FECHA_ESTIMADA)}</td>
                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{formatearMonto(h.MONTO)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      h.ESTADO_HITO_CODIGO === "FACTURADO"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    }`}
                  >
                    {h.ESTADO_HITO_DESCRIPCION}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <HitoFilaAcciones hito={h} idProyecto={h.ID_PROYECTO} nombreProyecto={h.PROYECTO_NOMBRE} />
                </td>
              </tr>
            ))}
            {hitos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  No hay nada pendiente de cobrar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
