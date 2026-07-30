import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { ContratoPeriodoPagoRow, PeriodoPagoPendienteRow } from "@/types/db";

export async function agregarPeriodoPago(
  idContrato: number,
  periodo: string,
  monto: number,
  idUsuarioCreacion: number,
): Promise<{ id_periodo_pago: number | null }> {
  return callProcedureWithOut<{ id_periodo_pago: number | null }>(
    "SP_RRHH_CONTRATO_PERIODO_PAGO_AGREGAR",
    [idContrato, periodo, monto, idUsuarioCreacion],
    ["id_periodo_pago"],
  );
}

export async function listarPeriodosPago(idContrato: number): Promise<ContratoPeriodoPagoRow[]> {
  return callProcedure<ContratoPeriodoPagoRow>("SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR", [idContrato]);
}

// Cross-contrato -- para dejar elegir un periodo ya cargado (con su
// monto) al agregar mano de obra manual en Proyectos.
export async function listarTodosLosPeriodosPago(): Promise<ContratoPeriodoPagoRow[]> {
  return callProcedure<ContratoPeriodoPagoRow>("SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_TODOS", []);
}

export async function actualizarPeriodoPago(idPeriodoPago: number, periodo: string, monto: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_PERIODO_PAGO_ACTUALIZAR", [idPeriodoPago, periodo, monto]);
}

export async function eliminarPeriodoPago(idPeriodoPago: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_PERIODO_PAGO_ELIMINAR", [idPeriodoPago]);
}

export async function marcarPeriodoPagoPagado(idPeriodoPago: number, idMovimiento: number, fechaPago: string): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_PERIODO_PAGO_MARCAR_PAGADA", [idPeriodoPago, idMovimiento, fechaPago]);
}

export async function listarPeriodosPagoPendientes(): Promise<PeriodoPagoPendienteRow[]> {
  return callProcedure<PeriodoPagoPendienteRow>("SP_RRHH_CONTRATO_PERIODO_PAGO_LISTAR_PENDIENTES", []);
}
