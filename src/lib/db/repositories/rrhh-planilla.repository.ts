import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  PlanillaMensualRow,
  PlanillaDetalleListadoRow,
  PlanillaDetalleRow,
  PlanillaDetalleHorasRow,
  PlanillaContratoElegibleRow,
  PlanillaContratoHorasDelPeriodoRow,
  PlanillaAcumuladoAnioRow,
} from "@/types/db";

export async function listarContratosElegibles(): Promise<PlanillaContratoElegibleRow[]> {
  return callProcedure<PlanillaContratoElegibleRow>("SP_RRHH_PLANILLA_CONTRATO_ELEGIBLE_LISTAR", []);
}

export async function listarHorasDelPeriodo(idContrato: number, periodo: string): Promise<PlanillaContratoHorasDelPeriodoRow[]> {
  return callProcedure<PlanillaContratoHorasDelPeriodoRow>("SP_RRHH_PLANILLA_CONTRATO_HORAS_DEL_PERIODO_LISTAR", [idContrato, periodo]);
}

export async function obtenerAcumuladoAnio(idContrato: number, anio: number, mesHasta: number): Promise<PlanillaAcumuladoAnioRow> {
  const rows = await callProcedure<PlanillaAcumuladoAnioRow>("SP_RRHH_PLANILLA_CONTRATO_ACUMULADO_ANIO", [idContrato, anio, mesHasta]);
  return rows[0] ?? ({ BRUTO_ACUMULADO: "0", RETENCION_ACUMULADA: "0" } as PlanillaAcumuladoAnioRow);
}

export async function obtenerOCrearPlanillaMensual(anio: number, mes: number, periodo: string, idUsuarioCreacion: number): Promise<{ id_planilla_mensual: number }> {
  const resultado = await callProcedureWithOut<{ id_planilla_mensual: number | null }>(
    "SP_RRHH_PLANILLA_MENSUAL_OBTENER_O_CREAR",
    [anio, mes, periodo, idUsuarioCreacion],
    ["id_planilla_mensual"],
  );
  if (!resultado.id_planilla_mensual) throw new Error("No se pudo obtener/crear la planilla mensual.");
  return resultado as { id_planilla_mensual: number };
}

export async function listarPlanillasMensuales(): Promise<PlanillaMensualRow[]> {
  return callProcedure<PlanillaMensualRow>("SP_RRHH_PLANILLA_MENSUAL_LISTAR", []);
}

export async function obtenerPlanillaMensual(idPlanillaMensual: number): Promise<PlanillaMensualRow | null> {
  const rows = await callProcedure<PlanillaMensualRow>("SP_RRHH_PLANILLA_MENSUAL_OBTENER", [idPlanillaMensual]);
  return rows[0] ?? null;
}

export async function emitirPlanillaMensual(idPlanillaMensual: number, idUsuarioEmision: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_MENSUAL_EMITIR", [idPlanillaMensual, idUsuarioEmision]);
}

interface AgregarDetalleParams {
  idPlanillaMensual: number;
  idContrato: number;
  tipoReferencia: string | null;
  idReferencia: number | null;
  montoBruto: number;
  montoAportePension: number | null;
  montoRetencionRenta: number | null;
  montoEssalud: number | null;
  montoNeto: number;
  idSistemaPensionAplicado: number | null;
  idAfpFondoAplicado: number | null;
  idParametroAplicado: number | null;
  idUsuarioCreacion: number;
}

export async function agregarDetalle(params: AgregarDetalleParams): Promise<{ id_planilla_detalle: number | null }> {
  return callProcedureWithOut<{ id_planilla_detalle: number | null }>(
    "SP_RRHH_PLANILLA_DETALLE_AGREGAR",
    [
      params.idPlanillaMensual,
      params.idContrato,
      params.tipoReferencia,
      params.idReferencia,
      params.montoBruto,
      params.montoAportePension,
      params.montoRetencionRenta,
      params.montoEssalud,
      params.montoNeto,
      params.idSistemaPensionAplicado,
      params.idAfpFondoAplicado,
      params.idParametroAplicado,
      params.idUsuarioCreacion,
    ],
    ["id_planilla_detalle"],
  );
}

export async function vincularHoras(idPlanillaDetalle: number, idContratoHoras: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_HORAS_VINCULAR", [idPlanillaDetalle, idContratoHoras]);
}

export async function listarHorasDelDetalle(idPlanillaDetalle: number): Promise<PlanillaDetalleHorasRow[]> {
  return callProcedure<PlanillaDetalleHorasRow>("SP_RRHH_PLANILLA_DETALLE_HORAS_LISTAR", [idPlanillaDetalle]);
}

export async function listarDetalle(idPlanillaMensual: number): Promise<PlanillaDetalleListadoRow[]> {
  return callProcedure<PlanillaDetalleListadoRow>("SP_RRHH_PLANILLA_DETALLE_LISTAR", [idPlanillaMensual]);
}

export async function obtenerDetalle(idPlanillaDetalle: number): Promise<PlanillaDetalleRow | null> {
  const rows = await callProcedure<PlanillaDetalleRow>("SP_RRHH_PLANILLA_DETALLE_OBTENER", [idPlanillaDetalle]);
  return rows[0] ?? null;
}

interface ActualizarMontosParams {
  idPlanillaDetalle: number;
  montoBruto: number;
  montoAportePension: number | null;
  montoRetencionRenta: number | null;
  montoEssalud: number | null;
  montoNeto: number;
  calculoAutomatico: boolean;
}

export async function actualizarMontosDetalle(params: ActualizarMontosParams): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_ACTUALIZAR_MONTOS", [
    params.idPlanillaDetalle,
    params.montoBruto,
    params.montoAportePension,
    params.montoRetencionRenta,
    params.montoEssalud,
    params.montoNeto,
    params.calculoAutomatico ? 1 : 0,
  ]);
}

export async function marcarPagadoDetalle(idPlanillaDetalle: number, pagado: boolean, idUsuario: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_MARCAR_PAGADO", [idPlanillaDetalle, pagado ? 1 : 0, idUsuario]);
}

export async function marcarPagadoMasivo(idPlanillaMensual: number, pagado: boolean, idUsuario: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_MARCAR_PAGADO_MASIVO", [idPlanillaMensual, pagado ? 1 : 0, idUsuario]);
}

export async function emitirDetalle(idPlanillaDetalle: number, documentoPath: string, idUsuarioEmision: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_EMITIR", [idPlanillaDetalle, documentoPath, idUsuarioEmision]);
}

export async function regenerarDocumentoDetalle(idPlanillaDetalle: number, documentoPath: string): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_REGENERAR_DOCUMENTO", [idPlanillaDetalle, documentoPath]);
}

export async function eliminarDetalle(idPlanillaDetalle: number): Promise<void> {
  await callProcedure("SP_RRHH_PLANILLA_DETALLE_ELIMINAR", [idPlanillaDetalle]);
}
