"use client";

import { useRef, useState } from "react";
import FirmaInput, { type FirmaInputHandle } from "./FirmaInput";

// Igual que FirmarContratoForm, pero sin datos bancarios -- el prestamo ya
// trae su cuenta de desembolso (si aplica) desde que se creo, y aca solo
// se necesita la firma del beneficiario.
export default function FirmarPrestamoForm({ token }: { token: string }) {
  const firmaRef = useRef<FirmaInputHandle>(null);
  const [heLeido, setHeLeido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDescarga, setUrlDescarga] = useState<string | null>(null);

  async function enviar() {
    setError(null);

    if (!heLeido) {
      setError("Debes confirmar que leíste el compromiso antes de firmar.");
      return;
    }
    const firmaPngDataUrl = firmaRef.current?.obtenerPngDataUrl();
    if (!firmaPngDataUrl) {
      setError("Falta tu firma.");
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch(`/api/prestamos/publico/${token}/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firmaPngDataUrl, confirmoLectura: heLeido }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo firmar el compromiso.");
        return;
      }

      const blob = await response.blob();
      setUrlDescarga(URL.createObjectURL(blob));
    } catch {
      setError("No se pudo conectar con el servidor. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  }

  if (urlDescarga) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Compromiso firmado</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          Descarga tu copia y guárdala. Este link ya no volverá a funcionar.
        </p>
        <a
          href={urlDescarga}
          download="compromiso-firmado.pdf"
          className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Descargar PDF
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Tu firma</h2>
      <FirmaInput ref={firmaRef} />

      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={heLeido}
          onChange={(e) => setHeLeido(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700"
        />
        He leído el compromiso completo (ver el PDF arriba) y estoy de acuerdo en firmarlo.
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !heLeido}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Firmando..." : "Firmar compromiso"}
      </button>
    </div>
  );
}
