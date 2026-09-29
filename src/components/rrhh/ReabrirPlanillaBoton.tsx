"use client";

import { useActionState } from "react";
import { reabrirPlanillaMensualAction, type ReabrirPlanillaState } from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

const ESTADO_INICIAL: ReabrirPlanillaState = { ok: false };

// Deshace una planilla EMITIDA por error y la vuelve a Borrador -- ver
// reabrirPlanillaMensualAction. Bloqueado (con codigo de error visible)
// si ya hay pagos de aportes marcados.
export default function ReabrirPlanillaBoton({ idPlanillaMensual }: { idPlanillaMensual: number }) {
  const [estado, formAction] = useActionState(reabrirPlanillaMensualAction, ESTADO_INICIAL);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
        <ConfirmSubmitButton
          mensaje="¿Reabrir esta planilla? Vuelve a Borrador para poder generarla, corregirla o revisarla de nuevo antes de volver a emitirla."
          pendingText="Reabriendo..."
          className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/70"
        >
          Reabrir planilla
        </ConfirmSubmitButton>
      </form>
      {estado.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {estado.error} {estado.codigo ? `· Código: ${estado.codigo}` : ""}
        </p>
      ) : null}
    </div>
  );
}
