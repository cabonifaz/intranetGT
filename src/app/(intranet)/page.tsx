import { requireSession } from "@/lib/auth/get-current-user";
import { listarAplicacionesVisibles } from "@/lib/db/repositories/aplicacion.repository";
import AppGrid from "@/components/dashboard/AppGrid";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DashboardPage() {
  const sesion = await requireSession();
  const apps = await listarAplicacionesVisibles(sesion.idUsuario);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
          Hola, {sesion.nombres}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Bienvenido a la Intranet GT.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Estado de sesion
          </p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
            {sesion.dentroHorario
              ? "Dentro de tu horario laboral: la sesion se mantiene activa sin cerrarse por inactividad."
              : "Fuera de tu horario laboral: la sesion se cerrara tras 30 minutos de inactividad."}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Expira: {formatearFecha(sesion.fechaExpiracion)}
          </p>
        </div>
      </div>

      <AppGrid apps={apps} />
    </div>
  );
}
