"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireImportarContrato } from "@/lib/auth/require-permiso";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { agregarConceptoContrato } from "@/lib/db/repositories/contrato.repository";
import { crearImportacionContrato, confirmarImportacionContrato } from "@/lib/db/repositories/contrato-importacion.repository";
import { extraerSolicitudContrato, type DatosExtraidosSolicitud } from "@/lib/rrhh/contratos/extraer-solicitud-contrato";
import { guardarArchivo } from "@/lib/storage/local-storage";

const TAMANO_MAX_BYTES = 15 * 1024 * 1024;
const TIPOS_PERMITIDOS: Record<string, { mime: "application/pdf" | "image/png" | "image/jpeg"; extension: string }> = {
  "application/pdf": { mime: "application/pdf", extension: "pdf" },
  "image/png": { mime: "image/png", extension: "png" },
  "image/jpeg": { mime: "image/jpeg", extension: "jpg" },
};

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const DATOS_VACIOS: DatosExtraidosSolicitud = {
  nombres: null,
  apellidos: null,
  nroDocumento: null,
  cargo: null,
  tipoContrato: null,
  tipoPagoLocador: null,
  fechaInicio: null,
  fechaFin: null,
  diasLaborales: null,
  horaInicio: null,
  horaFin: null,
  conceptosRemunerativos: [],
  tarifa: null,
  monedaCodigo: null,
  periodoPago: null,
  nroCuenta: null,
  cci: null,
  banco: null,
  fechaFirma: null,
  advertencias: [],
};

// Sube la solicitud escaneada (paso 1), la extrae automaticamente (paso
// 2, dentro del mismo envio -- sin pantalla de espera aparte) y crea el
// contrato directo en IMPORTADO_EN_REVISION con lo que se pudo leer.
// Colaborador y tipo de contrato/pago los elige la persona que sube el
// archivo (no se confia en que la OCR clasifique correctamente una
// casilla marcada) -- el resto (cargo, fechas, jornada, remuneracion,
// cuenta bancaria) lo completa la extraccion, y todo queda editable en
// la revision (paso 3). Si la extraccion falla (ej. falta la API key),
// el contrato igual se crea con campos vacios para completar a mano --
// no se pierde el archivo subido.
export async function subirSolicitudContratoAction(formData: FormData): Promise<void> {
  const sesion = await requireImportarContrato();

  const idUsuario = Number(formData.get("idUsuario"));
  const idTipoContrato = Number(formData.get("idTipoContrato"));
  const idTipoPagoLocadorRaw = Number(formData.get("idTipoPagoLocador") || 0);
  const idTipoPagoLocador = idTipoPagoLocadorRaw || null;
  const archivo = formData.get("archivo");

  if (!idUsuario || !idTipoContrato) return;
  if (!(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_BYTES) return;
  const tipoArchivo = TIPOS_PERMITIDOS[archivo.type];
  if (!tipoArchivo) return;

  const tiposContrato = await listarMaestros("TIPO_CONTRATO");
  const tipoContratoCodigo = tiposContrato.find((t) => t.ID_MAESTRO === idTipoContrato)?.CODIGO;
  if (!tipoContratoCodigo) return;

  const bytesArchivo = new Uint8Array(await archivo.arrayBuffer());

  let datos: DatosExtraidosSolicitud;
  let errorExtraccion: string | null = null;
  try {
    datos = await extraerSolicitudContrato(bytesArchivo, tipoArchivo.mime);
  } catch (err) {
    datos = DATOS_VACIOS;
    errorExtraccion = err instanceof Error ? err.message : "No se pudo extraer los datos del documento.";
  }

  const monedas = await listarMaestros("MONEDA");
  const idMoneda = datos.monedaCodigo ? (monedas.find((m) => m.CODIGO === datos.monedaCodigo)?.ID_MAESTRO ?? null) : null;

  const cargo = datos.cargo ?? "(completar en revision)";
  const fechaInicio = datos.fechaInicio ?? hoyIso();

  const advertencias = [...datos.advertencias];
  if (errorExtraccion) advertencias.unshift(`La extraccion automatica no funciono: ${errorExtraccion}`);
  if (!datos.cargo) advertencias.push("No se pudo leer el cargo -- se dejo un texto de relleno, complétalo.");
  if (!datos.fechaInicio) advertencias.push("No se pudo leer la fecha de inicio -- se uso la fecha de hoy, verificala.");

  const rutaRelativa = `rrhh/contratos/importados/${Date.now()}.${tipoArchivo.extension}`;
  await guardarArchivo(rutaRelativa, bytesArchivo);

  const { id_contrato: idContrato } = await crearImportacionContrato({
    idUsuario,
    idTipoContrato,
    idTipoPagoLocador,
    cargo,
    fechaInicio,
    fechaFin: datos.fechaFin,
    diasLaborales: datos.diasLaborales,
    horaInicio: datos.horaInicio,
    horaFin: datos.horaFin,
    tarifa: datos.tarifa,
    idMoneda,
    tipoCambio: null,
    periodoPago: datos.periodoPago,
    nroCuenta: datos.nroCuenta,
    cci: datos.cci,
    banco: datos.banco,
    documentoEscaneadoPath: rutaRelativa,
    datosExtraidosJson: JSON.stringify(datos),
    advertenciasExtraccion: advertencias.length > 0 ? advertencias.join(" | ") : null,
    idUsuarioCarga: sesion.idUsuario,
  });

  // Conceptos remunerativos (solo Planilla): se agregan de una los que la
  // OCR pudo emparejar EXACTO contra el catalogo -- si no hay match, se
  // deja para agregarlo a mano en la revision en vez de inventar un
  // concepto o adivinar el mas parecido.
  if (tipoContratoCodigo !== "LOCADOR" && datos.conceptosRemunerativos.length > 0) {
    const catalogoConceptos = await listarMaestros("CONCEPTO_REMUNERATIVO");
    for (const c of datos.conceptosRemunerativos) {
      const match = catalogoConceptos.find((cat) => cat.DESCRIPCION.toLowerCase().trim() === c.concepto.toLowerCase().trim());
      if (match) await agregarConceptoContrato(idContrato, match.ID_MAESTRO, c.monto);
    }
  }

  revalidatePath("/rrhh/contratos");
  redirect(`/rrhh/contratos/importar/${idContrato}`);
}

// Paso 3: guarda las correcciones y activa el contrato (FIRMADO) en el
// mismo envio -- de ahi en adelante es indistinguible de un contrato
// firmado por el flujo normal.
export async function confirmarImportacionContratoAction(formData: FormData): Promise<void> {
  const sesion = await requireImportarContrato();

  const idContrato = Number(formData.get("idContrato"));
  const idUsuario = Number(formData.get("idUsuario"));
  const idTipoContrato = Number(formData.get("idTipoContrato"));
  const idTipoPagoLocadorRaw = Number(formData.get("idTipoPagoLocador") || 0);
  const idTipoPagoLocador = idTipoPagoLocadorRaw || null;
  const cargo = String(formData.get("cargo") ?? "").trim();
  const fechaInicio = String(formData.get("fechaInicio") ?? "").trim();
  const fechaFin = String(formData.get("fechaFin") ?? "").trim() || null;
  const diasLaborales = String(formData.get("diasLaborales") ?? "").trim() || null;
  const horaInicio = String(formData.get("horaInicio") ?? "").trim() || null;
  const horaFin = String(formData.get("horaFin") ?? "").trim() || null;
  const tarifaRaw = String(formData.get("tarifa") ?? "").trim();
  const tarifa = tarifaRaw ? Number(tarifaRaw) : null;
  const idMonedaRaw = Number(formData.get("idMoneda") || 0);
  const idMoneda = idMonedaRaw || null;
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;
  const periodoPago = String(formData.get("periodoPago") ?? "").trim() || null;
  const nroCuenta = String(formData.get("nroCuenta") ?? "").trim() || null;
  const cci = String(formData.get("cci") ?? "").trim() || null;
  const banco = String(formData.get("banco") ?? "").trim() || null;
  const fechaFirma = String(formData.get("fechaFirma") ?? "").trim() || null;

  if (!idContrato || !idUsuario || !idTipoContrato || !cargo || !fechaInicio) return;

  await confirmarImportacionContrato({
    idContrato,
    idUsuario,
    idTipoContrato,
    idTipoPagoLocador,
    cargo,
    fechaInicio,
    fechaFin,
    diasLaborales,
    horaInicio,
    horaFin,
    tarifa,
    idMoneda,
    tipoCambio,
    periodoPago,
    nroCuenta,
    cci,
    banco,
    fechaFirma,
    idUsuarioConfirmacion: sesion.idUsuario,
  });

  revalidatePath("/rrhh/contratos");
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  redirect(`/rrhh/contratos/${idContrato}`);
}
