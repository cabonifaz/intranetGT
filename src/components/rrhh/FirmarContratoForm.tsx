"use client";

import { useRef, useState } from "react";
import { ComboBusqueda, type OpcionCombo } from "@/components/ui/ComboBusqueda";
import FirmaInput, { type FirmaInputHandle } from "./FirmaInput";

interface FirmarContratoFormProps {
  token: string;
  bancos: OpcionCombo[];
  nroCuentaInicial: string | null;
  cciInicial: string | null;
  bancoInicial: string | null;
}

export default function FirmarContratoForm({
  token,
  bancos,
  nroCuentaInicial,
  cciInicial,
  bancoInicial,
}: FirmarContratoFormProps) {
  const firmaRef = useRef<FirmaInputHandle>(null);
  // Si el contrato ya trae datos bancarios (ej. una renovacion, que los
  // copia del contrato anterior -- ver SP_RRHH_CONTRATO_RENOVAR/
  // SP_RRHH_CONTRATO_CREAR) se precargan aca, pero siguen siendo
  // editables por si la persona cambio de cuenta/banco.
  const [nroCuenta, setNroCuenta] = useState(nroCuentaInicial ?? "");
  const [cci, setCci] = useState(cciInicial ?? "");
  const [banco, setBanco] = useState(bancoInicial ?? "");
  const [heLeido, setHeLeido] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDescarga, setUrlDescarga] = useState<string | null>(null);

  async function enviar() {
    setError(null);

    if (!heLeido) {
      setError("Debes confirmar que leiste el contrato antes de firmar.");
      return;
    }
    const firmaPngDataUrl = firmaRef.current?.obtenerPngDataUrl();
    if (!firmaPngDataUrl) {
      setError("Falta tu firma.");
      return;
    }
    if (!nroCuenta.trim() || !cci.trim() || !banco.trim()) {
      setError("Completa tus datos bancarios.");
      return;
    }

    setEnviando(true);
    try {
      const response = await fetch(`/api/contratos/publico/${token}/firmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nroCuenta, cci, banco, firmaPngDataUrl, confirmoLectura: heLeido }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo firmar el contrato.");
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
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Contrato firmado</p>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
          Descarga tu copia y guárdala. Este link ya no volverá a funcionar.
        </p>
        <a
          href={urlDescarga}
          download="contrato-firmado.pdf"
          className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Descargar PDF
        </a>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Datos bancarios</h2>
      {nroCuentaInicial || cciInicial || bancoInicial ? (
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          Precargados con los datos de tu contrato anterior -- corrigelos si cambiaron.
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Campo etiqueta="N° de cuenta" valor={nroCuenta} onCambio={setNroCuenta} />
        <Campo etiqueta="CCI" valor={cci} onCambio={setCci} />
        <div>
          <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Banco</label>
          <ComboBusqueda
            name="banco"
            defaultValue={bancoInicial ?? undefined}
            opciones={bancos}
            placeholder="Buscar banco..."
            onSeleccionar={setBanco}
          />
        </div>
      </div>

      <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Tu firma</h2>
      <FirmaInput ref={firmaRef} />

      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={heLeido}
          onChange={(e) => setHeLeido(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700"
        />
        He leído el contrato completo (ver el PDF arriba) y estoy de acuerdo en firmarlo.
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
        {enviando ? "Firmando..." : "Firmar contrato"}
      </button>
    </div>
  );
}

function Campo({
  etiqueta,
  valor,
  onCambio,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">{etiqueta}</label>
      <input
        type="text"
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  );
}
