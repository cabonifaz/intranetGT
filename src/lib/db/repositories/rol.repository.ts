import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { RolPorAreaRow, RolRow } from "@/types/db";

export async function listarRoles(soloActivos = true): Promise<RolRow[]> {
  return callProcedure<RolRow>("SP_ROL_LISTAR", [soloActivos ? 1 : 0]);
}

export async function listarRolesPorArea(idArea: number): Promise<RolPorAreaRow[]> {
  return callProcedure<RolPorAreaRow>("SP_ROL_LISTAR_POR_AREA", [idArea]);
}

export async function crearRol(
  idArea: number,
  codigo: string,
  nombre: string,
  nivelJerarquico: number,
): Promise<{ id_rol: number }> {
  const resultado = await callProcedureWithOut<{ id_rol: number | null }>(
    "SP_ROL_CREAR",
    [idArea, codigo, nombre, nivelJerarquico],
    ["id_rol"],
  );
  if (!resultado.id_rol) throw new Error(`Ya existe un rol con el codigo "${codigo}" en esa area.`);
  return resultado as { id_rol: number };
}
