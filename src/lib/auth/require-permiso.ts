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

// Cierre de proyecto: decision de negocio reservada a SUPER_ADMIN o al
// rol GERENCIA_GENERAL (Gerente General/CEO) -- a diferencia del resto
// de acciones ADMIN sobre PROYECTOS_EMPRESA (reset de costeo, anular),
// no basta con tener el permiso ADMIN otorgado sobre esa app puntual.
export async function puedeCerrarProyecto(idUsuario: number): Promise<boolean> {
  const roles = await listarRolesActivosDeUsuario(idUsuario);
  return roles.some((r) => r.ROL_CODIGO === "SUPER_ADMIN" || r.ROL_CODIGO === "GERENCIA_GENERAL");
}

export async function requireCierreProyecto(): Promise<SesionUsuario> {
  const sesion = await requireSession();
  if (!(await puedeCerrarProyecto(sesion.idUsuario))) {
    redirect("/");
  }
  return sesion;
}

// Importar un contrato ya firmado (subir la solicitud escaneada, saltando
// generacion+firma digital) es una puerta de atras al flujo normal -- solo
// para SUPER_ADMIN ("el Administrador"), GERENCIA_GENERAL ("el Gerente") o
// RRHH_JEFATURA ("Gerente/Jefatura de RRHH"), nunca solo por tener ADMIN
// sobre RRHH_CONTRATOS.
export async function puedeImportarContrato(idUsuario: number): Promise<boolean> {
  const roles = await listarRolesActivosDeUsuario(idUsuario);
  return roles.some((r) => r.ROL_CODIGO === "SUPER_ADMIN" || r.ROL_CODIGO === "GERENCIA_GENERAL" || r.ROL_CODIGO === "RRHH_JEFATURA");
}

export async function requireImportarContrato(): Promise<SesionUsuario> {
  const sesion = await requireSession();
  if (!(await puedeImportarContrato(sesion.idUsuario))) {
    redirect("/");
  }
  return sesion;
}
