"use client";

import { useActionState } from "react";
import { emitirConformidadAction, type EmitirConformidadState } from "@/lib/actions/proyecto-conformidad";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

const ESTADO_INICIAL: EmitirConformidadState = { ok: false };

// Genera el PDF sin firma y pasa la conformidad de BORRADOR a EMITIDA --
// de ahi en adelante los items quedan congelados (ver
// emitirConformidadAction, que exige al menos 1 item).
export default function EmitirConformidadBoton({ idConformidad }: { idConformidad: number }) {
  const [estado, formAction] = useActionState(emitirConformidadAction, ESTADO_INICIAL);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="idConformidad" value={idConformidad} />
        <ConfirmSubmitButton
          mensaje="¿Emitir esta conformidad? Los items quedan congelados y ya no se podrán editar -- para corregirlos habría que reabrirla."
          pendingText="Emitiendo..."
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Emitir conformidad
        </ConfirmSubmitButton>
      </form>
      {estado.error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{estado.error}</p> : null}
    </div>
  );
}
