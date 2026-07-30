import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { PasivoListadoRow, PasivoDetalleRow, PasivoCuotaRow, CuotaPendienteRow } from "@/types/db";

interface CrearPasivoParams {
  idTipoPasivo: number;
  idProveedor: number | null;
  idContacto: number | null;
  idUsuario: number | null;
  descripcion: string | null;
  nroOperacion: string | null;
  montoTotal: number;
  idMoneda: number;
  tipoCambio: number | null;
  tasaInteres: number | null;
  fechaOrigen: string;
  idCuentaPago: number | null;
  idUsuarioCreacion: number;
  tipoReferencia: string | null;
  idReferencia: number | null;
  idProyecto: number | null;
}

export async function crearPasivo(params: CrearPasivoParams): Promise<{ id_pasivo: number }> {
  const resultado = await callProcedureWithOut<{ id_pasivo: number | null }>(
    "SP_PASIVO_CREAR",
    [
      params.idTipoPasivo,
      params.idProveedor,
      params.idContacto,
      params.idUsuario,
      params.descripcion,
      params.nroOperacion,
      params.montoTotal,
      params.idMoneda,
      params.tipoCambio,
      params.tasaInteres,
      params.fechaOrigen,
      params.idCuentaPago,
      params.idUsuarioCreacion,
      params.tipoReferencia,
      params.idReferencia,
      params.idProyecto,
    ],
    ["id_pasivo"],
  );
  if (!resultado.id_pasivo) throw new Error("No se pudo crear el pasivo: falta elegir el acreedor.");
  return resultado as { id_pasivo: number };
}

export async function listarPasivos(idTipoPasivo: number | null = null, soloActivos = true): Promise<PasivoListadoRow[]> {
  return callProcedure<PasivoListadoRow>("SP_PASIVO_LISTAR", [idTipoPasivo, soloActivos ? 1 : 0]);
}

// Para la seccion "Pasivos" del detalle de un proyecto -- incluye
// anulados/cancelados (historial completo), a diferencia de listarPasivos.
export async function listarPasivosPorProyecto(idProyecto: number): Promise<PasivoListadoRow[]> {
  return callProcedure<PasivoListadoRow>("SP_PASIVO_LISTAR_POR_PROYECTO", [idProyecto]);
}

export async function obtenerPasivo(idPasivo: number): Promise<PasivoDetalleRow | null> {
  const rows = await callProcedure<PasivoDetalleRow>("SP_PASIVO_OBTENER", [idPasivo]);
  return rows[0] ?? null;
}

interface ActualizarPasivoParams {
  idPasivo: number;
  idProveedor: number | null;
  idContacto: number | null;
  idUsuario: number | null;
  descripcion: string | null;
  nroOperacion: string | null;
  tasaInteres: number | null;
  idCuentaPago: number | null;
  idUsuarioModificacion: number;
}

export async function actualizarPasivo(params: ActualizarPasivoParams): Promise<void> {
  await callProcedure("SP_PASIVO_ACTUALIZAR", [
    params.idPasivo,
    params.idProveedor,
    params.idContacto,
    params.idUsuario,
    params.descripcion,
    params.nroOperacion,
    params.tasaInteres,
    params.idCuentaPago,
    params.idUsuarioModificacion,
  ]);
}

export async function anularPasivo(idPasivo: number, motivo: string, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_PASIVO_ANULAR", [idPasivo, motivo, idUsuarioModificacion]);
}

interface AgregarCuotaParams {
  idPasivo: number;
  nroCuota: number;
  fechaVencimiento: string;
  monto: number;
  idCuentaPago: number | null;
  idUsuarioCreacion: number;
}

export async function agregarCuota(params: AgregarCuotaParams): Promise<{ id_cuota: number }> {
  return callProcedureWithOut<{ id_cuota: number }>(
    "SP_PASIVO_CUOTA_AGREGAR",
    [
      params.idPasivo,
      params.nroCuota,
      params.fechaVencimiento,
      params.monto,
      params.idCuentaPago,
      params.idUsuarioCreacion,
    ],
    ["id_cuota"],
  );
}

export async function listarCuotas(idPasivo: number): Promise<PasivoCuotaRow[]> {
  return callProcedure<PasivoCuotaRow>("SP_PASIVO_CUOTA_LISTAR", [idPasivo]);
}

export async function eliminarCuota(idCuota: number): Promise<void> {
  await callProcedure("SP_PASIVO_CUOTA_ELIMINAR", [idCuota]);
}

export async function marcarCuotaPagada(
  idCuota: number,
  idMovimiento: number,
  idCuentaPago: number,
  fechaPago: string,
): Promise<void> {
  await callProcedure("SP_PASIVO_CUOTA_MARCAR_PAGADA", [idCuota, idMovimiento, idCuentaPago, fechaPago]);
}

export async function protestarCuota(idCuota: number, motivo: string, fechaProtesto: string): Promise<void> {
  await callProcedure("SP_PASIVO_CUOTA_PROTESTAR", [idCuota, motivo, fechaProtesto]);
}

export async function anularCuota(idCuota: number): Promise<void> {
  await callProcedure("SP_PASIVO_CUOTA_ANULAR", [idCuota]);
}

export async function listarCuotasPendientes(): Promise<CuotaPendienteRow[]> {
  return callProcedure<CuotaPendienteRow>("SP_PASIVO_CUOTA_LISTAR_PENDIENTES", []);
}
