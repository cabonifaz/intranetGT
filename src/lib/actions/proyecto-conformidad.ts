"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  crearConformidad,
  obtenerConformidad,
  listarItemsConformidad,
  agregarItemConformidad,
  actualizarItemConformidad,
  eliminarItemConformidad,
  emitirConformidad,
  reabrirConformidad,
  generarLinkConformidad,
  registrarFirmaConformidad,
  anularConformidad,
  eliminarConformidad,
} from "@/lib/db/repositories/proyecto-conformidad.repository";
import { generarConformidadPdf } from "@/lib/proyectos/generar-conformidad-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { guardarArchivo } from "@/lib/storage/local-storage";

const PROYECTOS_APP_CODIGO = "PROYECTOS_EMPRESA";
const DIAS_VIGENCIA_LINK_CONFORMIDAD = 7;

const TAMANO_MAX_ADJUNTO_BYTES = 15 * 1024 * 1024;
const TIPOS_ADJUNTO_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

function rutaConformidad(idProyecto: number, idConformidad: number): string {
  return `/facturacion/proyectos/${idProyecto}/conformidades/${idConformidad}`;
}

// Crea (o, si ya existe para ese hito, reutiliza -- ver guard idempotente
// del SP) la conformidad y va directo a la pantalla de edicion de items.
export async function crearConformidadAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idHito = Number(formData.get("idHito"));
  const idProyecto = Number(formData.get("idProyecto"));
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!idHito || !idProyecto || !titulo) return;

  const { id_conformidad: idConformidad } = await crearConformidad(idHito, titulo, sesion.idUsuario);

  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  redirect(rutaConformidad(idProyecto, idConformidad));
}

export async function agregarItemConformidadAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  const idProyecto = Number(formData.get("idProyecto"));
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!idConformidad || !descripcion) return;

  const items = await listarItemsConformidad(idConformidad);
  await agregarItemConformidad(idConformidad, descripcion, items.length);

  revalidatePath(rutaConformidad(idProyecto, idConformidad));
  refresh();
}

export async function actualizarItemConformidadAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idItem = Number(formData.get("idItem"));
  const idProyecto = Number(formData.get("idProyecto"));
  const idConformidad = Number(formData.get("idConformidad"));
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!idItem || !descripcion) return;

  await actualizarItemConformidad(idItem, descripcion);

  revalidatePath(rutaConformidad(idProyecto, idConformidad));
  refresh();
}

export async function eliminarItemConformidadAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idItem = Number(formData.get("idItem"));
  const idProyecto = Number(formData.get("idProyecto"));
  const idConformidad = Number(formData.get("idConformidad"));
  if (!idItem) return;

  await eliminarItemConformidad(idItem);

  revalidatePath(rutaConformidad(idProyecto, idConformidad));
  refresh();
}

// Estado devuelto por emitirConformidadAction -- mismo patron {ok,error}
// que el resto de acciones con useActionState en el repo (ver
// ReabrirPlanillaState en rrhh-planilla.ts).
export interface EmitirConformidadState {
  ok: boolean;
  error?: string;
}

// Genera el PDF sin firma (preview) y pasa la conformidad de BORRADOR a
// EMITIDA -- de ahi en adelante los items quedan congelados. Exige al
// menos 1 item (el SP solo exige BORRADOR, esta regla de negocio vive
// aca porque un documento de conformidad sin nada que listar no tiene
// sentido).
export async function emitirConformidadAction(
  _prevState: EmitirConformidadState,
  formData: FormData,
): Promise<EmitirConformidadState> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  if (!idConformidad) return { ok: false, error: "Conformidad inválida." };

  const conformidad = await obtenerConformidad(idConformidad);
  if (!conformidad || conformidad.ESTADO_CONFORMIDAD_CODIGO !== "BORRADOR") {
    return { ok: false, error: "Esta conformidad ya no está en borrador." };
  }

  const items = await listarItemsConformidad(idConformidad);
  if (items.length === 0) {
    return { ok: false, error: "Agrega al menos un item antes de emitir." };
  }

  const logo = await cargarLogoEmpresa();
  const pdfBytes = await generarConformidadPdf({
    idConformidad: conformidad.ID_CONFORMIDAD,
    titulo: conformidad.TITULO,
    nombreProyecto: conformidad.PROYECTO_NOMBRE,
    clienteRazonSocial: conformidad.CLIENTE_RAZON_SOCIAL,
    clienteRuc: conformidad.CLIENTE_RUC,
    hitoNombre: conformidad.HITO_NOMBRE,
    hitoMonto: Number(conformidad.HITO_MONTO),
    monedaCodigo: conformidad.MONEDA_CODIGO,
    fechaEmision: new Date().toISOString().slice(0, 10),
    items: items.map((i) => ({ descripcion: i.DESCRIPCION })),
    logoBytes: logo.logoBytes,
    logoFormato: logo.logoFormato,
  });

  const documentoPath = `proyectos/conformidades/${idConformidad}/conformidad.pdf`;
  await guardarArchivo(documentoPath, pdfBytes);
  await emitirConformidad(idConformidad, documentoPath);

  revalidatePath(rutaConformidad(conformidad.ID_PROYECTO, idConformidad));
  refresh();

  return { ok: true };
}

// Vuelve a BORRADOR para corregir items -- guard en el SP: solo si
// EMITIDA (nunca si ya FIRMADA).
export async function reabrirConformidadAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  const idProyecto = Number(formData.get("idProyecto"));
  if (!idConformidad) return;

  await reabrirConformidad(idConformidad);

  revalidatePath(rutaConformidad(idProyecto, idConformidad));
  refresh();
}

// Estado devuelto por generarLinkConformidadAction -- mismo patron que
// generarLinkPrestamoAction.
export interface GenerarLinkConformidadState {
  ok: boolean;
  error?: string;
  url?: string;
}

// Genera (o regenera) el link publico para que el cliente firme el
// mismo, sin iniciar sesion -- mismo mecanismo que generarLinkPrestamoAction:
// token de 7 dias. Solo tiene sentido en EMITIDA -- el SP no-opea en
// cualquier otro estado.
export async function generarLinkConformidadAction(
  _prevState: GenerarLinkConformidadState,
  formData: FormData,
): Promise<GenerarLinkConformidadState> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  if (!idConformidad) return { ok: false, error: "Conformidad inválida." };

  const conformidad = await obtenerConformidad(idConformidad);
  if (!conformidad || conformidad.ESTADO_CONFORMIDAD_CODIGO !== "EMITIDA") {
    return { ok: false, error: "Solo se puede generar el link mientras la conformidad está emitida y pendiente de firma." };
  }

  const token = randomUUID();
  const expira = new Date(Date.now() + DIAS_VIGENCIA_LINK_CONFORMIDAD * 24 * 60 * 60 * 1000);
  await generarLinkConformidad(idConformidad, token, expira);

  const listaHeaders = await headers();
  const host = listaHeaders.get("host");
  const protocolo = process.env.NODE_ENV === "production" ? "https" : "http";

  revalidatePath(rutaConformidad(conformidad.ID_PROYECTO, idConformidad));
  refresh();

  return { ok: true, url: `${protocolo}://${host}/conformidades/firmar/${token}` };
}

// Alternativa al link publico: el cliente firmo en papel y el gestor
// sube el documento ya firmado (escaneado o foto) -- mismo patron que
// subirCompromisoFirmadoAction. Exige EMITIDA (el SP vuelve a validarlo).
export async function subirConformidadFirmadaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  const idProyecto = Number(formData.get("idProyecto"));
  const archivo = formData.get("archivo");
  if (!idConformidad || !(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_ADJUNTO_BYTES) return;

  const extension = TIPOS_ADJUNTO_PERMITIDOS[archivo.type];
  if (!extension) return;

  const rutaRelativa = `proyectos/conformidades/${idConformidad}/conformidad-firmada.${extension}`;
  await guardarArchivo(rutaRelativa, new Uint8Array(await archivo.arrayBuffer()));
  await registrarFirmaConformidad(idConformidad, rutaRelativa, null, sesion.idUsuario);

  revalidatePath(rutaConformidad(idProyecto, idConformidad));
  refresh();
}

// Nunca se anula una conformidad FIRMADA -- es respaldo legal de una
// factura (ver guard en el SP).
export async function anularConformidadAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  const idProyecto = Number(formData.get("idProyecto"));
  const motivo = String(formData.get("motivo") ?? "").trim() || "Sin motivo especificado";
  if (!idConformidad) return;

  await anularConformidad(idConformidad, motivo, sesion.idUsuario);

  revalidatePath(rutaConformidad(idProyecto, idConformidad));
  refresh();
}

// Deshace una creacion por error -- guard en el SP: solo si BORRADOR.
export async function eliminarConformidadAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idConformidad = Number(formData.get("idConformidad"));
  const idProyecto = Number(formData.get("idProyecto"));
  if (!idConformidad || !idProyecto) return;

  await eliminarConformidad(idConformidad);

  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  redirect(`/facturacion/proyectos/${idProyecto}`);
}
