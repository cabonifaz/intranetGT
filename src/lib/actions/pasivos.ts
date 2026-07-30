"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  crearPasivo,
  actualizarPasivo,
  anularPasivo,
  agregarCuota,
  eliminarCuota,
  marcarCuotaPagada,
  protestarCuota,
  anularCuota,
} from "@/lib/db/repositories/pasivo.repository";
import { registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";

const PASIVOS_APP_CODIGO = "PASIVOS_EMPRESA";

// El acreedor es exactamente una de tres fuentes -- Proveedor, contacto
// del Directorio o personal interno de GT -- nunca dos a la vez, nunca
// ninguna.
function esUnaSolaFuenteAcreedor(idProveedor: number | null, idContacto: number | null, idUsuario: number | null): boolean {
  return [idProveedor, idContacto, idUsuario].filter((v) => v !== null).length === 1;
}

export async function crearPasivoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idTipoPasivo = Number(formData.get("idTipoPasivo"));
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const idContacto = Number(formData.get("idContacto") || 0) || null;
  const idUsuario = Number(formData.get("idUsuarioAcreedor") || 0) || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const nroOperacion = String(formData.get("nroOperacion") ?? "").trim() || null;
  const montoTotalRaw = String(formData.get("montoTotal") ?? "").trim();
  const montoTotal = montoTotalRaw ? Number(montoTotalRaw) : 0;
  const idMoneda = Number(formData.get("idMoneda"));
  const tasaInteresRaw = String(formData.get("tasaInteres") ?? "").trim();
  const tasaInteres = tasaInteresRaw ? Number(tasaInteresRaw) : null;
  const fechaOrigen = String(formData.get("fechaOrigen") ?? "").trim();
  const idCuentaPago = Number(formData.get("idCuentaPago") || 0) || null;

  if (!idTipoPasivo || !montoTotal || !idMoneda || !fechaOrigen) return;
  if (!esUnaSolaFuenteAcreedor(idProveedor, idContacto, idUsuario)) return;

  const resultado = await crearPasivo({
    idTipoPasivo,
    idProveedor,
    idContacto,
    idUsuario,
    descripcion,
    nroOperacion,
    montoTotal,
    idMoneda,
    tipoCambio: null,
    tasaInteres,
    fechaOrigen,
    idCuentaPago,
    idUsuarioCreacion: sesion.idUsuario,
    tipoReferencia: null,
    idReferencia: null,
    idProyecto: null,
  });

  revalidatePath("/facturacion/pasivos");
  redirect(`/facturacion/pasivos/${resultado.id_pasivo}`);
}

// Financiar un pago pendiente (compra, periodo de sueldo, horas de
// locador, asignacion de mano de obra) con un pasivo nuevo en vez de con
// una cuenta de la empresa -- el pasivo ES el pago, no se mueve caja.
// Compartida por las 4 pantallas que pueden financiar algo (ver
// FinanciarConPrestamoFila.tsx): p_tipo_referencia/p_id_referencia le
// dicen a SP_PASIVO_CREAR que fila esta financiando; SP_PASIVO_CREAR se
// encarga de que esa fila deje de contar como pendiente (leyendo PASIVO
// directamente en cada modulo, no se marca nada aca). rutaOrigen es la
// pantalla que llamo esta accion (compra/contrato/proyecto), para poder
// refrescarla sin que esta accion compartida tenga que conocer las 4
// rutas de antemano.
export async function financiarConPrestamoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idTipoPasivo = Number(formData.get("idTipoPasivo"));
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const idContacto = Number(formData.get("idContacto") || 0) || null;
  const idUsuario = Number(formData.get("idUsuarioAcreedor") || 0) || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const nroOperacion = String(formData.get("nroOperacion") ?? "").trim() || null;
  const montoTotalRaw = String(formData.get("montoTotal") ?? "").trim();
  const montoTotal = montoTotalRaw ? Number(montoTotalRaw) : 0;
  const idMoneda = Number(formData.get("idMoneda"));
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;
  const fechaOrigen = String(formData.get("fechaOrigen") ?? "").trim();
  const idCuentaPago = Number(formData.get("idCuentaPago") || 0) || null;
  const tipoReferencia = String(formData.get("tipoReferencia") ?? "").trim() || null;
  const idReferencia = Number(formData.get("idReferencia") || 0) || null;
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;
  const rutaOrigen = String(formData.get("rutaOrigen") ?? "").trim() || null;

  if (!idTipoPasivo || !montoTotal || !idMoneda || !fechaOrigen || !tipoReferencia || !idReferencia) return;
  if (!esUnaSolaFuenteAcreedor(idProveedor, idContacto, idUsuario)) return;

  await crearPasivo({
    idTipoPasivo,
    idProveedor,
    idContacto,
    idUsuario,
    descripcion,
    nroOperacion,
    montoTotal,
    idMoneda,
    tipoCambio,
    tasaInteres: null,
    fechaOrigen,
    idCuentaPago,
    idUsuarioCreacion: sesion.idUsuario,
    tipoReferencia,
    idReferencia,
    idProyecto,
  });

  if (rutaOrigen) revalidatePath(rutaOrigen);
  revalidatePath("/facturacion/pasivos");
  revalidatePath("/facturacion/cuentas-por-pagar");
  if (idProyecto) revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function actualizarPasivoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idPasivo = Number(formData.get("idPasivo"));
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const idContacto = Number(formData.get("idContacto") || 0) || null;
  const idUsuario = Number(formData.get("idUsuarioAcreedor") || 0) || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const nroOperacion = String(formData.get("nroOperacion") ?? "").trim() || null;
  const tasaInteresRaw = String(formData.get("tasaInteres") ?? "").trim();
  const tasaInteres = tasaInteresRaw ? Number(tasaInteresRaw) : null;
  const idCuentaPago = Number(formData.get("idCuentaPago") || 0) || null;

  if (!idPasivo) return;
  if (!esUnaSolaFuenteAcreedor(idProveedor, idContacto, idUsuario)) return;

  await actualizarPasivo({
    idPasivo,
    idProveedor,
    idContacto,
    idUsuario,
    descripcion,
    nroOperacion,
    tasaInteres,
    idCuentaPago,
    idUsuarioModificacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  refresh();
}

// Anular es mas delicado que operar dia a dia (cierra el pasivo por
// completo), por eso pide ADMIN igual que cambiarEstadoCuentaAction.
// El motivo es obligatorio (justificacion de la anulacion, ver
// MOTIVO_ANULACION/037_pasivo_anulacion.sql). SP_PASIVO_ANULAR ya se
// encarga de anular en cascada las cuotas pendientes/protestadas del
// pasivo (para no dejar una carga fantasma en Plan de pagos/Cuentas por
// pagar) y de recalcular el estado de la compra si la financiaba -- aca
// solo falta revalidar el proyecto afectado, si el pasivo tenia uno.
export async function anularPasivoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PASIVOS_APP_CODIGO, "ADMIN");

  const idPasivo = Number(formData.get("idPasivo"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;
  if (!idPasivo || !motivo) return;

  await anularPasivo(idPasivo, motivo, sesion.idUsuario);
  revalidatePath("/facturacion/pasivos");
  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  revalidatePath("/facturacion/pasivos/plan-de-pagos");
  revalidatePath("/facturacion/cuentas-por-pagar");
  if (idProyecto) revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function agregarCuotaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idPasivo = Number(formData.get("idPasivo"));
  const nroCuota = Number(formData.get("nroCuota"));
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const idCuentaPago = Number(formData.get("idCuentaPago") || 0) || null;

  if (!idPasivo || !nroCuota || !fechaVencimiento || !monto) return;

  await agregarCuota({
    idPasivo,
    nroCuota,
    fechaVencimiento,
    monto,
    idCuentaPago,
    idUsuarioCreacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  refresh();
}

export async function eliminarCuotaAction(formData: FormData): Promise<void> {
  await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idPasivo = Number(formData.get("idPasivo"));
  const idCuota = Number(formData.get("idCuota"));
  if (!idCuota) return;

  await eliminarCuota(idCuota);
  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  refresh();
}

// concepto llega armado desde la pagina de detalle (ya tiene numero de
// cuota y acreedor a mano), asi se evita una consulta extra aqui solo
// para redactar el texto del movimiento.
export async function pagarCuotaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idPasivo = Number(formData.get("idPasivo"));
  const idCuota = Number(formData.get("idCuota"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();

  if (!idCuota || !idCuenta || !fechaPago || !monto || !concepto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento: fechaPago,
    monto,
    concepto,
    tipoReferencia: "PASIVO_CUOTA",
    idReferencia: idCuota,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await marcarCuotaPagada(idCuota, movimiento.id_movimiento, idCuenta, fechaPago);

  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  revalidatePath("/facturacion/pasivos/plan-de-pagos");
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

export async function protestarCuotaAction(formData: FormData): Promise<void> {
  await requirePermiso(PASIVOS_APP_CODIGO, "ESCRITURA");

  const idPasivo = Number(formData.get("idPasivo"));
  const idCuota = Number(formData.get("idCuota"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  const fechaProtesto = String(formData.get("fechaProtesto") ?? "").trim();

  if (!idCuota || !motivo || !fechaProtesto) return;

  await protestarCuota(idCuota, motivo, fechaProtesto);
  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  revalidatePath("/facturacion/pasivos/plan-de-pagos");
  refresh();
}

export async function anularCuotaAction(formData: FormData): Promise<void> {
  await requirePermiso(PASIVOS_APP_CODIGO, "ADMIN");

  const idPasivo = Number(formData.get("idPasivo"));
  const idCuota = Number(formData.get("idCuota"));
  if (!idCuota) return;

  await anularCuota(idCuota);
  revalidatePath(`/facturacion/pasivos/${idPasivo}`);
  revalidatePath("/facturacion/pasivos/plan-de-pagos");
  refresh();
}
