import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { NotificacionRow } from "@/types/db";

export async function listarNotificacionesPorUsuario(
  idUsuario: number,
  soloNoLeidas = false,
  limite = 20,
  offset = 0,
): Promise<NotificacionRow[]> {
  return callProcedure<NotificacionRow>("SP_NOTIFICACION_LISTAR_POR_USUARIO", [
    idUsuario,
    soloNoLeidas ? 1 : 0,
    limite,
    offset,
  ]);
}

export async function contarNotificacionesNoLeidas(idUsuario: number): Promise<number> {
  const rows = await callProcedure<NotificacionRow & { TOTAL: number }>("SP_NOTIFICACION_CONTAR_NO_LEIDAS", [
    idUsuario,
  ]);
  return rows[0]?.TOTAL ?? 0;
}

export async function marcarNotificacionLeida(idNotificacionUsuario: number, idUsuario: number): Promise<void> {
  await callProcedure("SP_NOTIFICACION_MARCAR_LEIDA", [idNotificacionUsuario, idUsuario]);
}

export async function marcarTodasLasNotificacionesLeidas(idUsuario: number): Promise<void> {
  await callProcedure("SP_NOTIFICACION_MARCAR_TODAS_LEIDAS", [idUsuario]);
}

interface Destinatarios {
  usuarios?: number[];
  roles?: number[];
  areas?: number[];
  todos?: boolean;
}

interface CrearNotificacionParams {
  idCategoria: number;
  titulo: string;
  mensaje: string;
  idAplicacionOrigen: number | null;
  urlDestino: string | null;
  idUsuarioEmisor: number | null;
  destinatarios: Destinatarios;
}

export async function crearNotificacion(params: CrearNotificacionParams): Promise<{ id_notificacion: number }> {
  return callProcedureWithOut<{ id_notificacion: number }>(
    "SP_NOTIFICACION_CREAR",
    [
      params.idCategoria,
      params.titulo,
      params.mensaje,
      params.idAplicacionOrigen,
      params.urlDestino,
      params.idUsuarioEmisor,
      JSON.stringify(params.destinatarios),
    ],
    ["id_notificacion"],
  );
}
