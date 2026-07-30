import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { AreaRow } from "@/types/db";

export async function listarAreas(soloActivos = true): Promise<AreaRow[]> {
  return callProcedure<AreaRow>("SP_AREA_LISTAR", [soloActivos ? 1 : 0]);
}

export async function crearArea(codigo: string, nombre: string, orden: number): Promise<{ id_area: number }> {
  const resultado = await callProcedureWithOut<{ id_area: number | null }>("SP_AREA_CREAR", [codigo, nombre, orden], ["id_area"]);
  if (!resultado.id_area) throw new Error(`Ya existe un area con el codigo "${codigo}".`);
  return resultado as { id_area: number };
}
