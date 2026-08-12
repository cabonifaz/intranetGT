"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireSession } from "@/lib/auth/get-current-user";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { obtenerPermisosUsuario } from "@/lib/db/repositories/permiso.repository";
import { tienePermiso } from "@/lib/rbac/permissions";
import { obtenerEmpleado, upsertEmpleado } from "@/lib/db/repositories/rrhh-empleado.repository";
import { tieneIdentidadCompleta } from "@/lib/rrhh/identidad";
import {
  crearContrato,
  obtenerContrato,
  generarLinkContrato,
  renovarContrato,
  agregarConceptoContrato,
  eliminarConceptoContrato,
  listarConceptosContrato,
  agregarProyectoContrato,
  eliminarProyectoContrato,
  registrarHorasContrato,
  eliminarHorasContrato,
  marcarHorasPagadas,
  actualizarFuncionesContrato,
  eliminarContrato,
} from "@/lib/db/repositories/contrato.repository";
import { registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";
import {
  agregarPeriodoPago,
  listarPeriodosPago,
  actualizarPeriodoPago,
  eliminarPeriodoPago,
  marcarPeriodoPagoPagado,
} from "@/lib/db/repositories/rrhh-periodo-pago.repository";
import { generarPeriodosPendientes } from "@/lib/rrhh/periodos-pago";
import {
  crearPlantilla,
  actualizarPlantilla,
  cambiarEstadoPlantilla,
  obtenerPlantillaActiva,
  agregarClausulaPlantilla,
  actualizarClausulaPlantilla,
  eliminarClausulaPlantilla,
} from "@/lib/db/repositories/plantilla-contrato.repository";

const CONTRATOS_APP_CODIGO = "RRHH_CONTRATOS";
const DIAS_VIGENCIA_LINK = 7;

// Autorizacion en dos niveles, igual que calcularVisibilidadFicha (ver
// src/lib/rrhh/visibilidad-directorio.ts): RRHH con ESCRITURA edita todo
// de cualquiera; cualquier otra persona solo puede editar su propia ficha,
// y solo sus campos de contacto (telefono/direccion/foto) -- documento de
// identidad, pais/ciudad y correo de Clockify quedan intactos, los
// controla RRHH. Puesto y fecha de ingreso ya no son editables por nadie
// -- se calculan solos (rol principal y primer contrato, ver
// SP_RRHH_EMPLEADO_OBTENER).
export async function actualizarEmpleadoAction(formData: FormData): Promise<void> {
  const sesion = await requireSession();
  const idUsuario = Number(formData.get("idUsuario"));
  if (!idUsuario) return;

  const esUnoMismo = idUsuario === sesion.idUsuario;
  const permisos = await obtenerPermisosUsuario(sesion.idUsuario);
  const tieneEscrituraRrhh = tienePermiso(permisos, "RRHH_DIRECTORIO", "ESCRITURA");

  if (!esUnoMismo && !tieneEscrituraRrhh) return;

  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const direccion = String(formData.get("direccion") ?? "").trim() || null;
  const fotoUrl = String(formData.get("fotoUrl") ?? "").trim() || null;

  let extension: string | null;
  let idTipoDocumento: number | null;
  let nroDocumento: string | null;
  let idPais: number | null;
  let idCiudad: number | null;
  let correoClockify: string | null;
  let idSistemaPension: number | null;
  let idAfpFondo: number | null;
  let suspensionRetencion4taHasta: string | null;

  if (tieneEscrituraRrhh) {
    extension = String(formData.get("extension") ?? "").trim() || null;
    idTipoDocumento = Number(formData.get("idTipoDocumento") || 0) || null;
    nroDocumento = String(formData.get("nroDocumento") ?? "").trim() || null;
    idPais = Number(formData.get("idPais") || 0) || null;
    idCiudad = Number(formData.get("idCiudad") || 0) || null;
    correoClockify = String(formData.get("correoClockify") ?? "").trim() || null;
    idSistemaPension = Number(formData.get("idSistemaPension") || 0) || null;
    idAfpFondo = Number(formData.get("idAfpFondo") || 0) || null;
    suspensionRetencion4taHasta = String(formData.get("suspensionRetencion4taHasta") ?? "").trim() || null;
  } else {
    const actual = await obtenerEmpleado(idUsuario);
    extension = actual?.EXTENSION ?? null;
    idTipoDocumento = actual?.ID_TIPO_DOCUMENTO ?? null;
    nroDocumento = actual?.NRO_DOCUMENTO ?? null;
    idPais = actual?.ID_PAIS ?? null;
    idCiudad = actual?.ID_CIUDAD ?? null;
    correoClockify = actual?.CORREO_CLOCKIFY ?? null;
    idSistemaPension = actual?.ID_SISTEMA_PENSION ?? null;
    idAfpFondo = actual?.ID_AFP_FONDO ?? null;
    suspensionRetencion4taHasta = actual?.SUSPENSION_RETENCION_4TA_HASTA ?? null;
  }

  await upsertEmpleado({
    idUsuario,
    telefono,
    extension,
    fotoUrl,
    idTipoDocumento,
    nroDocumento,
    direccion,
    idPais,
    idCiudad,
    correoClockify,
    idSistemaPension,
    idAfpFondo,
    suspensionRetencion4taHasta,
    idUsuarioModificacion: sesion.idUsuario,
  });

  revalidatePath(`/rrhh/directorio/${idUsuario}`);
  revalidatePath("/rrhh/directorio");
  refresh();
}

// Los montos ya no se piden aqui: PLANILLA los arma despues como lineas de
// concepto, LOCADOR por hora como proyectos con su propia tarifa. Solo
// LOCADOR mensual/por jornada trae tarifa/proyecto de una vez.
export async function crearContratoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idUsuario = Number(formData.get("idUsuario"));
  const idTipoContrato = Number(formData.get("idTipoContrato"));
  const idTipoPagoLocadorRaw = Number(formData.get("idTipoPagoLocador") || 0);
  const idTipoPagoLocador = idTipoPagoLocadorRaw || null;
  const cargo = String(formData.get("cargo") ?? "").trim();
  const funciones = String(formData.get("funciones") ?? "").trim() || null;
  const fechaInicio = String(formData.get("fechaInicio") ?? "").trim();
  const fechaFin = String(formData.get("fechaFin") ?? "").trim() || null;
  const diasLaborales = String(formData.get("diasLaborales") ?? "").trim() || null;
  const horaInicio = String(formData.get("horaInicio") ?? "").trim() || null;
  const horaFin = String(formData.get("horaFin") ?? "").trim() || null;
  const notaJornada = String(formData.get("notaJornada") ?? "").trim() || null;
  const tarifaRaw = String(formData.get("tarifa") ?? "").trim();
  const tarifa = tarifaRaw ? Number(tarifaRaw) : null;
  const idMoneda = Number(formData.get("idMoneda") || 0) || null;
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;
  const periodoPago = String(formData.get("periodoPago") ?? "").trim() || null;

  const idTipoDocumentoForm = Number(formData.get("idTipoDocumento") || 0) || null;
  const nroDocumentoForm = String(formData.get("nroDocumento") ?? "").trim() || null;
  const direccionForm = String(formData.get("direccion") ?? "").trim() || null;
  const idPaisForm = Number(formData.get("idPais") || 0) || null;
  const idCiudadForm = Number(formData.get("idCiudad") || 0) || null;

  if (!idUsuario || !idTipoContrato || !cargo || !fechaInicio || !fechaFin) return;

  // Si a la persona le falta el documento de identidad (tipo + numero),
  // el formulario de creacion permite completarlo ahi mismo -- se fusiona
  // lo que ya tenia con lo que llego en el form, y si con eso queda
  // completo se guarda en su ficha antes de crear el contrato. Direccion/
  // pais/ciudad NO son obligatorios (no son parte del cuerpo de los
  // modelos de contrato) -- si llegan se guardan igual, pero no bloquean.
  const empleado = await obtenerEmpleado(idUsuario);
  const idTipoDocumento = idTipoDocumentoForm ?? empleado?.ID_TIPO_DOCUMENTO ?? null;
  const nroDocumento = nroDocumentoForm ?? empleado?.NRO_DOCUMENTO ?? null;
  const direccion = direccionForm ?? empleado?.DIRECCION ?? null;
  const idPais = idPaisForm ?? empleado?.ID_PAIS ?? null;
  const idCiudad = idCiudadForm ?? empleado?.ID_CIUDAD ?? null;
  if (!(idTipoDocumento && nroDocumento)) return;

  if (!tieneIdentidadCompleta(empleado) || direccionForm || idPaisForm || idCiudadForm) {
    await upsertEmpleado({
      idUsuario,
      telefono: empleado?.TELEFONO ?? null,
      extension: empleado?.EXTENSION ?? null,
      fotoUrl: empleado?.FOTO_URL ?? null,
      idTipoDocumento,
      nroDocumento,
      direccion,
      idPais,
      idCiudad,
      correoClockify: empleado?.CORREO_CLOCKIFY ?? null,
      idSistemaPension: empleado?.ID_SISTEMA_PENSION ?? null,
      idAfpFondo: empleado?.ID_AFP_FONDO ?? null,
      suspensionRetencion4taHasta: empleado?.SUSPENSION_RETENCION_4TA_HASTA ?? null,
      idUsuarioModificacion: sesion.idUsuario,
    });
  }

  // No se puede generar un contrato para un regimen sin plantilla activa
  // (maestro de contratos) -- RRHH la crea primero desde
  // /rrhh/contratos/plantillas.
  const plantilla = await obtenerPlantillaActiva(idTipoContrato, idTipoPagoLocador);
  if (!plantilla) return;

  const resultado = await crearContrato({
    idUsuario,
    idTipoContrato,
    idTipoPagoLocador,
    cargo,
    funciones,
    fechaInicio,
    fechaFin,
    diasLaborales,
    horaInicio,
    horaFin,
    notaJornada,
    tarifa,
    idMoneda,
    tipoCambio,
    idProyecto,
    periodoPago,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/rrhh/contratos");
  revalidatePath(`/rrhh/directorio/${idUsuario}`);
  redirect(`/rrhh/contratos/${resultado.id_contrato}`);
}

export interface GenerarLinkContratoState {
  ok: boolean;
  error?: string;
  url?: string;
}

export async function generarLinkContratoAction(
  _prevState: GenerarLinkContratoState,
  formData: FormData,
): Promise<GenerarLinkContratoState> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  if (!idContrato) {
    return { ok: false, error: "Contrato invalido." };
  }

  const token = randomUUID();
  const expira = new Date(Date.now() + DIAS_VIGENCIA_LINK * 24 * 60 * 60 * 1000);

  await generarLinkContrato(idContrato, token, expira);

  const listaHeaders = await headers();
  const host = listaHeaders.get("host");
  const protocolo = process.env.NODE_ENV === "production" ? "https" : "http";

  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();

  return { ok: true, url: `${protocolo}://${host}/contratos/firmar/${token}` };
}

// Copia cargo/tarifa/conceptos/proyectos del contrato anterior con las
// fechas nuevas (ver SP_RRHH_CONTRATO_RENOVAR); los montos se ajustan
// despues desde el detalle del contrato nuevo.
export async function renovarContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContratoAnterior = Number(formData.get("idContratoAnterior"));
  const fechaInicio = String(formData.get("fechaInicio") ?? "").trim();
  const fechaFin = String(formData.get("fechaFin") ?? "").trim() || null;

  if (!idContratoAnterior || !fechaInicio || !fechaFin) return;

  const resultado = await renovarContrato(idContratoAnterior, fechaInicio, fechaFin);

  revalidatePath("/rrhh/contratos");
  redirect(`/rrhh/contratos/${resultado.id_contrato_nuevo}`);
}

// Solo se puede agregar/corregir mientras el contrato no se haya firmado
// -- SP_RRHH_CONTRATO_ACTUALIZAR_FUNCIONES no-opea silenciosamente fuera
// de BORRADOR/PENDIENTE_FIRMA, esto solo evita mostrar el form cuando ya
// no aplica.
export async function actualizarFuncionesContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const funciones = String(formData.get("funciones") ?? "").trim() || null;

  if (!idContrato) return;

  await actualizarFuncionesContrato(idContrato, funciones);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

// Solo borra de verdad contratos BORRADOR/PENDIENTE_FIRMA -- todavia no
// son un documento legal, no se firmaron, no generaron ningun movimiento
// de dinero (ver SP_RRHH_CONTRATO_ELIMINAR). No-op silencioso en
// cualquier otro estado -- un FIRMADO/VENCIDO/RENOVADO/ANULADO nunca se
// borra, para eso existe ANULADO.
export async function eliminarContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  if (!idContrato) return;

  await eliminarContrato(idContrato);
  revalidatePath("/rrhh/contratos");
  // redirect() sirve para los dos lugares desde donde se llama esta accion:
  // desde el listado, redirige al mismo listado (la fila ya desaparecio,
  // efecto igual a un refresh); desde el detalle, saca a la persona de una
  // pagina cuyo contrato ya no existe.
  redirect("/rrhh/contratos");
}

export async function agregarConceptoContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idConcepto = Number(formData.get("idConcepto"));
  const monto = Number(formData.get("monto") ?? 0);

  if (!idContrato || !idConcepto || !monto) return;

  await agregarConceptoContrato(idContrato, idConcepto, monto);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function eliminarConceptoContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idContratoConcepto = Number(formData.get("idContratoConcepto"));
  if (!idContratoConcepto) return;

  await eliminarConceptoContrato(idContratoConcepto);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function agregarProyectoContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const tarifaHora = Number(formData.get("tarifaHora") ?? 0);
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;
  const idMoneda = Number(formData.get("idMoneda") || 0);
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;

  if (!idContrato || !idProyecto || !tarifaHora || !idMoneda) return;

  await agregarProyectoContrato(idContrato, idProyecto, tarifaHora, idMoneda, tipoCambio);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function eliminarProyectoContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idContratoProyecto = Number(formData.get("idContratoProyecto"));
  if (!idContratoProyecto) return;

  await eliminarProyectoContrato(idContratoProyecto);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function registrarHorasContratoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idContratoProyecto = Number(formData.get("idContratoProyecto"));
  const periodo = String(formData.get("periodo") ?? "").trim();
  const horas = Number(formData.get("horas") ?? 0);

  if (!idContratoProyecto || !periodo || !horas) return;

  await registrarHorasContrato(idContratoProyecto, periodo, horas, sesion.idUsuario);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function eliminarHorasContratoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idContratoHoras = Number(formData.get("idContratoHoras"));
  if (!idContratoHoras) return;

  await eliminarHorasContrato(idContratoHoras);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

// Unico mecanismo de pago para locadores POR_HORA -- "Pagos a contratos"
// (facturacion/compras) no los cubre porque su monto depende de las
// horas registradas periodo a periodo, no de un monto fijo del
// contrato. Mismo flujo de dos pasos que registrarPagoCompraAction.
export async function pagarHorasContratoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idContratoHoras = Number(formData.get("idContratoHoras"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();
  // Solo se llena cuando el formulario se dispara desde el detalle de un
  // proyecto (ver "Mano de obra (horas)" en /facturacion/proyectos/[id])
  // en vez del detalle del contrato -- revalida esa pagina tambien.
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;

  if (!idContratoHoras || !idCuenta || !fechaPago || !monto || !concepto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento: fechaPago,
    monto,
    concepto,
    tipoReferencia: "RRHH_CONTRATO_HORAS",
    idReferencia: idContratoHoras,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await marcarHorasPagadas(idContratoHoras, movimiento.id_movimiento, fechaPago);

  revalidatePath(`/rrhh/contratos/${idContrato}`);
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  if (idProyecto) revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

// --- Periodos de sueldo/honorario (PLANILLA_*/LOCADOR MENSUAL/POR_JORNADA/
// POR_PROYECTO) -- reemplaza el flujo plano de "Pagos a contratos", que
// pagaba el contrato entero sin memoria de que periodo era.

export async function agregarPeriodoPagoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const periodo = String(formData.get("periodo") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;

  if (!idContrato || !periodo || !monto) return;

  await agregarPeriodoPago(idContrato, periodo, monto, sesion.idUsuario);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

// Genera un periodo por cada mes calendario entre FECHA_INICIO y hoy (o
// FECHA_FIN si el contrato ya termino), saltando los que ya existen --
// reemplaza tener que escribir "JUNIO 2026" a mano cada vez. El monto
// sugerido es el mismo que ya se usaba en el form manual (suma de
// conceptos para planilla, TARIFA para locador de tarifa unica); si un
// mes puntual necesita otro monto, se corrige despues con
// actualizarPeriodoPagoAction.
export async function generarPeriodosPendientesAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  if (!idContrato) return;

  const contrato = await obtenerContrato(idContrato);
  if (!contrato) return;

  const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const [conceptos, periodosActuales] = await Promise.all([
    esPlanilla ? listarConceptosContrato(idContrato) : Promise.resolve([]),
    listarPeriodosPago(idContrato),
  ]);
  const montoSugerido = esPlanilla
    ? conceptos.reduce((suma, c) => suma + Number(c.MONTO), 0)
    : Number(contrato.TARIFA ?? 0);
  if (!montoSugerido) return;

  const periodosNuevos = generarPeriodosPendientes(
    contrato.FECHA_INICIO,
    contrato.FECHA_FIN,
    periodosActuales.map((p) => p.PERIODO),
  );

  for (const periodo of periodosNuevos) {
    await agregarPeriodoPago(idContrato, periodo, montoSugerido, sesion.idUsuario);
  }

  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function actualizarPeriodoPagoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idPeriodoPago = Number(formData.get("idPeriodoPago"));
  const periodo = String(formData.get("periodo") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;

  if (!idPeriodoPago || !periodo || !monto) return;

  await actualizarPeriodoPago(idPeriodoPago, periodo, monto);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function eliminarPeriodoPagoAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idPeriodoPago = Number(formData.get("idPeriodoPago"));
  if (!idPeriodoPago) return;

  await eliminarPeriodoPago(idPeriodoPago);
  revalidatePath(`/rrhh/contratos/${idContrato}`);
  refresh();
}

export async function pagarPeriodoContratoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ESCRITURA");

  const idContrato = Number(formData.get("idContrato"));
  const idPeriodoPago = Number(formData.get("idPeriodoPago"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();

  if (!idPeriodoPago || !idCuenta || !fechaPago || !monto || !concepto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento: fechaPago,
    monto,
    concepto,
    tipoReferencia: "RRHH_CONTRATO_PERIODO_PAGO",
    idReferencia: idPeriodoPago,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await marcarPeriodoPagoPagado(idPeriodoPago, movimiento.id_movimiento, fechaPago);

  revalidatePath(`/rrhh/contratos/${idContrato}`);
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

// --- Maestro de contratos (plantillas) -- solo el gerente de RRHH (nivel
// ADMIN sobre RRHH_CONTRATOS, no ESCRITURA) puede definir el contenido
// legal que despues usa cualquiera con ESCRITURA para generar contratos.

export async function crearPlantillaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ADMIN");

  const idTipoContrato = Number(formData.get("idTipoContrato"));
  const idTipoPagoLocadorRaw = Number(formData.get("idTipoPagoLocador") || 0);
  const idTipoPagoLocador = idTipoPagoLocadorRaw || null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tituloDocumento = String(formData.get("tituloDocumento") ?? "").trim();
  const parrafoIntro = String(formData.get("parrafoIntro") ?? "").trim();

  if (!idTipoContrato || !nombre || !tituloDocumento || !parrafoIntro) return;

  const resultado = await crearPlantilla({
    idTipoContrato,
    idTipoPagoLocador,
    nombre,
    tituloDocumento,
    parrafoIntro,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/rrhh/contratos/plantillas");
  redirect(`/rrhh/contratos/plantillas/${resultado.id_plantilla}`);
}

export async function actualizarPlantillaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ADMIN");

  const idPlantilla = Number(formData.get("idPlantilla"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tituloDocumento = String(formData.get("tituloDocumento") ?? "").trim();
  const parrafoIntro = String(formData.get("parrafoIntro") ?? "").trim();

  if (!idPlantilla || !nombre || !tituloDocumento || !parrafoIntro) return;

  await actualizarPlantilla({ idPlantilla, nombre, tituloDocumento, parrafoIntro, idUsuarioModificacion: sesion.idUsuario });
  revalidatePath(`/rrhh/contratos/plantillas/${idPlantilla}`);
  refresh();
}

export async function cambiarEstadoPlantillaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ADMIN");

  const idPlantilla = Number(formData.get("idPlantilla"));
  const activo = formData.get("activo") === "1";
  if (!idPlantilla) return;

  await cambiarEstadoPlantilla(idPlantilla, activo, sesion.idUsuario);
  revalidatePath("/rrhh/contratos/plantillas");
  revalidatePath(`/rrhh/contratos/plantillas/${idPlantilla}`);
  refresh();
}

export async function agregarClausulaPlantillaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CONTRATOS_APP_CODIGO, "ADMIN");

  const idPlantilla = Number(formData.get("idPlantilla"));
  const orden = Number(formData.get("orden") ?? 0);
  const titulo = String(formData.get("titulo") ?? "").trim() || null;
  const contenido = String(formData.get("contenido") ?? "").trim();

  if (!idPlantilla || !contenido) return;

  await agregarClausulaPlantilla(idPlantilla, orden, titulo, contenido, sesion.idUsuario);
  revalidatePath(`/rrhh/contratos/plantillas/${idPlantilla}`);
  refresh();
}

export async function actualizarClausulaPlantillaAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ADMIN");

  const idPlantilla = Number(formData.get("idPlantilla"));
  const idClausula = Number(formData.get("idClausula"));
  const orden = Number(formData.get("orden") ?? 0);
  const titulo = String(formData.get("titulo") ?? "").trim() || null;
  const contenido = String(formData.get("contenido") ?? "").trim();

  if (!idClausula || !contenido) return;

  await actualizarClausulaPlantilla(idClausula, orden, titulo, contenido);
  revalidatePath(`/rrhh/contratos/plantillas/${idPlantilla}`);
  refresh();
}

export async function eliminarClausulaPlantillaAction(formData: FormData): Promise<void> {
  await requirePermiso(CONTRATOS_APP_CODIGO, "ADMIN");

  const idPlantilla = Number(formData.get("idPlantilla"));
  const idClausula = Number(formData.get("idClausula"));
  if (!idClausula) return;

  await eliminarClausulaPlantilla(idClausula);
  revalidatePath(`/rrhh/contratos/plantillas/${idPlantilla}`);
  refresh();
}
