import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  PlantillaClausulaRow,
  PlantillaContratoActivaRow,
  PlantillaContratoDetalleRow,
  PlantillaContratoListadoRow,
} from "@/types/db";

interface CrearPlantillaParams {
  idTipoContrato: number;
  idTipoPagoLocador: number | null;
  nombre: string;
  tituloDocumento: string;
  parrafoIntro: string;
  idUsuarioCreacion: number;
}

export async function crearPlantilla(params: CrearPlantillaParams): Promise<{ id_plantilla: number }> {
  return callProcedureWithOut<{ id_plantilla: number }>(
    "SP_RRHH_PLANTILLA_CREAR",
    [
      params.idTipoContrato,
      params.idTipoPagoLocador,
      params.nombre,
      params.tituloDocumento,
      params.parrafoIntro,
      params.idUsuarioCreacion,
    ],
    ["id_plantilla"],
  );
}

interface ActualizarPlantillaParams {
  idPlantilla: number;
  nombre: string;
  tituloDocumento: string;
  parrafoIntro: string;
  idUsuarioModificacion: number;
}

export async function actualizarPlantilla(params: ActualizarPlantillaParams): Promise<void> {
  await callProcedure("SP_RRHH_PLANTILLA_ACTUALIZAR", [
    params.idPlantilla,
    params.nombre,
    params.tituloDocumento,
    params.parrafoIntro,
    params.idUsuarioModificacion,
  ]);
}

export async function listarPlantillas(): Promise<PlantillaContratoListadoRow[]> {
  return callProcedure<PlantillaContratoListadoRow>("SP_RRHH_PLANTILLA_LISTAR", []);
}

export async function obtenerPlantilla(idPlantilla: number): Promise<PlantillaContratoDetalleRow | null> {
  const rows = await callProcedure<PlantillaContratoDetalleRow>("SP_RRHH_PLANTILLA_OBTENER", [idPlantilla]);
  return rows[0] ?? null;
}

export async function obtenerPlantillaActiva(
  idTipoContrato: number,
  idTipoPagoLocador: number | null,
): Promise<PlantillaContratoActivaRow | null> {
  const rows = await callProcedure<PlantillaContratoActivaRow>("SP_RRHH_PLANTILLA_OBTENER_ACTIVA", [
    idTipoContrato,
    idTipoPagoLocador,
  ]);
  return rows[0] ?? null;
}

export async function cambiarEstadoPlantilla(idPlantilla: number, activo: boolean, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANTILLA_CAMBIAR_ESTADO", [idPlantilla, activo ? 1 : 0, idUsuarioModificacion]);
}

export async function agregarClausulaPlantilla(
  idPlantilla: number,
  orden: number,
  titulo: string | null,
  contenido: string,
  idUsuarioCreacion: number,
): Promise<{ id_clausula: number }> {
  return callProcedureWithOut<{ id_clausula: number }>(
    "SP_RRHH_PLANTILLA_CLAUSULA_AGREGAR",
    [idPlantilla, orden, titulo, contenido, idUsuarioCreacion],
    ["id_clausula"],
  );
}

export async function listarClausulasPlantilla(idPlantilla: number): Promise<PlantillaClausulaRow[]> {
  return callProcedure<PlantillaClausulaRow>("SP_RRHH_PLANTILLA_CLAUSULA_LISTAR", [idPlantilla]);
}

export async function actualizarClausulaPlantilla(
  idClausula: number,
  orden: number,
  titulo: string | null,
  contenido: string,
): Promise<void> {
  await callProcedure("SP_RRHH_PLANTILLA_CLAUSULA_ACTUALIZAR", [idClausula, orden, titulo, contenido]);
}

export async function eliminarClausulaPlantilla(idClausula: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANTILLA_CLAUSULA_ELIMINAR", [idClausula]);
}
