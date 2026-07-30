"use client";

import { useState } from "react";
import type { NotificacionRow } from "@/types/db";

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });
}

export default function NotificacionItem({ notificacion }: { notificacion: NotificacionRow }) {
  const [leida, setLeida] = useState(Boolean(notificacion.LEIDA));

  async function marcarLeida() {
    if (leida) return;
    setLeida(true);
    await fetch(`/api/notificaciones/${notificacion.ID_NOTIFICACION_USUARIO}/leer`, { method: "POST" });
  }

  return (
    <li>
      <button type="button" onClick={marcarLeida} className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800">
        <div className="flex items-center gap-2">
          {!leida ? <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{notificacion.TITULO}</p>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notificacion.MENSAJE}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {notificacion.CATEGORIA_DESCRIPCION} - {formatearFecha(notificacion.FECHA_CREACION)}
        </p>
      </button>
    </li>
  );
}
