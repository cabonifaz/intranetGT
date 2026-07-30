import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { UsuarioListadoRow, UsuarioLoginRow, UsuarioPerfilRow, UsuarioRolActivoRow } from "@/types/db";

const MAX_INTENTOS_FALLIDOS = 5;

export async function obtenerUsuarioParaLogin(usuario: string): Promise<UsuarioLoginRow | null> {
  const rows = await callProcedure<UsuarioLoginRow>("SP_USUARIO_OBTENER_PARA_LOGIN", [usuario]);
  return rows[0] ?? null;
}

export async function registrarLoginExitoso(idUsuario: number): Promise<void> {
  await callProcedure("SP_USUARIO_REGISTRAR_LOGIN_EXITOSO", [idUsuario]);
}

export async function registrarLoginFallido(idUsuario: number): Promise<void> {
  await callProcedure("SP_USUARIO_REGISTRAR_LOGIN_FALLIDO", [idUsuario, MAX_INTENTOS_FALLIDOS]);
}

export async function obtenerPerfilUsuario(idUsuario: number): Promise<UsuarioPerfilRow | null> {
  const rows = await callProcedure<UsuarioPerfilRow>("SP_USUARIO_OBTENER_PERFIL", [idUsuario]);
  return rows[0] ?? null;
}

export async function listarUsuarios(soloActivos = false): Promise<UsuarioListadoRow[]> {
  return callProcedure<UsuarioListadoRow>("SP_USUARIO_LISTAR", [soloActivos ? 1 : 0]);
}

interface CrearUsuarioParams {
  correo: string;
  claveHash: string;
  nombres: string;
  apellidos: string;
  idUsuarioCreacion: number;
}

// El login (USUARIO) se autogenera en SP_USUARIO_CREAR como "nombre.apellido"
// -- no se recibe aqui, ver comentario del SP en db/procedures/sp_usuario.sql.
export async function crearUsuario(
  params: CrearUsuarioParams,
): Promise<{ id_usuario_nuevo: number; usuario_generado: string }> {
  const resultado = await callProcedureWithOut<{ id_usuario_nuevo: number | null; usuario_generado: string | null }>(
    "SP_USUARIO_CREAR",
    [null, params.correo, params.claveHash, params.nombres, params.apellidos, params.idUsuarioCreacion],
    ["id_usuario_nuevo", "usuario_generado"],
  );
  if (!resultado.id_usuario_nuevo) throw new Error(`Ya existe un usuario con el correo "${params.correo}".`);
  return resultado as { id_usuario_nuevo: number; usuario_generado: string };
}

export async function asignarRolAUsuario(idUsuario: number, idRol: number, esPrincipal: boolean): Promise<void> {
  await callProcedure("SP_USUARIO_ROL_ASIGNAR", [idUsuario, idRol, esPrincipal ? 1 : 0]);
}

export async function revocarRolDeUsuario(idUsuario: number, idRol: number): Promise<void> {
  await callProcedure("SP_USUARIO_ROL_REVOCAR", [idUsuario, idRol]);
}

export async function listarRolesActivosDeUsuarios(): Promise<UsuarioRolActivoRow[]> {
  return callProcedure<UsuarioRolActivoRow>("SP_USUARIO_ROL_LISTAR_ACTIVOS", []);
}

export async function listarRolesActivosDeUsuario(idUsuario: number): Promise<UsuarioRolActivoRow[]> {
  return callProcedure<UsuarioRolActivoRow>("SP_USUARIO_ROL_LISTAR_ACTIVOS_POR_USUARIO", [idUsuario]);
}

export async function resetearClaveUsuario(idUsuario: number, claveHash: string): Promise<void> {
  await callProcedure("SP_USUARIO_RESETEAR_CLAVE", [idUsuario, claveHash]);
}
