"use client";

import { useEffect } from "react";

// Mismo limite de error que src/app/(intranet)/error.tsx, pero para el
// flujo publico de firma (sin login) -- sin link "Ir al inicio" (no hay
// intranet a la que volver) y con el mismo estilo de tarjeta que ya usa
// esta pantalla para "Link no disponible".
export default function ErrorContratosPublico({
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900 dark:bg-red-950/30">
      <h1 className="text-lg font-semibold text-red-700 dark:text-red-400">Ocurrió un error</h1>
      <p className="mt-2 text-sm text-red-600 dark:text-red-400">
        {error.message || "Algo salió mal al procesar esta pagina. Si el problema sigue, contacta a Recursos Humanos."}
      </p>
      <button
        onClick={() => unstable_retry()}
        className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Reintentar
      </button>
      {error.digest ? (
        <p className="mt-3 text-xs text-red-400 dark:text-red-500">Referencia: {error.digest}</p>
      ) : null}
    </div>
  );
}
