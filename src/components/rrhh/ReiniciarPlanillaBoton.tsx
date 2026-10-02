"use client";

import { useActionState } from "react";
import { reiniciarPlanillaMensualAction, type ReiniciarPlanillaState } from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

const ESTADO_INICIAL: ReiniciarPlanillaState = { ok: false };

// Borra TODOS los detalles del mes para empezar de cero (ej. quedaron
// duplicados por 2 contratos solapados) -- ver reiniciarPlanillaMensualAction.
// Bloqueado (con codigo de error visible) si ya hay alguien emitido.
export default function ReiniciarPlanillaBoton({ idPlanillaMensual }: { idPlanillaMensual: number }) {
  const [estado, formAction] = useActionState(reiniciarPlanillaMensualAction, ESTADO_INICIAL);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
        <ConfirmSubmitButton
          mensaje="¿Regenerar esta planilla desde cero? Se borran TODOS los colaboradores que todavía no estén emitidos, para volver a generarla limpia. No se puede deshacer."
          pendingText="Reiniciando..."
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Regenerar desde cero
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
