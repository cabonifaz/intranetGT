"use client";

import { useActionState } from "react";
import { deshacerEmisionDetalleAction, type DeshacerEmisionState } from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

const ESTADO_INICIAL: DeshacerEmisionState = { ok: false };

// Para revertir un click accidental en "Emitir" -- vuelve el detalle a
// PENDIENTE (editable de nuevo). Bloqueado (con codigo de error visible)
// si ya avanzo algun paso posterior, ver deshacerEmisionDetalleAction.
export default function DeshacerEmisionBoton({ idPlanillaDetalle, esPlanilla }: { idPlanillaDetalle: number; esPlanilla: boolean }) {
  const [estado, formAction] = useActionState(deshacerEmisionDetalleAction, ESTADO_INICIAL);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="idPlanillaDetalle" value={idPlanillaDetalle} />
        <ConfirmSubmitButton
          mensaje={`¿Deshacer la emisión de ${esPlanilla ? "esta boleta" : "esta orden de servicio"}? Vuelve a quedar pendiente y editable, como si nunca se hubiera emitido.`}
          pendingText="Deshaciendo..."
          className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
        >
          Deshacer emisión
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
