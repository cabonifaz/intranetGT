"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificacionRow } from "@/types/db";

const POLL_INTERVAL_MS = 60_000;

function formatearFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

export default function NotificationBell() {
  const [abierto, setAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState<NotificacionRow[]>([]);
  const contenedorRef = useRef<HTMLDivElement>(null);

  async function cargar() {
    try {
      const response = await fetch("/api/notificaciones?limite=5", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setNoLeidas(data.noLeidas ?? 0);
      setNotificaciones(data.notificaciones ?? []);
    } catch {
      // Se reintenta en el siguiente ciclo de polling.
    }
  }

  useEffect(() => {
    // Carga inicial + polling: sincroniza con el endpoint de notificaciones,
    // no con estado derivado de props/otro state, por eso el setState aqui
    // es el patron esperado (ver justificacion identica en LoginForm).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    const intervalId = window.setInterval(cargar, POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    function alClicFuera(event: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  async function marcarLeida(idNotificacionUsuario: number) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.ID_NOTIFICACION_USUARIO === idNotificacionUsuario ? { ...n, LEIDA: 1 } : n)),
    );
    setNoLeidas((prev) => Math.max(0, prev - 1));
    await fetch(`/api/notificaciones/${idNotificacionUsuario}/leer`, { method: "POST" });
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {noLeidas > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        ) : null}
      </button>

      {abierto ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Notificaciones</p>
            <Link href="/notificaciones" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
              Ver todas
            </Link>
          </div>

          {notificaciones.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No tienes notificaciones.
            </p>
          ) : (
            <ul className="mt-1 max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {notificaciones.map((n) => (
                <li key={n.ID_NOTIFICACION_USUARIO}>
                  <button
                    type="button"
                    onClick={() => !n.LEIDA && marcarLeida(n.ID_NOTIFICACION_USUARIO)}
                    className="w-full px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      {!n.LEIDA ? <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.TITULO}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{n.MENSAJE}</p>
                    <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      {formatearFecha(n.FECHA_CREACION)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
