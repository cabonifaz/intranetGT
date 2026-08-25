import { listarUsuarios, listarRolesActivosDeUsuarios } from "@/lib/db/repositories/usuario.repository";
import { listarRoles } from "@/lib/db/repositories/rol.repository";
import { asignarRolAction, revocarRolAction } from "@/lib/actions/administracion";
import CrearUsuarioForm from "@/components/administracion/CrearUsuarioForm";
import RevocarRolButton from "@/components/administracion/RevocarRolButton";
import ResetearClaveButton from "@/components/administracion/ResetearClaveButton";
import type { UsuarioRolActivoRow } from "@/types/db";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";
import SubmitButton from "@/components/ui/SubmitButton";

export default async function UsuariosPage() {
  const [usuarios, roles, rolesActivos] = await Promise.all([
    listarUsuarios(false),
    listarRoles(true),
    listarRolesActivosDeUsuarios(),
  ]);

  const rolesPorUsuario = new Map<number, UsuarioRolActivoRow[]>();
  for (const ur of rolesActivos) {
    const lista = rolesPorUsuario.get(ur.ID_USUARIO) ?? [];
    lista.push(ur);
    rolesPorUsuario.set(ur.ID_USUARIO, lista);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Usuarios</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Rol(es)</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuarios.map((u) => (
                <tr key={u.ID_USUARIO}>
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{u.USUARIO}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {u.NOMBRES} {u.APELLIDOS}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{u.CORREO}</td>
                  <td className="px-4 py-2">
                    {(rolesPorUsuario.get(u.ID_USUARIO) ?? []).length === 0 ? (
                      <span className="text-slate-400 dark:text-slate-500">Sin rol asignado</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(rolesPorUsuario.get(u.ID_USUARIO) ?? []).map((ur) => {
                          const protegido = u.USUARIO === "admin" && ur.ROL_CODIGO === "SUPER_ADMIN";
                          if (protegido) {
                            return (
                              <span
                                key={ur.ID_ROL}
                                title="No se puede quitar: protege el acceso de administracion"
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              >
                                {ur.ROL_NOMBRE} ★ 🔒
                              </span>
                            );
                          }
                          return (
                            <form key={ur.ID_ROL} action={revocarRolAction} className="inline-flex">
                              <input type="hidden" name="idUsuario" value={u.ID_USUARIO} />
                              <input type="hidden" name="idRol" value={ur.ID_ROL} />
                              <RevocarRolButton rolNombre={ur.ROL_NOMBRE} esPrincipal={Boolean(ur.ES_PRINCIPAL)} />
                            </form>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {u.ESTADO_USUARIO_CODIGO}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <ResetearClaveButton idUsuario={u.ID_USUARIO} usuario={u.USUARIO} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-8 text-sm font-semibold text-slate-800 dark:text-white">Asignar rol a un usuario</h2>
        <form action={asignarRolAction} className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Usuario</label>
            <div className="w-48">
              <ComboBusqueda
                name="idUsuario"
                defaultValue={usuarios[0] ? String(usuarios[0].ID_USUARIO) : ""}
                opciones={usuarios.map((u) => ({ value: String(u.ID_USUARIO), label: u.USUARIO }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Rol</label>
            <div className="w-56">
              <ComboBusqueda
                name="idRol"
                defaultValue={roles[0] ? String(roles[0].ID_ROL) : ""}
                opciones={roles.map((r) => ({ value: String(r.ID_ROL), label: `${r.AREA_NOMBRE} - ${r.NOMBRE}` }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-1.5 pb-1.5 text-xs text-slate-600 dark:text-slate-300">
            <input type="checkbox" name="esPrincipal" className="h-3.5 w-3.5" />
            Rol principal
          </label>
          <SubmitButton className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700" pendingText="Asignando...">
            Asignar
          </SubmitButton>
        </form>
      </div>

      <div>
        <CrearUsuarioForm />
      </div>
    </div>
  );
}
