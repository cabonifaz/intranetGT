import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  ContratoConceptoRow,
  ContratoDetalleRow,
  ContratoHorasRow,
  ContratoHorasTodosRow,
  ContratoListadoRow,
  ContratoProyectoRow,
  HorasPendienteRow,
} from "@/types/db";

interface CrearContratoParams {
  idUsuario: number;
  idTipoContrato: number;
  idTipoPagoLocador: number | null;
  cargo: string;
  funciones: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  diasLaborales: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  notaJornada: string | null;
  tarifa: number | null;
  idMoneda: number | null;
  tipoCambio: number | null;
  idProyecto: number | null;
  periodoPago: string | null;
  idUsuarioCreacion: number;
}

export async function crearContrato(params: CrearContratoParams): Promise<{ id_contrato: number }> {
  const resultado = await callProcedureWithOut<{ id_contrato: number | null }>(
    "SP_RRHH_CONTRATO_CREAR",
    [
      params.idUsuario,
      params.idTipoContrato,
      params.idTipoPagoLocador,
      params.cargo,
      params.funciones,
      params.fechaInicio,
      params.fechaFin,
      params.diasLaborales,
      params.horaInicio,
      params.horaFin,
      params.notaJornada,
      params.tarifa,
      params.idMoneda,
      params.tipoCambio,
      params.idProyecto,
      params.periodoPago,
      params.idUsuarioCreacion,
    ],
    ["id_contrato"],
  );
  if (!resultado.id_contrato) throw new Error("No se pudo crear el contrato: falta elegir el proyecto/servicio.");
  return resultado as { id_contrato: number };
}

export async function listarContratos(
  idEstadoContrato: number | null = null,
  soloPorVencerDias: number | null = null,
): Promise<ContratoListadoRow[]> {
  return callProcedure<ContratoListadoRow>("SP_RRHH_CONTRATO_LISTAR", [idEstadoContrato, soloPorVencerDias]);
}

export async function obtenerContrato(idContrato: number): Promise<ContratoDetalleRow | null> {
  const rows = await callProcedure<ContratoDetalleRow>("SP_RRHH_CONTRATO_OBTENER", [idContrato]);
  return rows[0] ?? null;
}

export async function obtenerContratoPorToken(token: string): Promise<ContratoDetalleRow | null> {
  const rows = await callProcedure<ContratoDetalleRow>("SP_RRHH_CONTRATO_OBTENER_POR_TOKEN", [token]);
  return rows[0] ?? null;
}

export async function generarLinkContrato(idContrato: number, token: string, tokenExpira: Date): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_GENERAR_LINK", [idContrato, token, tokenExpira]);
}

interface FirmarContratoParams {
  idContrato: number;
  nroCuenta: string | null;
  cci: string | null;
  banco: string | null;
  firmaPngPath: string;
  documentoPath: string;
}

export async function firmarContrato(params: FirmarContratoParams): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_FIRMAR", [
    params.idContrato,
    params.nroCuenta,
    params.cci,
    params.banco,
    params.firmaPngPath,
    params.documentoPath,
  ]);
}

export async function renovarContrato(
  idContratoAnterior: number,
  fechaInicio: string,
  fechaFin: string | null,
): Promise<{ id_contrato_nuevo: number }> {
  return callProcedureWithOut<{ id_contrato_nuevo: number }>(
    "SP_RRHH_CONTRATO_RENOVAR",
    [idContratoAnterior, fechaInicio, fechaFin],
    ["id_contrato_nuevo"],
  );
}

export async function actualizarFuncionesContrato(idContrato: number, funciones: string | null): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_ACTUALIZAR_FUNCIONES", [idContrato, funciones]);
}

// Borrado real, solo mientras el contrato sigue BORRADOR/PENDIENTE_FIRMA
// (no-op silencioso en cualquier otro estado, ver SP_RRHH_CONTRATO_ELIMINAR).
export async function eliminarContrato(idContrato: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_ELIMINAR", [idContrato]);
}

// --- Conceptos remunerativos (planilla) ---

export async function agregarConceptoContrato(
  idContrato: number,
  idConcepto: number,
  monto: number,
): Promise<{ id_contrato_concepto: number }> {
  return callProcedureWithOut<{ id_contrato_concepto: number }>(
    "SP_RRHH_CONTRATO_CONCEPTO_AGREGAR",
    [idContrato, idConcepto, monto],
    ["id_contrato_concepto"],
  );
}

export async function listarConceptosContrato(idContrato: number): Promise<ContratoConceptoRow[]> {
  return callProcedure<ContratoConceptoRow>("SP_RRHH_CONTRATO_CONCEPTO_LISTAR", [idContrato]);
}

export async function eliminarConceptoContrato(idContratoConcepto: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_CONCEPTO_ELIMINAR", [idContratoConcepto]);
}

// --- Proyectos con tarifa/hora (locador por hora) ---

export async function agregarProyectoContrato(
  idContrato: number,
  idProyecto: number,
  tarifaHora: number,
  idMoneda: number,
  tipoCambio: number | null,
): Promise<{ id_contrato_proyecto: number }> {
  const resultado = await callProcedureWithOut<{ id_contrato_proyecto: number | null }>(
    "SP_RRHH_CONTRATO_PROYECTO_AGREGAR",
    [idContrato, idProyecto, tarifaHora, idMoneda, tipoCambio],
    ["id_contrato_proyecto"],
  );
  if (!resultado.id_contrato_proyecto) {
    throw new Error("No se pudo agregar el proyecto: falta elegir el proyecto o ya tiene una asignacion manual.");
  }
  return resultado as { id_contrato_proyecto: number };
}

export async function listarProyectosContrato(idContrato: number): Promise<ContratoProyectoRow[]> {
  return callProcedure<ContratoProyectoRow>("SP_RRHH_CONTRATO_PROYECTO_LISTAR", [idContrato]);
}

export async function eliminarProyectoContrato(idContratoProyecto: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_PROYECTO_ELIMINAR", [idContratoProyecto]);
}

// --- Horas trabajadas por proyecto (locador por hora) ---

export async function registrarHorasContrato(
  idContratoProyecto: number,
  periodo: string,
  horas: number,
  idUsuarioCreacion: number,
): Promise<{ id_contrato_horas: number; monto_calculado: string }> {
  return callProcedureWithOut<{ id_contrato_horas: number; monto_calculado: string }>(
    "SP_RRHH_CONTRATO_HORAS_REGISTRAR",
    [idContratoProyecto, periodo, horas, idUsuarioCreacion],
    ["id_contrato_horas", "monto_calculado"],
  );
}

export async function listarHorasContrato(idContrato: number): Promise<ContratoHorasRow[]> {
  return callProcedure<ContratoHorasRow>("SP_RRHH_CONTRATO_HORAS_LISTAR", [idContrato]);
}

// Cross-contrato -- para dejar elegir una fila de horas ya cargada (con
// su monto ya calculado) al agregar mano de obra manual en Proyectos
// para un locador POR_HORA (que no usa RRHH_CONTRATO_PERIODO_PAGO).
export async function listarTodasLasHorasContrato(): Promise<ContratoHorasTodosRow[]> {
  return callProcedure<ContratoHorasTodosRow>("SP_RRHH_CONTRATO_HORAS_LISTAR_TODOS", []);
}

export async function eliminarHorasContrato(idContratoHoras: number): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_HORAS_ELIMINAR", [idContratoHoras]);
}

export async function marcarHorasPagadas(idContratoHoras: number, idMovimiento: number, fechaPago: string): Promise<void> {
  await callProcedure("SP_RRHH_CONTRATO_HORAS_MARCAR_PAGADA", [idContratoHoras, idMovimiento, fechaPago]);
}

export async function listarHorasPendientes(): Promise<HorasPendienteRow[]> {
  return callProcedure<HorasPendienteRow>("SP_RRHH_CONTRATO_HORAS_LISTAR_PENDIENTES", []);
}
