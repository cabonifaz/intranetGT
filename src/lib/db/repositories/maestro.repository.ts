import type { RowDataPacket } from "mysql2/promise";
import { callProcedure, callProcedureWithOut } from "../callProcedure";

export interface MaestroRow extends RowDataPacket {
  ID_MAESTRO: number;
  TIPO_MAESTRO: string;
  ID_PADRE: number | null;
  CODIGO: string;
  DESCRIPCION: string;
  ORDEN: number;
  METADATA: unknown;
  ID_ESTADO: number;
  ESTADO_CODIGO: string;
}

export async function listarMaestros(tipoMaestro: string, soloActivos = true): Promise<MaestroRow[]> {
  return callProcedure<MaestroRow>("SP_MAESTRO_LISTAR", [tipoMaestro, soloActivos ? 1 : 0]);
}

export async function listarMaestrosHijos(tipoMaestro: string, idPadre: number): Promise<MaestroRow[]> {
  return callProcedure<MaestroRow>("SP_MAESTRO_LISTAR_HIJOS", [tipoMaestro, idPadre]);
}

interface CrearMaestroParams {
  tipoMaestro: string;
  codigo: string;
  descripcion: string;
  orden: number;
  idPadre: number | null;
  idUsuarioCreacion: number;
}

export async function crearMaestro(params: CrearMaestroParams): Promise<{ id_maestro: number }> {
  const resultado = await callProcedureWithOut<{ id_maestro: number | null }>(
    "SP_MAESTRO_CREAR",
    [params.tipoMaestro, params.codigo, params.descripcion, params.orden, params.idPadre, null, params.idUsuarioCreacion],
    ["id_maestro"],
  );
  if (!resultado.id_maestro) throw new Error(`Ya existe un valor "${params.codigo}" para ${params.tipoMaestro}.`);
  return resultado as { id_maestro: number };
}
