import { redirect } from "next/navigation";
import { getSessionCookieValue } from "./session-cookie";
import { verificarTokenSesion, hashToken } from "./session-token";
import { obtenerSesionPorTokenHash, renovarSesion } from "@/lib/db/repositories/sesion.repository";
import type { SesionUsuario } from "@/types/auth";

/**
 * Validacion autoritativa de la sesion actual: verifica el JWT de la
 * cookie, confirma contra BD que la sesion sigue ACTIVA, y la renueva
 * (aplica la regla de horario laboral / respaldo de 30min de inactividad).
 * No lanza: retorna null si no hay sesion valida.
 */
export async function getCurrentSession(): Promise<SesionUsuario | null> {
  const token = await getSessionCookieValue();
  if (!token) return null;

  const payload = await verificarTokenSesion(token);
  if (!payload) return null;

  const tokenHash = hashToken(token);
  const sesion = await obtenerSesionPorTokenHash(tokenHash);
  if (!sesion) return null;
  if (sesion.ESTADO_SESION_CODIGO !== "ACTIVA") return null;
  if (sesion.ESTADO_USUARIO_CODIGO !== "ACTIVO") return null;
  if (new Date(sesion.FECHA_EXPIRACION).getTime() < Date.now()) return null;

  const renovada = await renovarSesion(sesion.ID_SESION);
  if (!renovada.fecha_expiracion) return null;

  return {
    idSesion: sesion.ID_SESION,
    idUsuario: sesion.ID_USUARIO,
    usuario: sesion.USUARIO,
    nombres: sesion.NOMBRES,
    apellidos: sesion.APELLIDOS,
    dentroHorario: renovada.dentro_horario === 1,
    fechaExpiracion: renovada.fecha_expiracion,
  };
}

export async function requireSession(): Promise<SesionUsuario> {
  const sesion = await getCurrentSession();
  if (!sesion) {
    redirect("/login");
  }
  return sesion;
}
