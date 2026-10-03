"use client";

import { useActionState } from "react";
import { reiniciarPlanillaMensualTotalAction, type ReiniciarPlanillaTotalState } from "@/lib/actions/rrhh-planilla";
import ConfirmSubmitButton from "@/components/ui/ConfirmSubmitButton";

const ESTADO_INICIAL: ReiniciarPlanillaTotalState = { ok: false };

// Version ADMIN de ReiniciarPlanillaBoton -- borra el mes COMPLETO
// aunque ya haya boletas/ordenes de servicio emitidas (bloqueado solo si
// algo irreversible ya paso en el mundo real, ver
// reiniciarPlanillaMensualTotalAction). Solo visible para quien tiene
// permiso ADMIN sobre RRHH_PLANILLA, no ESCRITURA.
export default function ReiniciarPlanillaTotalBoton({ idPlanillaMensual }: { idPlanillaMensual: number }) {
  const [estado, formAction] = useActionState(reiniciarPlanillaMensualTotalAction, ESTADO_INICIAL);

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="idPlanillaMensual" value={idPlanillaMensual} />
        <ConfirmSubmitButton
          mensaje="¿Reiniciar TODA la planilla de este mes, incluyendo los colaboradores YA EMITIDOS (boletas y órdenes de servicio)? Se borra todo para volver a generarla desde cero. No se puede deshacer."
          pendingText="Reiniciando..."
          className="rounded-lg border border-red-400 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
        >
          Reiniciar TODO el mes (admin)
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
