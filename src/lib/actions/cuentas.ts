"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  crearCuenta,
  actualizarCuenta,
  cambiarEstadoCuenta,
  registrarMovimientoCuenta,
  eliminarMovimientoCuenta,
  obtenerIdTipoMovimientoEgreso,
} from "@/lib/db/repositories/cuenta.repository";

const CUENTAS_APP_CODIGO = "CUENTAS_EMPRESA";

// ID_BANCO/ID_MONEDA/NRO_CUENTA/CCI solo tienen sentido para
// BANCARIA/DETRACCIONES -- el formulario los omite para IGV_FAVOR/RENTA_FAVOR,
// por eso vienen null aqui sin validacion extra por tipo.
export async function crearCuentaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CUENTAS_APP_CODIGO, "ESCRITURA");

  const idTipoCuenta = Number(formData.get("idTipoCuenta"));
  const idBanco = Number(formData.get("idBanco") || 0) || null;
  const idMoneda = Number(formData.get("idMoneda") || 0) || null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nroCuenta = String(formData.get("nroCuenta") ?? "").trim() || null;
  const cci = String(formData.get("cci") ?? "").trim() || null;
  const saldoInicialRaw = String(formData.get("saldoInicial") ?? "").trim();
  const saldoInicial = saldoInicialRaw ? Number(saldoInicialRaw) : 0;

  if (!idTipoCuenta || !nombre) return;

  const resultado = await crearCuenta({
    idTipoCuenta,
    idBanco,
    idMoneda,
    nombre,
    nroCuenta,
    cci,
    saldoInicial,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/facturacion/cuentas");
  redirect(`/facturacion/cuentas/${resultado.id_cuenta}`);
}

export async function actualizarCuentaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CUENTAS_APP_CODIGO, "ESCRITURA");

  const idCuenta = Number(formData.get("idCuenta"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const nroCuenta = String(formData.get("nroCuenta") ?? "").trim() || null;
  const cci = String(formData.get("cci") ?? "").trim() || null;

  if (!idCuenta || !nombre) return;

  await actualizarCuenta({ idCuenta, nombre, nroCuenta, cci, idUsuarioModificacion: sesion.idUsuario });
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

// Desactivar una cuenta es mas delicado que operarla dia a dia (deja de
// aparecer para registrar movimientos nuevos), por eso pide ADMIN y no
// solo ESCRITURA.
export async function cambiarEstadoCuentaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CUENTAS_APP_CODIGO, "ADMIN");

  const idCuenta = Number(formData.get("idCuenta"));
  const activo = formData.get("activo") === "1";
  if (!idCuenta) return;

  await cambiarEstadoCuenta(idCuenta, activo, sesion.idUsuario);
  revalidatePath("/facturacion/cuentas");
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

// idContratoReferencia es opcional: si se elige, el movimiento queda
// vinculado a ese contrato de RRHH (ej. el egreso que paga su planilla/
// honorario). Cuando existan los modulos de compras/tareas, se sumaran
// mas opciones de vinculo del mismo modo (TIPO_REFERENCIA propio).
export async function registrarMovimientoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CUENTAS_APP_CODIGO, "ESCRITURA");

  const idCuenta = Number(formData.get("idCuenta"));
  const idTipoMovimiento = Number(formData.get("idTipoMovimiento"));
  const fechaMovimiento = String(formData.get("fechaMovimiento") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();
  const idContratoReferencia = Number(formData.get("idContratoReferencia") || 0) || null;

  if (!idCuenta || !idTipoMovimiento || !fechaMovimiento || !monto || !concepto) return;

  await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento,
    monto,
    concepto,
    tipoReferencia: idContratoReferencia ? "RRHH_CONTRATO" : null,
    idReferencia: idContratoReferencia,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

// Descuenta (EGRESO) el saldo a favor de IGV -- ver "IGV pendiente de
// declarar" en el detalle de la cuenta IGV_FAVOR. El monto sugerido ya
// viene topado al saldo disponible (calcularIgvConsolidado + Math.min
// contra SALDO_ACTUAL en la pagina), pero se deja editable aca -- el
// usuario es quien sabe cuanto corresponde a la declaracion del mes
// (PROYECTO_HITO no tiene concepto de periodo/declaracion, asi que el
// total mostrado es acumulado historico, no solo "lo de este mes").
export async function aplicarSaldoIgvFavorAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(CUENTAS_APP_CODIGO, "ESCRITURA");

  const idCuenta = Number(formData.get("idCuenta"));
  const fechaMovimiento = String(formData.get("fechaMovimiento") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;

  if (!idCuenta || !fechaMovimiento || !monto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento,
    monto,
    concepto: `Aplicacion de saldo a favor de IGV - declaracion ${fechaMovimiento}`,
    tipoReferencia: null,
    idReferencia: null,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

export async function eliminarMovimientoAction(formData: FormData): Promise<void> {
  await requirePermiso(CUENTAS_APP_CODIGO, "ESCRITURA");

  const idCuenta = Number(formData.get("idCuenta"));
  const idMovimiento = Number(formData.get("idMovimiento"));
  if (!idMovimiento) return;

  await eliminarMovimientoCuenta(idMovimiento);
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}
