import { listarAplicaciones } from "@/lib/db/repositories/aplicacion.repository";
import { listarAreas } from "@/lib/db/repositories/area.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import CrearAplicacionForm from "@/components/administracion/CrearAplicacionForm";

export default async function AplicacionesPage() {
  const [aplicaciones, areas, tiposAplicacion] = await Promise.all([
    listarAplicaciones(false),
    listarAreas(true),
    listarMaestros("TIPO_APLICACION"),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Aplicaciones</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Codigo</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Area</th>
                <th className="px-4 py-2">Ruta / URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {aplicaciones.map((a) => (
                <tr key={a.ID_APLICACION}>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{a.CODIGO}</td>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{a.NOMBRE}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{a.TIPO_APLICACION_CODIGO}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{a.AREA_NOMBRE}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                    {a.RUTA_INTERNA ?? a.URL_EXTERNA ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <CrearAplicacionForm areas={areas} tiposAplicacion={tiposAplicacion} />
      </div>
    </div>
  );
}
