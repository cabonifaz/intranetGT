"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  crearPagoRecurrente,
  obtenerPagoRecurrente,
  actualizarPagoRecurrente,
  cambiarEstadoPagoRecurrente,
  agregarInstancia,
  listarInstancias,
  actualizarInstancia,
  eliminarInstancia,
  marcarInstanciaPagada,
} from "@/lib/db/repositories/pago-recurrente.repository";
import { registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";
import { generarInstanciasPendientes } from "@/lib/pagos-recurrentes/generar-instancias";

const PAGOS_RECURRENTES_APP_CODIGO = "PAGOS_RECURRENTES";

export async function crearPagoRecurrenteAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const esVariable = formData.get("esVariable") === "1";
  const montoFijoRaw = String(formData.get("montoFijo") ?? "").trim();
  const montoFijo = !esVariable && montoFijoRaw ? Number(montoFijoRaw) : null;
  const idMoneda = Number(formData.get("idMoneda"));
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;
  const intervaloMeses = Number(formData.get("intervaloMeses") || 1);
  const diaVencimiento = Number(formData.get("diaVencimiento"));
  const fechaInicio = String(formData.get("fechaInicio") ?? "").trim();
  const fechaFin = String(formData.get("fechaFin") ?? "").trim() || null;
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;
  const idCuentaPagoDefault = Number(formData.get("idCuentaPagoDefault") || 0) || null;

  if (!nombre || !idMoneda || !intervaloMeses || !diaVencimiento || !fechaInicio) return;
  if (!esVariable && !montoFijo) return;

  const resultado = await crearPagoRecurrente({
    nombre,
    descripcion,
    esVariable,
    montoFijo,
    idMoneda,
    tipoCambio,
    intervaloMeses,
    diaVencimiento,
    fechaInicio,
    fechaFin,
    idProyecto,
    idCuentaPagoDefault,
    idUsuarioCreacion: sesion.idUsuario,
  });

  if (!resultado.id_pago_recurrente) return;

  revalidatePath("/facturacion/pagos-recurrentes");
  redirect(`/facturacion/pagos-recurrentes/${resultado.id_pago_recurrente}`);
}

// Moneda, TC y proyecto no se editan una vez creado (ver SP_PAGO_RECURRENTE_ACTUALIZAR).
export async function actualizarPagoRecurrenteAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const esVariable = formData.get("esVariable") === "1";
  const montoFijoRaw = String(formData.get("montoFijo") ?? "").trim();
  const montoFijo = !esVariable && montoFijoRaw ? Number(montoFijoRaw) : null;
  const intervaloMeses = Number(formData.get("intervaloMeses") || 1);
  const diaVencimiento = Number(formData.get("diaVencimiento"));
  const fechaFin = String(formData.get("fechaFin") ?? "").trim() || null;
  const idCuentaPagoDefault = Number(formData.get("idCuentaPagoDefault") || 0) || null;

  if (!idPagoRecurrente || !nombre || !intervaloMeses || !diaVencimiento) return;
  if (!esVariable && !montoFijo) return;

  await actualizarPagoRecurrente({
    idPagoRecurrente,
    nombre,
    descripcion,
    esVariable,
    montoFijo,
    intervaloMeses,
    diaVencimiento,
    fechaFin,
    idCuentaPagoDefault,
    idUsuarioModificacion: sesion.idUsuario,
  });

  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  refresh();
}

export async function cambiarEstadoPagoRecurrenteAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  const activo = formData.get("activo") === "1";
  if (!idPagoRecurrente) return;

  await cambiarEstadoPagoRecurrente(idPagoRecurrente, activo, sesion.idUsuario);
  revalidatePath("/facturacion/pagos-recurrentes");
  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  refresh();
}

// Version manual/a demanda de asegurarInstanciasGeneradasDelDia() (ver
// src/lib/pagos-recurrentes/auto-generar.ts, que ya corre esto solo una
// vez al dia para TODOS los pagos activos desde facturacion/layout.tsx)
// -- para forzar un chequeo inmediato de un pago puntual sin esperar a
// la proxima visita del dia, ej. justo despues de crearlo. Genera una
// instancia por cada periodo (cada INTERVALO_MESES meses) entre
// FECHA_INICIO y hoy/FECHA_FIN, saltando los que ya existen -- mismo
// patron que generarPeriodosPendientesAction de RRHH. Si el pago es
// ES_VARIABLE, se genera con MONTO=0 como placeholder -- el monto real
// se carga despues por fila con actualizarInstanciaAction (ver
// EditarInstanciaPagoRecurrenteFila.tsx), antes de pagarla.
export async function generarInstanciasPendientesAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  if (!idPagoRecurrente) return;

  const pago = await obtenerPagoRecurrente(idPagoRecurrente);
  if (!pago || pago.ESTADO_CODIGO !== "ACTIVO") return;

  const instanciasActuales = await listarInstancias(idPagoRecurrente);
  const montoSugerido = pago.ES_VARIABLE ? 0 : Number(pago.MONTO_FIJO ?? 0);

  const pendientes = generarInstanciasPendientes(
    pago.FECHA_INICIO,
    pago.FECHA_FIN,
    pago.INTERVALO_MESES,
    pago.DIA_VENCIMIENTO,
    instanciasActuales.map((i) => i.PERIODO),
  );

  for (const instancia of pendientes) {
    await agregarInstancia(idPagoRecurrente, instancia.periodo, instancia.fechaVencimiento, montoSugerido, null, sesion.idUsuario);
  }

  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  refresh();
}

// Agregar una instancia suelta a mano (ej. un periodo fuera del
// calendario regular, o corregir uno que "Generar" no cubrio).
export async function agregarInstanciaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  const periodo = String(formData.get("periodo") ?? "").trim();
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const idCuentaPago = Number(formData.get("idCuentaPago") || 0) || null;

  if (!idPagoRecurrente || !periodo || !fechaVencimiento) return;

  await agregarInstancia(idPagoRecurrente, periodo, fechaVencimiento, monto, idCuentaPago, sesion.idUsuario);
  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  refresh();
}

export async function actualizarInstanciaAction(formData: FormData): Promise<void> {
  await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  const idInstancia = Number(formData.get("idInstancia"));
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const idCuentaPago = Number(formData.get("idCuentaPago") || 0) || null;

  if (!idInstancia || !monto) return;

  await actualizarInstancia(idInstancia, monto, idCuentaPago);
  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  refresh();
}

export async function eliminarInstanciaAction(formData: FormData): Promise<void> {
  await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  const idInstancia = Number(formData.get("idInstancia"));
  if (!idInstancia) return;

  await eliminarInstancia(idInstancia);
  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  refresh();
}

// Mismo flujo de dos pasos que pagarHorasContratoAction/pagarPeriodoContratoAction.
// idProyecto es opcional -- solo se llena cuando el pago recurrente esta
// linkeado a un proyecto, para revalidar tambien su Costeo/Movimientos.
export async function pagarInstanciaAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PAGOS_RECURRENTES_APP_CODIGO, "ESCRITURA");

  const idPagoRecurrente = Number(formData.get("idPagoRecurrente"));
  const idInstancia = Number(formData.get("idInstancia"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;

  if (!idInstancia || !idCuenta || !fechaPago || !monto || !concepto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento: fechaPago,
    monto,
    concepto,
    tipoReferencia: "PAGO_RECURRENTE_INSTANCIA",
    idReferencia: idInstancia,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await marcarInstanciaPagada(idInstancia, movimiento.id_movimiento, fechaPago);

  revalidatePath(`/facturacion/pagos-recurrentes/${idPagoRecurrente}`);
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  if (idProyecto) revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}
