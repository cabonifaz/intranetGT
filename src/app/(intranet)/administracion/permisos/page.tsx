import Link from "next/link";
import { listarRoles } from "@/lib/db/repositories/rol.repository";
import { listarPermisosPorRol } from "@/lib/db/repositories/permiso.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { asignarPermisoAction } from "@/lib/actions/administracion";

export default async function PermisosPage({
  searchParams,
}: {
  searchParams: Promise<{ rol?: string }>;
}) {
  const [roles, nivelesPermiso] = await Promise.all([listarRoles(true), listarMaestros("NIVEL_PERMISO")]);

  const { rol } = await searchParams;
  const idRolActivo = rol ? Number(rol) : roles[0]?.ID_ROL;
  const permisos = idRolActivo ? await listarPermisosPorRol(idRolActivo) : [];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <Link
            key={r.ID_ROL}
            href={`/administracion/permisos?rol=${r.ID_ROL}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              r.ID_ROL === idRolActivo
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {r.AREA_NOMBRE} - {r.NOMBRE}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Aplicacion</th>
              <th className="px-4 py-2">Nivel actual</th>
              <th className="px-4 py-2">Cambiar a</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {permisos.map((p) => (
              <tr key={p.ID_APLICACION}>
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{p.APLICACION_NOMBRE}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {p.NIVEL_PERMISO_CODIGO}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <form action={asignarPermisoAction} className="flex items-center gap-2">
                    <input type="hidden" name="idRol" value={idRolActivo} />
                    <input type="hidden" name="idAplicacion" value={p.ID_APLICACION} />
                    <select
                      name="idNivelPermiso"
                      defaultValue={p.ID_NIVEL_PERMISO}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {nivelesPermiso.map((n) => (
                        <option key={n.ID_MAESTRO} value={n.ID_MAESTRO}>
                          {n.DESCRIPCION}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700">
                      Guardar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
