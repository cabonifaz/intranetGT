"use server";

import { revalidatePath, refresh } from "next/cache";
import { requirePermiso, requireSuperAdmin } from "@/lib/auth/require-permiso";
import { generarClaveTemporal, hashPassword } from "@/lib/auth/password";
import {
  crearUsuario,
  asignarRolAUsuario,
  revocarRolDeUsuario,
  resetearClaveUsuario,
} from "@/lib/db/repositories/usuario.repository";
import { crearArea } from "@/lib/db/repositories/area.repository";
import { crearRol } from "@/lib/db/repositories/rol.repository";
import { crearAplicacion } from "@/lib/db/repositories/aplicacion.repository";
import { crearMaestro } from "@/lib/db/repositories/maestro.repository";
import { asignarPermiso } from "@/lib/db/repositories/permiso.repository";
import { crearNotificacion } from "@/lib/db/repositories/notificacion.repository";
import { actualizarLogoEmpresa } from "@/lib/db/repositories/configuracion-empresa.repository";
import { guardarArchivo } from "@/lib/storage/local-storage";

const ADMIN_APP_CODIGO = "ADMINISTRACION";

export interface CrearUsuarioState {
  ok: boolean;
  error?: string;
  usuarioGenerado?: string;
  claveTemporal?: string;
}

// La clave nunca la escribe el administrador ni viaja en el request: se
// genera y se hashea aca mismo, en el servidor. Se retorna en texto plano
// una unica vez (dentro de la respuesta de este action, no se persiste en
// ningun lado) para que el admin se la pueda comunicar a la persona.
export async function crearUsuarioAction(
  _prevState: CrearUsuarioState,
  formData: FormData,
): Promise<CrearUsuarioState> {
  const sesion = await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const correo = String(formData.get("correo") ?? "").trim();
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();

  if (!correo || !nombres || !apellidos) {
    return { ok: false, error: "Completa correo, nombres y apellidos." };
  }

  const claveTemporal = generarClaveTemporal();
  const claveHash = await hashPassword(claveTemporal);

  let resultado: Awaited<ReturnType<typeof crearUsuario>>;
  try {
    resultado = await crearUsuario({ correo, claveHash, nombres, apellidos, idUsuarioCreacion: sesion.idUsuario });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el usuario." };
  }

  revalidatePath("/administracion/usuarios");
  refresh();

  return { ok: true, usuarioGenerado: resultado.usuario_generado, claveTemporal };
}

export interface ResetearClaveState {
  ok: boolean;
  error?: string;
  claveTemporal?: string;
}

// Mismo principio que crearUsuarioAction: la clave nueva se genera y
// hashea en el servidor, nunca la escribe el admin. De paso desbloquea
// la cuenta (ver SP_USUARIO_RESETEAR_CLAVE).
export async function resetearClaveAction(
  _prevState: ResetearClaveState,
  formData: FormData,
): Promise<ResetearClaveState> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const idUsuario = Number(formData.get("idUsuario"));
  if (!idUsuario) {
    return { ok: false, error: "Usuario invalido." };
  }

  const claveTemporal = generarClaveTemporal();
  const claveHash = await hashPassword(claveTemporal);

  await resetearClaveUsuario(idUsuario, claveHash);

  revalidatePath("/administracion/usuarios");
  refresh();

  return { ok: true, claveTemporal };
}

export async function asignarRolAction(formData: FormData): Promise<void> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const idUsuario = Number(formData.get("idUsuario"));
  const idRol = Number(formData.get("idRol"));
  const esPrincipal = formData.get("esPrincipal") === "on";

  if (!idUsuario || !idRol) return;

  await asignarRolAUsuario(idUsuario, idRol, esPrincipal);
  revalidatePath("/administracion/usuarios");
  refresh();
}

export async function revocarRolAction(formData: FormData): Promise<void> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const idUsuario = Number(formData.get("idUsuario"));
  const idRol = Number(formData.get("idRol"));

  if (!idUsuario || !idRol) return;

  await revocarRolDeUsuario(idUsuario, idRol);
  revalidatePath("/administracion/usuarios");
  refresh();
}

// Estos 4 actions (area/rol/aplicacion/maestro) usan useActionState en vez
// de un simple `Promise<void>` -- mismo motivo que crearUsuarioAction: un
// codigo duplicado hace que el repositorio lance un Error (ver
// src/lib/db/repositories/*.repository.ts), y sin este estado ese error
// solo se veia en la pantalla de error de Next, sin nada visible en el
// formulario.

export interface CrearAreaState {
  ok: boolean;
  error?: string;
  idArea?: number;
}

export async function crearAreaAction(_prevState: CrearAreaState, formData: FormData): Promise<CrearAreaState> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const orden = Number(formData.get("orden") ?? 0);

  if (!codigo || !nombre) {
    return { ok: false, error: "Completa codigo y nombre." };
  }

  let resultado: Awaited<ReturnType<typeof crearArea>>;
  try {
    resultado = await crearArea(codigo, nombre, orden);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el area." };
  }

  revalidatePath("/administracion/roles");
  revalidatePath("/administracion/aplicaciones");
  refresh();
  return { ok: true, idArea: resultado.id_area };
}

export interface CrearRolState {
  ok: boolean;
  error?: string;
  idRol?: number;
}

export async function crearRolAction(_prevState: CrearRolState, formData: FormData): Promise<CrearRolState> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const idArea = Number(formData.get("idArea"));
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nivelJerarquico = Number(formData.get("nivelJerarquico") ?? 100);

  if (!idArea || !codigo || !nombre) {
    return { ok: false, error: "Completa area, codigo y nombre." };
  }

  let resultado: Awaited<ReturnType<typeof crearRol>>;
  try {
    resultado = await crearRol(idArea, codigo, nombre, nivelJerarquico);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el rol." };
  }

  revalidatePath("/administracion/roles");
  refresh();
  return { ok: true, idRol: resultado.id_rol };
}

export interface CrearAplicacionState {
  ok: boolean;
  error?: string;
  idAplicacion?: number;
}

export async function crearAplicacionAction(
  _prevState: CrearAplicacionState,
  formData: FormData,
): Promise<CrearAplicacionState> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const icono = String(formData.get("icono") ?? "").trim() || null;
  const idTipoAplicacion = Number(formData.get("idTipoAplicacion"));
  const rutaInterna = String(formData.get("rutaInterna") ?? "").trim() || null;
  const urlExterna = String(formData.get("urlExterna") ?? "").trim() || null;
  const idAreaPropietaria = Number(formData.get("idAreaPropietaria"));
  const requiereSso = formData.get("requiereSso") === "on";

  if (!codigo || !nombre || !idTipoAplicacion || !idAreaPropietaria) {
    return { ok: false, error: "Completa codigo, nombre, tipo y area propietaria." };
  }

  let resultado: Awaited<ReturnType<typeof crearAplicacion>>;
  try {
    resultado = await crearAplicacion({
      codigo,
      nombre,
      descripcion,
      icono,
      idTipoAplicacion,
      rutaInterna,
      urlExterna,
      idAreaPropietaria,
      requiereSso,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear la aplicacion." };
  }

  revalidatePath("/administracion/aplicaciones");
  revalidatePath("/administracion/permisos");
  revalidatePath("/");
  refresh();
  return { ok: true, idAplicacion: resultado.id_aplicacion };
}

export interface CrearMaestroState {
  ok: boolean;
  error?: string;
  idMaestro?: number;
}

export async function crearMaestroAction(_prevState: CrearMaestroState, formData: FormData): Promise<CrearMaestroState> {
  const sesion = await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const tipoMaestro = String(formData.get("tipoMaestro") ?? "").trim().toUpperCase();
  const codigo = String(formData.get("codigo") ?? "").trim().toUpperCase();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const orden = Number(formData.get("orden") ?? 0);
  const idPadre = Number(formData.get("idPadre") || 0) || null;

  if (!tipoMaestro || !codigo || !descripcion) {
    return { ok: false, error: "Completa tipo de maestro, codigo y descripcion." };
  }

  let resultado: Awaited<ReturnType<typeof crearMaestro>>;
  try {
    resultado = await crearMaestro({ tipoMaestro, codigo, descripcion, orden, idPadre, idUsuarioCreacion: sesion.idUsuario });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el valor." };
  }

  revalidatePath("/administracion/maestros");
  refresh();
  return { ok: true, idMaestro: resultado.id_maestro };
}

export async function asignarPermisoAction(formData: FormData): Promise<void> {
  await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const idRol = Number(formData.get("idRol"));
  const idAplicacion = Number(formData.get("idAplicacion"));
  const idNivelPermiso = Number(formData.get("idNivelPermiso"));

  if (!idRol || !idAplicacion || !idNivelPermiso) return;

  await asignarPermiso(idRol, idAplicacion, idNivelPermiso);
  revalidatePath("/administracion/permisos");
  revalidatePath("/");
  refresh();
}

export async function enviarNotificacionAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(ADMIN_APP_CODIGO, "ADMIN");

  const idCategoria = Number(formData.get("idCategoria"));
  const titulo = String(formData.get("titulo") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();
  const urlDestino = String(formData.get("urlDestino") ?? "").trim() || null;

  const idUsuarioDestino = Number(formData.get("idUsuarioDestino") || 0);
  const idRolDestino = Number(formData.get("idRolDestino") || 0);
  const idAreaDestino = Number(formData.get("idAreaDestino") || 0);
  const enviarATodos = formData.get("enviarATodos") === "on";

  if (!idCategoria || !titulo || !mensaje) return;
  if (!idUsuarioDestino && !idRolDestino && !idAreaDestino && !enviarATodos) return;

  await crearNotificacion({
    idCategoria,
    titulo,
    mensaje,
    idAplicacionOrigen: null,
    urlDestino,
    idUsuarioEmisor: sesion.idUsuario,
    destinatarios: {
      usuarios: idUsuarioDestino ? [idUsuarioDestino] : undefined,
      roles: idRolDestino ? [idRolDestino] : undefined,
      areas: idAreaDestino ? [idAreaDestino] : undefined,
      todos: enviarATodos || undefined,
    },
  });

  revalidatePath("/administracion/notificaciones");
  refresh();
}

// Solo SUPER_ADMIN (equipo de plataforma), no cualquier ADMIN de un modulo
// puntual: el logo es branding de la empresa, usado en todos los PDFs de
// contrato sin importar la plantilla (ver src/lib/rrhh/resolver-plantilla.ts).
export async function actualizarLogoEmpresaAction(formData: FormData): Promise<void> {
  const sesion = await requireSuperAdmin();

  const archivo = formData.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) return;

  const formato = archivo.type === "image/png" ? "png" : archivo.type === "image/jpeg" ? "jpg" : null;
  if (!formato) return;

  const bytes = new Uint8Array(await archivo.arrayBuffer());
  const rutaRelativa = `empresa/logo.${formato}`;
  await guardarArchivo(rutaRelativa, bytes);
  await actualizarLogoEmpresa(rutaRelativa, formato, sesion.idUsuario);

  revalidatePath("/administracion/empresa");
  refresh();
}
