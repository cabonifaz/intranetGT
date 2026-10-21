"use client";

import { useActionState } from "react";
import { presentarDeclaracionAction, type PresentarDeclaracionState } from "@/lib/actions/declaraciones-tributarias";
import SubmitButton from "@/components/ui/SubmitButton";

const ESTADO_INICIAL: PresentarDeclaracionState = { ok: false };

// Si genero saldo a favor, acredita la cuenta IGV_FAVOR/RENTA_FAVOR
// automaticamente (ver presentarDeclaracionAction) -- el error que puede
// devolver esta accion con ok:true es en realidad un aviso (no hay
// cuenta para acreditar), no un fallo real, por eso se muestra en ambar
// y no en rojo.
export default function PresentarDeclaracionButton({ idDeclaracion }: { idDeclaracion: number }) {
  const [state, formAction] = useActionState(presentarDeclaracionAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="idDeclaracion" value={idDeclaracion} />
      <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" pendingText="Presentando...">
        Marcar como presentada
      </SubmitButton>
      {state.error ? (
        <p
          className={`rounded-lg px-3 py-2 text-xs ${
            state.ok
              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
