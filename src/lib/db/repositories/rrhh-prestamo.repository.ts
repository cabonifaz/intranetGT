import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { PrestamoListadoRow, PrestamoRow, PrestamoCuotaRow, PrestamoCuotaAplicableRow } from "@/types/db";

export async function listarPrestamos(idUsuario: number | null): Promise<PrestamoListadoRow[]> {
  return callProcedure<PrestamoListadoRow>("SP_RRHH_PRESTAMO_LISTAR", [idUsuario]);
}

export async function obtenerPrestamo(idPrestamo: number): Promise<PrestamoRow | null> {
  const rows = await callProcedure<PrestamoRow>("SP_RRHH_PRESTAMO_OBTENER", [idPrestamo]);
  return rows[0] ?? null;
}

interface CrearPrestamoParams {
  idUsuario: number;
  idTipoPrestamo: number;
  montoTotal: number;
  idMoneda: number;
  tipoCambio: number | null;
  descripcion: string | null;
  fechaOrigen: string;
  idCuentaDesembolso: number | null;
  idUsuarioCreacion: number;
}

export async function crearPrestamo(params: CrearPrestamoParams): Promise<{ id_prestamo: number }> {
  const resultado = await callProcedureWithOut<{ id_prestamo: number | null }>(
    "SP_RRHH_PRESTAMO_CREAR",
    [
      params.idUsuario,
      params.idTipoPrestamo,
      params.montoTotal,
      params.idMoneda,
      params.tipoCambio,
      params.descripcion,
      params.fechaOrigen,
      params.idCuentaDesembolso,
      params.idUsuarioCreacion,
    ],
    ["id_prestamo"],
  );
  if (!resultado.id_prestamo) throw new Error("No se pudo crear el prestamo.");
  return resultado as { id_prestamo: number };
}

export async function asignarMovimientoDesembolso(idPrestamo: number, idMovimiento: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_ASIGNAR_MOVIMIENTO", [idPrestamo, idMovimiento]);
}

export async function registrarFirmaPrestamo(idPrestamo: number, documentoPath: string, idUsuario: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_REGISTRAR_FIRMA", [idPrestamo, documentoPath, idUsuario]);
}

export async function anularPrestamo(idPrestamo: number, motivo: string, idUsuario: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_ANULAR", [idPrestamo, motivo, idUsuario]);
}

export async function agregarCuotaPrestamo(params: {
  idPrestamo: number;
  nroCuota: number;
  anio: number;
  mes: number;
  monto: number;
  calculoAutomatico: boolean;
  idUsuarioCreacion: number;
}): Promise<{ id_cuota: number | null }> {
  return callProcedureWithOut<{ id_cuota: number | null }>(
    "SP_RRHH_PRESTAMO_CUOTA_AGREGAR",
    [
      params.idPrestamo,
      params.nroCuota,
      params.anio,
      params.mes,
      params.monto,
      params.calculoAutomatico ? 1 : 0,
      params.idUsuarioCreacion,
    ],
    ["id_cuota"],
  );
}

export async function listarCuotasPrestamo(idPrestamo: number): Promise<PrestamoCuotaRow[]> {
  return callProcedure<PrestamoCuotaRow>("SP_RRHH_PRESTAMO_CUOTA_LISTAR", [idPrestamo]);
}

export async function actualizarCuotaPrestamo(idCuota: number, anio: number, mes: number, monto: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_CUOTA_ACTUALIZAR", [idCuota, anio, mes, monto]);
}

export async function eliminarCuotaPrestamo(idCuota: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_CUOTA_ELIMINAR", [idCuota]);
}

export async function listarCuotasPendientesDelPeriodo(idUsuario: number, anio: number, mes: number): Promise<PrestamoCuotaAplicableRow[]> {
  return callProcedure<PrestamoCuotaAplicableRow>("SP_RRHH_PRESTAMO_CUOTA_PENDIENTES_DEL_PERIODO_LISTAR", [idUsuario, anio, mes]);
}

export async function vincularCuotaADetalle(idCuota: number, idPlanillaDetalle: number, montoDescontadoSoles: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_CUOTA_VINCULAR_DETALLE", [idCuota, idPlanillaDetalle, montoDescontadoSoles]);
}

export async function listarCuotasDelDetalle(idPlanillaDetalle: number): Promise<PrestamoCuotaAplicableRow[]> {
  return callProcedure<PrestamoCuotaAplicableRow>("SP_RRHH_PRESTAMO_CUOTA_LISTAR_DEL_DETALLE", [idPlanillaDetalle]);
}
