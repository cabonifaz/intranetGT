import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarUsuarios } from "@/lib/db/repositories/usuario.repository";
import { listarRoles } from "@/lib/db/repositories/rol.repository";
import { listarAreas } from "@/lib/db/repositories/area.repository";
import { enviarNotificacionAction } from "@/lib/actions/administracion";
import { ComboBusqueda } from "@/components/ui/ComboBusqueda";

export default async function NotificacionesAdminPage() {
  const [categorias, usuarios, roles, areas] = await Promise.all([
    listarMaestros("CATEGORIA_NOTIFICACION"),
    listarUsuarios(true),
    listarRoles(true),
    listarAreas(true),
  ]);

  return (
    <div className="max-w-xl">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Enviar notificacion</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Elige al menos un destinatario: un usuario especifico, todos los de un rol, o todos los de un area. Puedes
        combinar los tres a la vez.
      </p>

      <form action={enviarNotificacionAction} className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Categoria</label>
          <ComboBusqueda
            name="idCategoria"
            defaultValue={categorias[0] ? String(categorias[0].ID_MAESTRO) : ""}
            opciones={categorias.map((c) => ({ value: String(c.ID_MAESTRO), label: c.DESCRIPCION }))}
          />
        </div>

        <Campo name="titulo" label="Titulo" />

        <div>
          <label htmlFor="mensaje" className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
            Mensaje
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={3}
            required
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <Campo name="urlDestino" label="URL destino (opcional)" required={false} />

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
          <input type="checkbox" name="enviarATodos" className="h-4 w-4" />
          Enviar a todos los usuarios (todas las areas)
        </label>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Los siguientes destinatarios se pueden combinar con la opcion de arriba, o usarse solos:
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Usuario especifico</label>
            <ComboBusqueda
              name="idUsuarioDestino"
              placeholder="-- ninguno --"
              opciones={usuarios.map((u) => ({ value: String(u.ID_USUARIO), label: u.USUARIO }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Todo un rol</label>
            <ComboBusqueda
              name="idRolDestino"
              placeholder="-- ninguno --"
              opciones={roles.map((r) => ({ value: String(r.ID_ROL), label: `${r.AREA_NOMBRE} - ${r.NOMBRE}` }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Toda un area</label>
            <ComboBusqueda
              name="idAreaDestino"
              placeholder="-- ninguno --"
              opciones={areas.map((a) => ({ value: String(a.ID_AREA), label: a.NOMBRE }))}
            />
          </div>
        </div>

        <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Enviar
        </button>
      </form>
    </div>
  );
}

function Campo({ name, label, required = true }: { name: string; label: string; required?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        required={required}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
