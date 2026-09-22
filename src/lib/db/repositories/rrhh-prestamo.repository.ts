import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { PrestamoListadoRow, PrestamoRow, PrestamoCuotaRow, PrestamoCuotaAplicableRow } from "@/types/db";

export async function listarPrestamos(idUsuario: number | null): Promise<PrestamoListadoRow[]> {
  return callProcedure<PrestamoListadoRow>("SP_RRHH_PRESTAMO_LISTAR", [idUsuario]);
}

export async function obtenerPrestamo(idPrestamo: number): Promise<PrestamoRow | null> {
  const rows = await callProcedure<PrestamoRow>("SP_RRHH_PRESTAMO_OBTENER", [idPrestamo]);
  return rows[0] ?? null;
}

// Beneficiario: exactamente uno de idUsuario/idContacto (nunca ambos ni
// ninguno) -- lo valida el SP, ver SP_RRHH_PRESTAMO_CREAR.
interface CrearPrestamoParams {
  idUsuario: number | null;
  idContacto: number | null;
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
      params.idContacto,
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

export interface SolicitarPrestamoParams {
  idUsuario: number | null;
  idContacto: number | null;
  idTipoPrestamo: number;
  montoTotal: number;
  idMoneda: number;
  descripcion: string | null;
  // Cronograma propuesto -- solo para PRESTAMO, null para ADELANTO_SUELDO
  // (una sola cuota, cronograma lo define RRHH al otorgar).
  nroCuotas: number | null;
  anioInicio: number | null;
  mesInicio: number | null;
  idUsuarioCreacion: number;
}

export async function solicitarPrestamo(params: SolicitarPrestamoParams): Promise<{ id_prestamo: number }> {
  const resultado = await callProcedureWithOut<{ id_prestamo: number | null }>(
    "SP_RRHH_PRESTAMO_SOLICITAR",
    [
      params.idUsuario,
      params.idContacto,
      params.idTipoPrestamo,
      params.montoTotal,
      params.idMoneda,
      params.descripcion,
      params.nroCuotas,
      params.anioInicio,
      params.mesInicio,
      params.idUsuarioCreacion,
    ],
    ["id_prestamo"],
  );
  if (!resultado.id_prestamo) throw new Error("No se pudo registrar la solicitud.");
  return resultado as { id_prestamo: number };
}

export async function otorgarPrestamo(
  idPrestamo: number,
  fechaOrigen: string,
  tipoCambio: number | null,
  idCuentaDesembolso: number | null,
): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_OTORGAR", [idPrestamo, fechaOrigen, tipoCambio, idCuentaDesembolso]);
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

// Solo aplica a prestamos con beneficiario CONTACTO (sin planilla de
// donde descontar) -- ver SP_RRHH_PRESTAMO_CUOTA_MARCAR_PAGADA_MANUAL.
export async function marcarCuotaPagadaManual(idCuota: number): Promise<void> {
  await callProcedure("SP_RRHH_PRESTAMO_CUOTA_MARCAR_PAGADA_MANUAL", [idCuota]);
}
