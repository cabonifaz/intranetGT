"use client";

import { useEffect } from "react";
import Link from "next/link";

// Limite de la app: atrapa cualquier error no controlado que se le
// escape a una pantalla (una Server Action que lanza Error, un fallo de
// render) para mostrar un mensaje legible en vez de que la pantalla se
// caiga entera. `unstable_retry` (no `reset`, cambio de esta version de
// Next) reintenta re-renderizar el segmento sin recargar toda la app.
export default function ErrorIntranet({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-12">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950/30">
        <h1 className="text-lg font-semibold text-red-700 dark:text-red-400">Ocurrió un error</h1>
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error.message || "Algo salió mal al procesar esta pantalla."}
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={() => unstable_retry()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Ir al inicio
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-3 text-xs text-red-400 dark:text-red-500">Referencia: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
