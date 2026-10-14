import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { ProyectoConformidadRow, ProyectoConformidadMatrizRow, ProyectoConformidadItemRow } from "@/types/db";

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

export async function obtenerConformidadPorToken(token: string): Promise<ProyectoConformidadRow | null> {
  const rows = await callProcedure<ProyectoConformidadRow>("SP_PROYECTO_CONFORMIDAD_OBTENER_POR_TOKEN", [token]);
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

export async function generarLinkConformidad(idConformidad: number, token: string, tokenExpira: Date): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_GENERAR_LINK", [idConformidad, token, tokenExpira]);
}

export async function registrarFirmaConformidad(
  idConformidad: number,
  documentoFirmadoPath: string,
  firmaPngPath: string | null,
  idUsuario: number | null,
): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_REGISTRAR_FIRMA", [idConformidad, documentoFirmadoPath, firmaPngPath, idUsuario]);
}

export async function anularConformidad(idConformidad: number, motivo: string, idUsuario: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_ANULAR", [idConformidad, motivo, idUsuario]);
}

export async function eliminarConformidad(idConformidad: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CONFORMIDAD_ELIMINAR", [idConformidad]);
}
