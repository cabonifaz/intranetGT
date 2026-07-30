import type { AplicacionVisibleRow } from "@/types/db";
import AppCard from "./AppCard";

export default function AppGrid({ apps }: { apps: AplicacionVisibleRow[] }) {
  if (apps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Aun no tienes aplicaciones asignadas</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Pide a un administrador que te asigne un rol con acceso a algun modulo.
        </p>
      </div>
    );
  }

  const grupos = new Map<string, AplicacionVisibleRow[]>();
  for (const app of apps) {
    const lista = grupos.get(app.AREA_NOMBRE) ?? [];
    lista.push(app);
    grupos.set(app.AREA_NOMBRE, lista);
  }

  return (
    <div className="space-y-6">
      {[...grupos.entries()].map(([area, appsDelArea]) => (
        <div key={area}>
          <h2 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{area}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {appsDelArea.map((app) => (
              <AppCard key={app.ID_APLICACION} app={app} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
