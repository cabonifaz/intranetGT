import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { AplicacionRow, AplicacionVisibleRow } from "@/types/db";

export async function listarAplicaciones(soloActivos = true): Promise<AplicacionRow[]> {
  return callProcedure<AplicacionRow>("SP_APLICACION_LISTAR", [soloActivos ? 1 : 0]);
}

export async function listarAplicacionesVisibles(idUsuario: number): Promise<AplicacionVisibleRow[]> {
  return callProcedure<AplicacionVisibleRow>("SP_APLICACION_LISTAR_VISIBLES", [idUsuario]);
}

interface CrearAplicacionParams {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  idTipoAplicacion: number;
  rutaInterna: string | null;
  urlExterna: string | null;
  idAreaPropietaria: number;
  requiereSso: boolean;
}

export async function crearAplicacion(params: CrearAplicacionParams): Promise<{ id_aplicacion: number }> {
  const resultado = await callProcedureWithOut<{ id_aplicacion: number | null }>(
    "SP_APLICACION_CREAR",
    [
      params.codigo,
      params.nombre,
      params.descripcion,
      params.icono,
      params.idTipoAplicacion,
      params.rutaInterna,
      params.urlExterna,
      params.idAreaPropietaria,
      params.requiereSso ? 1 : 0,
    ],
    ["id_aplicacion"],
  );
  if (!resultado.id_aplicacion) throw new Error(`Ya existe una aplicacion con el codigo "${params.codigo}".`);
  return resultado as { id_aplicacion: number };
}
