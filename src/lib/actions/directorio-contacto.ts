"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import type { NivelPermiso } from "@/lib/rbac/permissions";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import {
  crearContactoExterno,
  actualizarContactoExterno,
  cambiarEstadoContactoExterno,
} from "@/lib/db/repositories/directorio-contacto.repository";

// Un contacto se administra bajo el permiso del modulo dueño de su tipo:
// Cliente -> Proyectos, Proveedor -> Compras, Socio comercial/Otro (sin
// modulo dueño) -> el propio Directorio.
async function requirePermisoSegunTipo(tipoRelacionCodigo: string, nivel: NivelPermiso) {
  if (tipoRelacionCodigo === "CLIENTE") return requirePermiso("PROYECTOS_EMPRESA", nivel);
  if (tipoRelacionCodigo === "PROVEEDOR") return requirePermiso("COMPRAS_EMPRESA", nivel);
  return requirePermiso("RRHH_DIRECTORIO", nivel);
}

async function resolverIdTipoRelacion(codigo: string): Promise<number> {
  const tipos = await listarMaestros("TIPO_RELACION_CONTACTO");
  const tipo = tipos.find((t) => t.CODIGO === codigo);
  if (!tipo) throw new Error(`Tipo de relacion desconocido: ${codigo}`);
  return tipo.ID_MAESTRO;
}

export async function crearContactoExternoAction(formData: FormData): Promise<void> {
  const tipoRelacionCodigo = String(formData.get("tipoRelacionCodigo") ?? "").trim();
  if (!tipoRelacionCodigo) return;

  const sesion = await requirePermisoSegunTipo(tipoRelacionCodigo, "ESCRITURA");

  const idCliente = Number(formData.get("idCliente") || 0) || null;
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const empresaExterna = String(formData.get("empresaExterna") ?? "").trim() || null;
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim() || null;
  const cargo = String(formData.get("cargo") ?? "").trim() || null;
  const temaInteres = String(formData.get("temaInteres") ?? "").trim() || null;
  const relacionGt = String(formData.get("relacionGt") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const correo = String(formData.get("correo") ?? "").trim() || null;

  if (!nombres || !apellidos) return;
  if (tipoRelacionCodigo === "CLIENTE" && !idCliente) return;
  if (tipoRelacionCodigo === "PROVEEDOR" && !idProveedor) return;
  if ((tipoRelacionCodigo === "SOCIO_COMERCIAL" || tipoRelacionCodigo === "OTRO") && !empresaExterna) return;

  const idTipoRelacion = await resolverIdTipoRelacion(tipoRelacionCodigo);

  const resultado = await crearContactoExterno({
    idTipoRelacion,
    idCliente,
    idProveedor,
    empresaExterna,
    nombres,
    apellidos,
    area,
    cargo,
    temaInteres,
    relacionGt,
    telefono,
    correo,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/rrhh/directorio");
  if (idCliente) revalidatePath(`/facturacion/proyectos/clientes/${idCliente}`);
  if (idProveedor) revalidatePath(`/facturacion/compras/proveedores/${idProveedor}`);
  redirect(`/rrhh/directorio/contactos/${resultado.id_contacto}`);
}

export async function actualizarContactoExternoAction(formData: FormData): Promise<void> {
  const tipoRelacionCodigo = String(formData.get("tipoRelacionCodigo") ?? "").trim();
  if (!tipoRelacionCodigo) return;

  const sesion = await requirePermisoSegunTipo(tipoRelacionCodigo, "ESCRITURA");

  const idContacto = Number(formData.get("idContacto"));
  const idCliente = Number(formData.get("idCliente") || 0) || null;
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const nombres = String(formData.get("nombres") ?? "").trim();
  const apellidos = String(formData.get("apellidos") ?? "").trim();
  const area = String(formData.get("area") ?? "").trim() || null;
  const cargo = String(formData.get("cargo") ?? "").trim() || null;
  const temaInteres = String(formData.get("temaInteres") ?? "").trim() || null;
  const relacionGt = String(formData.get("relacionGt") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const correo = String(formData.get("correo") ?? "").trim() || null;

  if (!idContacto || !nombres || !apellidos) return;

  await actualizarContactoExterno({
    idContacto,
    nombres,
    apellidos,
    area,
    cargo,
    temaInteres,
    relacionGt,
    telefono,
    correo,
    idUsuarioModificacion: sesion.idUsuario,
  });

  revalidatePath(`/rrhh/directorio/contactos/${idContacto}`);
  if (idCliente) revalidatePath(`/facturacion/proyectos/clientes/${idCliente}`);
  if (idProveedor) revalidatePath(`/facturacion/compras/proveedores/${idProveedor}`);
  refresh();
}

export async function cambiarEstadoContactoExternoAction(formData: FormData): Promise<void> {
  const tipoRelacionCodigo = String(formData.get("tipoRelacionCodigo") ?? "").trim();
  if (!tipoRelacionCodigo) return;

  const sesion = await requirePermisoSegunTipo(tipoRelacionCodigo, "ADMIN");

  const idContacto = Number(formData.get("idContacto"));
  const idCliente = Number(formData.get("idCliente") || 0) || null;
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const activo = formData.get("activo") === "1";
  if (!idContacto) return;

  await cambiarEstadoContactoExterno(idContacto, activo, sesion.idUsuario);

  revalidatePath(`/rrhh/directorio/contactos/${idContacto}`);
  if (idCliente) revalidatePath(`/facturacion/proyectos/clientes/${idCliente}`);
  if (idProveedor) revalidatePath(`/facturacion/compras/proveedores/${idProveedor}`);
  refresh();
}
