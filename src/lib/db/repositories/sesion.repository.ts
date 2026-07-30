import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { SesionActivaRow, SesionRow } from "@/types/db";

interface CrearSesionParams {
  idUsuario: number;
  idSesion: string;
  tokenHash: string;
  ip: string | null;
  userAgent: string | null;
}

interface CrearSesionResultado {
  fecha_expiracion: string | null;
}

export async function crearSesion(params: CrearSesionParams): Promise<CrearSesionResultado> {
  return callProcedureWithOut<CrearSesionResultado>(
    "SP_SESION_CREAR",
    [params.idUsuario, params.idSesion, params.tokenHash, params.ip, params.userAgent],
    ["fecha_expiracion"],
  );
}

interface RenovarSesionResultado {
  fecha_expiracion: string | null;
  dentro_horario: number;
}

export async function renovarSesion(idSesion: string): Promise<RenovarSesionResultado> {
  return callProcedureWithOut<RenovarSesionResultado>("SP_SESION_RENOVAR", [idSesion], [
    "fecha_expiracion",
    "dentro_horario",
  ]);
}

export async function obtenerSesionPorTokenHash(tokenHash: string): Promise<SesionRow | null> {
  const rows = await callProcedure<SesionRow>("SP_SESION_OBTENER", [tokenHash]);
  return rows[0] ?? null;
}

export async function cerrarSesion(idSesion: string, motivo: "LOGOUT" | "FORZADO" = "LOGOUT"): Promise<void> {
  await callProcedure("SP_SESION_CERRAR", [idSesion, motivo]);
}

export async function cerrarTodasLasSesionesDelUsuario(idUsuario: number): Promise<void> {
  await callProcedure("SP_SESION_CERRAR_TODAS_USUARIO", [idUsuario]);
}

export async function listarSesionesActivasDelUsuario(idUsuario: number): Promise<SesionActivaRow[]> {
  return callProcedure<SesionActivaRow>("SP_SESION_LISTAR_ACTIVAS_USUARIO", [idUsuario]);
}
