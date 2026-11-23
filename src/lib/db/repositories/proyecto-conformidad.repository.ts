import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  ProyectoConformidadRow,
  ProyectoConformidadMatrizRow,
  ProyectoConformidadItemRow,
  ProyectoConformidadFirmanteRow,
  ProyectoConformidadFirmanteDetalleRow,
  ProyectoConformidadFirmantePublicoRow,
} from "@/types/db";

export async function crearConformidad(idHito: number, titulo: string, idUsuarioCreacion: number): Promise<{ id_conformidad: number }> {
  return callProcedureWithOut<{ id_conformidad: number }>(
    "SP_PROYECTO_CONFORMIDAD_CREAR",
    [idHito, titulo, idUsuarioCreacion],
    ["id_conformidad"],
  );
}

export async function obtenerConformidad(idConformidad: number): Promise<ProyectoConformidadRow | null> {
  const rows = await callProcedure<ProyectoConformidadRow>("SP_PROYECTO_CONFORMIDAD_OBTENER", [idConformidad]);
  return rows[0] ?? null;
}

export async function obtenerConformidadPorHito(idHito: number): Promise<ProyectoConformidadRow | null> {
  const rows = await callProcedure<ProyectoConformidadRow>("SP_PROYECTO_CONFORMIDAD_OBTENER_POR_HITO", [idHito]);
  return rows[0] ?? null;
}

export async function listarConformidadesProyecto(idProyecto: number): Promise<ProyectoConformidadMatrizRow[]> {
  return callProcedure<ProyectoConformidadMatrizRow>("SP_PROYECTO_CONFORMIDAD_LISTAR_POR_PROYECTO", [idProyecto]);
}

export async function agregarItemConformidad(idConformidad: number, descripcion: string, orden: number): Promise<{ id_item: number | null }> {
  return callProcedureWithOut<{ id_item: number | null }>(
    "SP_PROYECTO_CONFORMIDAD_ITEM_AGREGAR",
    [idConformidad, descripcion, orden],
    ["id_item"],
  );
}

export async function listarItemsConformidad(idConformidad: number): Promise<ProyectoConformidadItemRow[]> {
  return callProcedure<ProyectoConformidadItemRow>("SP_PROYECTO_CONFORMIDAD_ITEM_LISTAR", [idConformidad]);
}

export async function actualizarItemConformidad(idItem: number, descripcion: string): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_ITEM_ACTUALIZAR", [idItem, descripcion]);
}

export async function eliminarItemConformidad(idItem: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_ITEM_ELIMINAR", [idItem]);
}

export async function emitirConformidad(idConformidad: number, documentoPath: string): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_EMITIR", [idConformidad, documentoPath]);
}

export async function reabrirConformidad(idConformidad: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_REABRIR", [idConformidad]);
}

export async function anularConformidad(idConformidad: number, motivo: string, idUsuario: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_ANULAR", [idConformidad, motivo, idUsuario]);
}

export async function eliminarConformidad(idConformidad: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_ELIMINAR", [idConformidad]);
}

// --- Firmantes (N por conformidad -- ver 054_proyecto_conformidad_firmante.sql) ---

export async function agregarFirmanteConformidad(
  idConformidad: number,
  nombre: string,
  cargo: string | null,
  idUsuarioCreacion: number,
): Promise<{ id_firmante: number | null }> {
  return callProcedureWithOut<{ id_firmante: number | null }>(
    "SP_PROYECTO_CONFORMIDAD_FIRMANTE_AGREGAR",
    [idConformidad, nombre, cargo, idUsuarioCreacion],
    ["id_firmante"],
  );
}

export async function obtenerFirmanteConformidad(idFirmante: number): Promise<ProyectoConformidadFirmanteDetalleRow | null> {
  const rows = await callProcedure<ProyectoConformidadFirmanteDetalleRow>("SP_PROYECTO_CONFORMIDAD_FIRMANTE_OBTENER", [idFirmante]);
  return rows[0] ?? null;
}

export async function listarFirmantesConformidad(idConformidad: number): Promise<ProyectoConformidadFirmanteRow[]> {
  return callProcedure<ProyectoConformidadFirmanteRow>("SP_PROYECTO_CONFORMIDAD_FIRMANTE_LISTAR", [idConformidad]);
}

export async function actualizarFirmanteConformidad(idFirmante: number, nombre: string, cargo: string | null): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_FIRMANTE_ACTUALIZAR", [idFirmante, nombre, cargo]);
}

export async function eliminarFirmanteConformidad(idFirmante: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_FIRMANTE_ELIMINAR", [idFirmante]);
}

export async function generarLinkFirmanteConformidad(idFirmante: number, token: string, tokenExpira: Date): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_FIRMANTE_GENERAR_LINK", [idFirmante, token, tokenExpira]);
}

export async function obtenerFirmanteConformidadPorToken(token: string): Promise<ProyectoConformidadFirmantePublicoRow | null> {
  const rows = await callProcedure<ProyectoConformidadFirmantePublicoRow>("SP_PROYECTO_CONFORMIDAD_FIRMANTE_OBTENER_POR_TOKEN", [token]);
  return rows[0] ?? null;
}

export async function registrarFirmaFirmanteConformidad(
  idFirmante: number,
  firmaPngPath: string | null,
  documentoFirmadoIndividualPath: string | null,
  idUsuario: number | null,
): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_FIRMANTE_REGISTRAR_FIRMA", [
    idFirmante,
    firmaPngPath,
    documentoFirmadoIndividualPath,
    idUsuario,
  ]);
}

// Recalcula si la conformidad ya quedo completa (todos sus firmantes
// firmaron) y, si corresponde, pasa a FIRMADA -- ver comentario del SP.
// Se llama despues de registrar una firma (con el PDF combinado recien
// regenerado) y despues de eliminar un firmante pendiente (con
// documentoFirmadoPath=null, no toca el documento ya guardado).
export async function recalcularEstadoConformidad(idConformidad: number, documentoFirmadoPath: string | null): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_RECALCULAR_ESTADO", [idConformidad, documentoFirmadoPath]);
}
