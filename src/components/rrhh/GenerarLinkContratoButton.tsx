"use client";

import { useActionState, useState } from "react";
import { generarLinkContratoAction, type GenerarLinkContratoState } from "@/lib/actions/rrhh";
import SubmitButton from "@/components/ui/SubmitButton";

const ESTADO_INICIAL: GenerarLinkContratoState = { ok: false };

export default function GenerarLinkContratoButton({ idContrato }: { idContrato: number }) {
  const [estado, formAction] = useActionState(generarLinkContratoAction, ESTADO_INICIAL);
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    if (!estado.url) return;
    await navigator.clipboard.writeText(estado.url);
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="idContrato" value={idContrato} />
        <SubmitButton
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          pendingText="Generando..."
        >
          Generar link de firma
        </SubmitButton>
      </form>

      {estado.error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{estado.error}</p> : null}

      {estado.ok && estado.url ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-mono break-all text-emerald-700 dark:text-emerald-400">{estado.url}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
            Válido por 7 días. Compártelo con la persona para que complete y firme su contrato.
          </p>
          <button
            type="button"
            onClick={copiar}
            className="mt-2 rounded-lg border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
          >
            {copiado ? "Copiado" : "Copiar link"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
