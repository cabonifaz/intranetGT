import type { PermisoUsuarioRow } from "@/types/db";

// Debe coincidir con el ORDEN sembrado en db/seed/002_catalogos_rbac_notificaciones.sql
export const NIVEL_PERMISO_ORDEN = {
  SIN_ACCESO: 0,
  LECTURA: 1,
  ESCRITURA: 2,
  ADMIN: 3,
} as const;

export type NivelPermiso = keyof typeof NIVEL_PERMISO_ORDEN;

export function tienePermiso(
  permisos: PermisoUsuarioRow[],
  codigoAplicacion: string,
  nivelMinimo: NivelPermiso,
): boolean {
  const permiso = permisos.find((p) => p.APLICACION_CODIGO === codigoAplicacion);
  if (!permiso) return false;
  return permiso.NIVEL_PERMISO_ORDEN >= NIVEL_PERMISO_ORDEN[nivelMinimo];
}
