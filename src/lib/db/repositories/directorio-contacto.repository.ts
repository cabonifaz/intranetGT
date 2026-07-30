import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { DirectorioContactoRow, DirectorioContactoConTipoRow, DirectorioContactoDetalleRow } from "@/types/db";

interface CrearContactoExternoParams {
  idTipoRelacion: number;
  idCliente: number | null;
  idProveedor: number | null;
  empresaExterna: string | null;
  nombres: string;
  apellidos: string;
  area: string | null;
  cargo: string | null;
  temaInteres: string | null;
  relacionGt: string | null;
  telefono: string | null;
  correo: string | null;
  idUsuarioCreacion: number;
}

export async function crearContactoExterno(params: CrearContactoExternoParams): Promise<{ id_contacto: number }> {
  return callProcedureWithOut<{ id_contacto: number }>(
    "SP_DIRECTORIO_CONTACTO_CREAR",
    [
      params.idTipoRelacion,
      params.idCliente,
      params.idProveedor,
      params.empresaExterna,
      params.nombres,
      params.apellidos,
      params.area,
      params.cargo,
      params.temaInteres,
      params.relacionGt,
      params.telefono,
      params.correo,
      params.idUsuarioCreacion,
    ],
    ["id_contacto"],
  );
}

export async function listarContactosPorCliente(idCliente: number): Promise<DirectorioContactoRow[]> {
  return callProcedure<DirectorioContactoRow>("SP_DIRECTORIO_CONTACTO_LISTAR_POR_CLIENTE", [idCliente]);
}

export async function listarContactosPorProveedor(idProveedor: number): Promise<DirectorioContactoRow[]> {
  return callProcedure<DirectorioContactoRow>("SP_DIRECTORIO_CONTACTO_LISTAR_POR_PROVEEDOR", [idProveedor]);
}

export async function listarTodosLosContactosExternos(
  busqueda: string | null = null,
  idTipoRelacion: number | null = null,
): Promise<DirectorioContactoConTipoRow[]> {
  return callProcedure<DirectorioContactoConTipoRow>("SP_DIRECTORIO_CONTACTO_LISTAR_TODOS", [busqueda, idTipoRelacion]);
}

export async function obtenerContactoExterno(idContacto: number): Promise<DirectorioContactoDetalleRow | null> {
  const rows = await callProcedure<DirectorioContactoDetalleRow>("SP_DIRECTORIO_CONTACTO_OBTENER", [idContacto]);
  return rows[0] ?? null;
}

interface ActualizarContactoExternoParams {
  idContacto: number;
  nombres: string;
  apellidos: string;
  area: string | null;
  cargo: string | null;
  temaInteres: string | null;
  relacionGt: string | null;
  telefono: string | null;
  correo: string | null;
  idUsuarioModificacion: number;
}

export async function actualizarContactoExterno(params: ActualizarContactoExternoParams): Promise<void> {
  await callProcedure("SP_DIRECTORIO_CONTACTO_ACTUALIZAR", [
    params.idContacto,
    params.nombres,
    params.apellidos,
    params.area,
    params.cargo,
    params.temaInteres,
    params.relacionGt,
    params.telefono,
    params.correo,
    params.idUsuarioModificacion,
  ]);
}

export async function cambiarEstadoContactoExterno(idContacto: number, activo: boolean, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_DIRECTORIO_CONTACTO_CAMBIAR_ESTADO", [idContacto, activo ? 1 : 0, idUsuarioModificacion]);
}
