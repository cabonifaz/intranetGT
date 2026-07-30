import { callProcedure } from "../callProcedure";
import type { EmpleadoDetalleRow, EmpleadoDirectorioRow } from "@/types/db";

export async function listarDirectorio(idArea: number | null, busqueda: string | null): Promise<EmpleadoDirectorioRow[]> {
  return callProcedure<EmpleadoDirectorioRow>("SP_RRHH_EMPLEADO_LISTAR", [idArea, busqueda]);
}

export async function obtenerEmpleado(idUsuario: number): Promise<EmpleadoDetalleRow | null> {
  const rows = await callProcedure<EmpleadoDetalleRow>("SP_RRHH_EMPLEADO_OBTENER", [idUsuario]);
  return rows[0] ?? null;
}

interface UpsertEmpleadoParams {
  idUsuario: number;
  telefono: string | null;
  extension: string | null;
  fotoUrl: string | null;
  idTipoDocumento: number | null;
  nroDocumento: string | null;
  direccion: string | null;
  idPais: number | null;
  idCiudad: number | null;
  correoClockify: string | null;
  idUsuarioModificacion: number;
}

export async function upsertEmpleado(params: UpsertEmpleadoParams): Promise<void> {
  await callProcedure("SP_RRHH_EMPLEADO_UPSERT", [
    params.idUsuario,
    params.telefono,
    params.extension,
    params.fotoUrl,
    params.idTipoDocumento,
    params.nroDocumento,
    params.direccion,
    params.idPais,
    params.idCiudad,
    params.correoClockify,
    params.idUsuarioModificacion,
  ]);
}
