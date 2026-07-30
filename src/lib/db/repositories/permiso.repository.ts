import { callProcedure } from "../callProcedure";
import type { PermisoUsuarioRow, RolAplicacionPermisoRow } from "@/types/db";

export async function listarPermisosPorRol(idRol: number): Promise<RolAplicacionPermisoRow[]> {
  return callProcedure<RolAplicacionPermisoRow>("SP_ROL_APLICACION_PERMISO_LISTAR", [idRol]);
}

export async function asignarPermiso(idRol: number, idAplicacion: number, idNivelPermiso: number): Promise<void> {
  await callProcedure("SP_ROL_APLICACION_PERMISO_ASIGNAR", [idRol, idAplicacion, idNivelPermiso]);
}

export async function obtenerPermisosUsuario(idUsuario: number): Promise<PermisoUsuarioRow[]> {
  return callProcedure<PermisoUsuarioRow>("SP_USUARIO_OBTENER_PERMISOS", [idUsuario]);
}
