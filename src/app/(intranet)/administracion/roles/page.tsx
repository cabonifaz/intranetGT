import { listarAreas } from "@/lib/db/repositories/area.repository";
import { listarRoles } from "@/lib/db/repositories/rol.repository";
import CrearAreaForm from "@/components/administracion/CrearAreaForm";
import CrearRolForm from "@/components/administracion/CrearRolForm";

export default async function RolesPage() {
  const [areas, roles] = await Promise.all([listarAreas(true), listarRoles(false)]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Roles por area</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Area</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Codigo</th>
                <th className="px-4 py-2">Nivel jerarquico</th>
                <th className="px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {roles.map((r) => (
                <tr key={r.ID_ROL}>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{r.AREA_NOMBRE}</td>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{r.NOMBRE}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.CODIGO}</td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.NIVEL_JERARQUICO}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {r.ESTADO_CODIGO}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <CrearAreaForm />
        <CrearRolForm areas={areas} />
      </div>
    </div>
  );
}
