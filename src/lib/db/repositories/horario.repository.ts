import type { HorarioEfectivoRow } from "@/types/db";
import { callProcedure } from "../callProcedure";

export async function obtenerHorarioEfectivo(idUsuario: number, fecha: Date): Promise<HorarioEfectivoRow | null> {
  const fechaSql = fecha.toISOString().slice(0, 10);
  const rows = await callProcedure<HorarioEfectivoRow>("SP_HORARIO_OBTENER_EFECTIVO", [idUsuario, fechaSql]);
  return rows[0] ?? null;
}
