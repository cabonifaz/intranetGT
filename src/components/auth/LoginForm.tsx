"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const REMEMBER_USER_KEY = "gt_remembered_user";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [recordarUsuario, setRecordarUsuario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // Lee localStorage (no disponible durante el render en servidor) para
    // precargar el campo usuario; por eso se sincroniza en un efecto y no
    // en el estado inicial.
    const recordado = window.localStorage.getItem(REMEMBER_USER_KEY);
    if (recordado) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsuario(recordado);
      setRecordarUsuario(true);
    }
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo iniciar sesion.");
        return;
      }

      if (recordarUsuario) {
        window.localStorage.setItem(REMEMBER_USER_KEY, usuario);
      } else {
        window.localStorage.removeItem(REMEMBER_USER_KEY);
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-900">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
          GT
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Intranet GT</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ingresa con tu usuario y clave</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="usuario" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Usuario
          </label>
          <input
            id="usuario"
            name="usuario"
            type="text"
            autoComplete="username"
            required
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="clave" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Clave
          </label>
          <input
            id="clave"
            name="clave"
            type="password"
            autoComplete="current-password"
            required
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={recordarUsuario}
            onChange={(e) => setRecordarUsuario(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Recordar mi usuario
        </label>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
