import { requireSession } from "@/lib/auth/get-current-user";
import { listarNotificacionesPorUsuario } from "@/lib/db/repositories/notificacion.repository";
import MarcarTodasLeidasButton from "@/components/notificaciones/MarcarTodasLeidasButton";
import NotificacionItem from "@/components/notificaciones/NotificacionItem";

export default async function NotificacionesPage() {
  const sesion = await requireSession();
  const notificaciones = await listarNotificacionesPorUsuario(sesion.idUsuario, false, 50, 0);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Notificaciones</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Avisos de todos los modulos de la intranet.
          </p>
        </div>
        <MarcarTodasLeidasButton />
      </div>

      {notificaciones.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aun no hay notificaciones</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {notificaciones.map((n) => (
            <NotificacionItem key={n.ID_NOTIFICACION_USUARIO} notificacion={n} />
          ))}
        </ul>
      )}
    </div>
  );
}
