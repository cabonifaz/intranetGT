import Link from "next/link";
import type { AplicacionVisibleRow } from "@/types/db";

const NIVEL_LABEL: Record<string, string> = {
  LECTURA: "Lectura",
  ESCRITURA: "Lectura y escritura",
  ADMIN: "Administrador",
};

export default function AppCard({ app }: { app: AplicacionVisibleRow }) {
  const contenido = (
    <>
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {app.NOMBRE.slice(0, 2).toUpperCase()}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {NIVEL_LABEL[app.NIVEL_PERMISO_CODIGO] ?? app.NIVEL_PERMISO_CODIGO}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-white">{app.NOMBRE}</p>
      {app.DESCRIPCION ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{app.DESCRIPCION}</p>
      ) : null}
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{app.AREA_NOMBRE}</p>
    </>
  );

  const claseCard =
    "block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-800";

  if (app.TIPO_APLICACION_CODIGO === "MODULO_INTERNO" && app.RUTA_INTERNA) {
    return (
      <Link href={app.RUTA_INTERNA} className={claseCard}>
        {contenido}
      </Link>
    );
  }

  if (app.TIPO_APLICACION_CODIGO === "APP_EXTERNA" && app.URL_EXTERNA && !app.REQUIERE_SSO) {
    return (
      <a href={app.URL_EXTERNA} target="_blank" rel="noopener noreferrer" className={claseCard}>
        {contenido}
      </a>
    );
  }

  return (
    <div className={`${claseCard} cursor-not-allowed opacity-60`} title="Disponible proximamente (SSO)">
      {contenido}
    </div>
  );
}
