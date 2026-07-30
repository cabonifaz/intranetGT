"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProfileMenuProps {
  nombres: string;
  apellidos: string;
  rolNombre: string | null;
}

export default function ProfileMenu({ nombres, apellidos, rolNombre }: ProfileMenuProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const nombreCompleto = `${nombres} ${apellidos}`.trim();
  const iniciales = `${nombres[0] ?? ""}${apellidos[0] ?? ""}`.toUpperCase();

  useEffect(() => {
    function alClicFuera(event: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClicFuera);
    return () => document.removeEventListener("mousedown", alClicFuera);
  }, []);

  async function cerrarSesion() {
    setCerrandoSesion(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {iniciales}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">
            {nombreCompleto}
          </span>
          {rolNombre ? (
            <span className="block text-xs leading-tight text-slate-500 dark:text-slate-400">{rolNombre}</span>
          ) : null}
        </span>
      </button>

      {abierto ? (
        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <Link
            href="/perfil"
            className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => setAbierto(false)}
          >
            Mi perfil
          </Link>
          <button
            type="button"
            onClick={cerrarSesion}
            disabled={cerrandoSesion}
            className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {cerrandoSesion ? "Cerrando sesion..." : "Cerrar sesion"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
