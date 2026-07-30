"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AplicacionVisibleRow } from "@/types/db";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Inicio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    href: "/notificaciones",
    label: "Notificaciones",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9" />
      </svg>
    ),
  },
  {
    href: "/perfil",
    label: "Mi perfil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
      </svg>
    ),
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  areaNombre: string | null;
  apps: AplicacionVisibleRow[];
}

function agruparPorArea(apps: AplicacionVisibleRow[]): [string, AplicacionVisibleRow[]][] {
  const grupos = new Map<string, AplicacionVisibleRow[]>();
  for (const app of apps) {
    const lista = grupos.get(app.AREA_NOMBRE) ?? [];
    lista.push(app);
    grupos.set(app.AREA_NOMBRE, lista);
  }
  return [...grupos.entries()];
}

export default function Sidebar({ open, onClose, areaNombre, apps }: SidebarProps) {
  const pathname = usePathname();
  const gruposDeApps = agruparPorArea(apps);

  const contenido = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-4">
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          GT
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Intranet GT</p>
          {areaNombre ? <p className="text-xs text-slate-500 dark:text-slate-400">{areaNombre}</p> : null}
        </div>
      </div>

      {NAV_ITEMS.map((item) => {
        const activo = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activo
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}

      {gruposDeApps.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Las aplicaciones de tu area apareceran aqui segun tus permisos.
        </div>
      ) : (
        gruposDeApps.map(([area, appsDelArea]) => (
          <div key={area} className="mt-4">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {area}
            </p>
            {appsDelArea.map((app) => {
              const href = app.RUTA_INTERNA ?? app.URL_EXTERNA ?? "#";
              const activo = app.RUTA_INTERNA ? pathname === app.RUTA_INTERNA : false;
              const externo = app.TIPO_APLICACION_CODIGO === "APP_EXTERNA";
              return (
                <Link
                  key={app.ID_APLICACION}
                  href={href}
                  onClick={onClose}
                  target={externo ? "_blank" : undefined}
                  rel={externo ? "noopener noreferrer" : undefined}
                  className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activo
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {app.NOMBRE}
                </Link>
              );
            })}
          </div>
        ))
      )}
    </nav>
  );

  return (
    <>
      {/* Desktop: sidebar fija */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        {contenido}
      </aside>

      {/* Mobile: drawer con overlay */}
      {open ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl dark:bg-slate-900">{contenido}</aside>
        </div>
      ) : null}
    </>
  );
}
