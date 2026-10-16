"use client";

import { useActionState, useState } from "react";
import { generarLinkRecepcionBoletaAction, type GenerarLinkRecepcionBoletaState } from "@/lib/actions/rrhh-planilla";
import SubmitButton from "@/components/ui/SubmitButton";

const ESTADO_INICIAL: GenerarLinkRecepcionBoletaState = { ok: false };

// Copia 1:1 del patron de GenerarLinkPrestamoButton.tsx -- alternativa a
// que el colaborador confirme desde su propia sesion: un link publico
// para compartir por fuera (WhatsApp, correo) a quien no entra seguido
// al intranet.
export default function GenerarLinkRecepcionBoletaButton({ idPlanillaDetalle }: { idPlanillaDetalle: number }) {
  const [estado, formAction] = useActionState(generarLinkRecepcionBoletaAction, ESTADO_INICIAL);
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
        <input type="hidden" name="idPlanillaDetalle" value={idPlanillaDetalle} />
        <SubmitButton
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          pendingText="Generando..."
        >
          Generar link para confirmar sin iniciar sesión
        </SubmitButton>
      </form>

      {estado.error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{estado.error}</p> : null}

      {estado.ok && estado.url ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-mono break-all text-emerald-700 dark:text-emerald-400">{estado.url}</p>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
            Válido por 7 días. Compártelo con el colaborador para que confirme que recibió su boleta.
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
