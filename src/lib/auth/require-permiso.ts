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
// para SUPER_ADMIN ("el Administrador"), GERENCIA_GENERAL ("el Gerente"),
// RRHH_JEFATURA ("Gerente/Jefatura de RRHH") o ADMINISTRACION_JEFATURA
// ("Jefatura de Administracion"), nunca solo por tener ADMIN sobre
// RRHH_CONTRATOS. Un solo gate para todo el flujo (subir, confirmar y
// aprobar automaticamente al confirmar, deshacer la carga) -- decision
// de negocio del 2026-09-29, mismo criterio que las demas ampliaciones a
// ADMINISTRACION_JEFATURA en Contratos/Planilla.
export async function puedeImportarContrato(idUsuario: number): Promise<boolean> {
  const roles = await listarRolesActivosDeUsuario(idUsuario);
  return roles.some((r) =>
    ["SUPER_ADMIN", "GERENCIA_GENERAL", "RRHH_JEFATURA", "ADMINISTRACION_JEFATURA"].includes(r.ROL_CODIGO),
  );
}

export async function requireImportarContrato(): Promise<SesionUsuario> {
  const sesion = await requireSession();
  if (!(await puedeImportarContrato(sesion.idUsuario))) {
    redirect("/");
  }
  return sesion;
}

// Gestionar prestamos/adelantos (crear directo, otorgar una solicitud,
// solicitar en nombre de un trabajador o contacto, editar/anular) -- no
// es el permiso generico ESCRITURA sobre RRHH_PLANILLA (eso tambien
// cubriria generar la planilla mensual y sus parametros, que es otro
// alcance), sino estos 4 roles puntuales. SUPER_ADMIN ya puede todo;
// GERENCIA_GENERAL, RRHH_JEFATURA y ADMINISTRACION_JEFATURA pueden
// gestionar prestamos aunque no tengan ESCRITURA sobre el resto de
// Planilla.
export async function puedeGestionarPrestamos(idUsuario: number): Promise<boolean> {
  const roles = await listarRolesActivosDeUsuario(idUsuario);
  return roles.some((r) =>
    ["SUPER_ADMIN", "GERENCIA_GENERAL", "RRHH_JEFATURA", "ADMINISTRACION_JEFATURA"].includes(r.ROL_CODIGO),
  );
}

export async function requireGestionarPrestamos(): Promise<SesionUsuario> {
  const sesion = await requireSession();
  if (!(await puedeGestionarPrestamos(sesion.idUsuario))) {
    redirect("/");
  }
  return sesion;
}

// Tareas operativas de un prestamo ya otorgado -- subir/enviar el link del
// compromiso firmado, agregar o ajustar una cuota, marcar pagada una cuota
// de un contacto -- no son la decision de aprobar/anular/eliminar el
// prestamo, asi que ademas de los 4 roles de puedeGestionarPrestamos
// tambien las puede hacer quien tenga ESCRITURA sobre RRHH_PLANILLA (ej.
// RRHH_ASISTENTE, ADMINISTRACION_ASISTENTE).
export async function puedeOperarPrestamos(idUsuario: number): Promise<boolean> {
  if (await puedeGestionarPrestamos(idUsuario)) return true;
  const permisos = await obtenerPermisosUsuario(idUsuario);
  return tienePermiso(permisos, "RRHH_PLANILLA", "ESCRITURA");
}

export async function requireOperarPrestamos(): Promise<SesionUsuario> {
  const sesion = await requireSession();
  if (!(await puedeOperarPrestamos(sesion.idUsuario))) {
    redirect("/");
  }
  return sesion;
}

// Resumen gerencial en la ficha del directorio (prestamos/adelantos
// activos, contratos, alerta de vencimiento) -- informacion sensible que
// no todo el que tenga acceso al Directorio deberia ver, solo Gerencia
// General, el Administrador (SUPER_ADMIN) o la Jefatura de Administracion.
export async function puedeVerResumenGerencialFicha(idUsuario: number): Promise<boolean> {
  const roles = await listarRolesActivosDeUsuario(idUsuario);
  return roles.some((r) => r.ROL_CODIGO === "SUPER_ADMIN" || r.ROL_CODIGO === "GERENCIA_GENERAL" || r.ROL_CODIGO === "ADMINISTRACION_JEFATURA");
}
