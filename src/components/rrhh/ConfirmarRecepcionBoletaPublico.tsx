"use client";

import { useState } from "react";

// Mas simple que FirmarPrestamoForm/FirmarConformidadForm -- aca no hay
// firma que dibujar, solo un acuse de recibo con un clic.
export default function ConfirmarRecepcionBoletaPublico({ token }: { token: string }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  async function confirmar() {
    setError(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/boletas/publico/${token}/confirmar`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo confirmar la recepción.");
        return;
      }
      setConfirmado(true);
    } catch {
      setError("No se pudo conectar con el servidor. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (confirmado) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Recepción confirmada</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">Gracias, ya quedó registrado que recibiste tu boleta.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={confirmar}
        disabled={enviando}
        className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Confirmando..." : "Confirmar recepción de mi boleta"}
      </button>
    </div>
  );
}
