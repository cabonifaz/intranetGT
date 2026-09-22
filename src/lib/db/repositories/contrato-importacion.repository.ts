import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { ContratoImportacionRow, ContratoImportacionPendienteRow } from "@/types/db";

export interface CrearImportacionParams {
  idUsuario: number;
  idTipoContrato: number;
  idTipoPagoLocador: number | null;
  cargo: string;
  fechaInicio: string;
  fechaFin: string | null;
  diasLaborales: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  tarifa: number | null;
  idMoneda: number | null;
  tipoCambio: number | null;
  periodoPago: string | null;
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  documentoEscaneadoPath: string;
  datosExtraidosJson: string | null;
  advertenciasExtraccion: string | null;
  idUsuarioCarga: number;
}

export async function crearImportacionContrato(params: CrearImportacionParams): Promise<{ id_contrato: number }> {
  const resultado = await callProcedureWithOut<{ id_contrato: number | null }>(
    "SP_RRHH_CONTRATO_IMPORTACION_CREAR",
    [
      params.idUsuario,
      params.idTipoContrato,
      params.idTipoPagoLocador,
      params.cargo,
      params.fechaInicio,
      params.fechaFin,
      params.diasLaborales,
      params.horaInicio,
      params.horaFin,
      params.tarifa,
      params.idMoneda,
      params.tipoCambio,
      params.periodoPago,
      params.nroCuenta,
      params.cci,
      params.banco,
      params.documentoEscaneadoPath,
      params.datosExtraidosJson,
      params.advertenciasExtraccion,
      params.idUsuarioCarga,
    ],
    ["id_contrato"],
  );
  if (!resultado.id_contrato) throw new Error("No se pudo crear el contrato importado.");
  return resultado as { id_contrato: number };
}

export async function obtenerImportacionContrato(idContrato: number): Promise<ContratoImportacionRow | null> {
  const rows = await callProcedure<ContratoImportacionRow>("SP_RRHH_CONTRATO_IMPORTACION_OBTENER", [idContrato]);
  return rows[0] ?? null;
}

export async function listarImportacionesPendientes(): Promise<ContratoImportacionPendienteRow[]> {
  return callProcedure<ContratoImportacionPendienteRow>("SP_RRHH_CONTRATO_IMPORTACION_LISTAR_PENDIENTES", []);
}

export interface ConfirmarImportacionParams {
  idContrato: number;
  idUsuario: number;
  idTipoContrato: number;
  idTipoPagoLocador: number | null;
  cargo: string;
  fechaInicio: string;
  fechaFin: string | null;
  diasLaborales: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  tarifa: number | null;
  idMoneda: number | null;
  tipoCambio: number | null;
  periodoPago: string | null;
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  fechaFirma: string | null;
  idUsuarioConfirmacion: number;
}

export async function confirmarImportacionContrato(params: ConfirmarImportacionParams): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_IMPORTACION_CONFIRMAR", [
    params.idContrato,
    params.idUsuario,
    params.idTipoContrato,
    params.idTipoPagoLocador,
    params.cargo,
    params.fechaInicio,
    params.fechaFin,
    params.diasLaborales,
    params.horaInicio,
    params.horaFin,
    params.tarifa,
    params.idMoneda,
    params.tipoCambio,
    params.periodoPago,
    params.nroCuenta,
    params.cci,
    params.banco,
    params.fechaFirma,
    params.idUsuarioConfirmacion,
  ]);
}
