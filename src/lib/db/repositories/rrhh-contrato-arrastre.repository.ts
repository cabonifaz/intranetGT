import { callProcedure } from "../callProcedure";
import type { ArrastrePendienteRow } from "@/types/db";

export async function listarArrastresPendientes(idContrato: number): Promise<ArrastrePendienteRow[]> {
  return callProcedure<ArrastrePendienteRow>("SP_RRHH_CONTRATO_ARRASTRE_LISTAR", [idContrato]);
}

export async function eliminarArrastre(idArrastre: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_ARRASTRE_ELIMINAR", [idArrastre]);
}
