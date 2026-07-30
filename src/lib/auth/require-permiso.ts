import { redirect } from "next/navigation";
import { requireSession } from "./get-current-user";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { listarRolesActivosDeUsuario } from "@/lib/db/repositories/usuario.repository";
import { tienePermiso, type NivelPermiso } from "@/lib/rbac/permissions";
import type { SesionUsuario } from "@/types/auth";

export async function requirePermiso(codigoAplicacion: string, nivelMinimo: NivelPermiso): Promise<SesionUsuario> {
  const sesion = await requireSession();
  const permisos = await obtenerPermisosUsuario(sesion.idUsuario);
  if (!tienePermiso(permisos, codigoAplicacion, nivelMinimo)) {
    redirect("/");
  }
  return sesion;
}

// El rol SUPER_ADMIN (no solo nivel ADMIN sobre una app puntual) -- para
// acciones reservadas al equipo de plataforma, ej. subir el logo de una
// plantilla de contrato (branding), que ni siquiera el gerente de RRHH
// con ADMIN sobre RRHH_CONTRATOS deberia poder cambiar por su cuenta.
export async function esSuperAdmin(idUsuario: number): Promise<boolean> {
  const roles = await listarRolesActivosDeUsuario(idUsuario);
  return roles.some((r) => r.ROL_CODIGO === "SUPER_ADMIN");
}

export async function requireSuperAdmin(): Promise<SesionUsuario> {
  const sesion = await requireSession();
  if (!(await esSuperAdmin(sesion.idUsuario))) {
    redirect("/");
  }
  return sesion;
}
