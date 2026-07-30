import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  PagoRecurrenteRow,
  PagoRecurrenteInstanciaRow,
  InstanciaPendienteRow,
  PagoRecurrenteGeneracionDiaRow,
} from "@/types/db";

interface CrearPagoRecurrenteParams {
  nombre: string;
  descripcion: string | null;
  esVariable: boolean;
  montoFijo: number | null;
  idMoneda: number;
  tipoCambio: number | null;
  intervaloMeses: number;
  diaVencimiento: number;
  fechaInicio: string;
  fechaFin: string | null;
  idProyecto: number | null;
  idCuentaPagoDefault: number | null;
  idUsuarioCreacion: number;
}

export async function crearPagoRecurrente(params: CrearPagoRecurrenteParams): Promise<{ id_pago_recurrente: number | null }> {
  return callProcedureWithOut<{ id_pago_recurrente: number | null }>(
    "SP_PAGO_RECURRENTE_CREAR",
    [
      params.nombre,
      params.descripcion,
      params.esVariable ? 1 : 0,
      params.montoFijo,
      params.idMoneda,
      params.tipoCambio,
      params.intervaloMeses,
      params.diaVencimiento,
      params.fechaInicio,
      params.fechaFin,
      params.idProyecto,
      params.idCuentaPagoDefault,
      params.idUsuarioCreacion,
    ],
    ["id_pago_recurrente"],
  );
}

export async function listarPagosRecurrentes(soloActivos = true): Promise<PagoRecurrenteRow[]> {
  return callProcedure<PagoRecurrenteRow>("SP_PAGO_RECURRENTE_LISTAR", [soloActivos ? 1 : 0]);
}

export async function obtenerPagoRecurrente(idPagoRecurrente: number): Promise<PagoRecurrenteRow | null> {
  const rows = await callProcedure<PagoRecurrenteRow>("SP_PAGO_RECURRENTE_OBTENER", [idPagoRecurrente]);
  return rows[0] ?? null;
}

interface ActualizarPagoRecurrenteParams {
  idPagoRecurrente: number;
  nombre: string;
  descripcion: string | null;
  esVariable: boolean;
  montoFijo: number | null;
  intervaloMeses: number;
  diaVencimiento: number;
  fechaFin: string | null;
  idCuentaPagoDefault: number | null;
  idUsuarioModificacion: number;
}

export async function actualizarPagoRecurrente(params: ActualizarPagoRecurrenteParams): Promise<void> {
  await callProcedure("SP_PAGO_RECURRENTE_ACTUALIZAR", [
    params.idPagoRecurrente,
    params.nombre,
    params.descripcion,
    params.esVariable ? 1 : 0,
    params.montoFijo,
    params.intervaloMeses,
    params.diaVencimiento,
    params.fechaFin,
    params.idCuentaPagoDefault,
    params.idUsuarioModificacion,
  ]);
}

export async function cambiarEstadoPagoRecurrente(idPagoRecurrente: number, activo: boolean, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_PAGO_RECURRENTE_CAMBIAR_ESTADO", [idPagoRecurrente, activo ? 1 : 0, idUsuarioModificacion]);
}

// idUsuarioCreacion es null para instancias generadas por el sync
// automatico diario (ver auto-generar.ts) -- mismo criterio que el sync
// de TC SUNAT, que tampoco le atribuye las filas automaticas a quien
// haya cargado la pagina.
export async function agregarInstancia(
  idPagoRecurrente: number,
  periodo: string,
  fechaVencimiento: string,
  monto: number,
  idCuentaPago: number | null,
  idUsuarioCreacion: number | null,
): Promise<{ id_instancia: number }> {
  return callProcedureWithOut<{ id_instancia: number }>(
    "SP_PAGO_RECURRENTE_INSTANCIA_AGREGAR",
    [idPagoRecurrente, periodo, fechaVencimiento, monto, idCuentaPago, idUsuarioCreacion],
    ["id_instancia"],
  );
}

export async function listarInstancias(idPagoRecurrente: number): Promise<PagoRecurrenteInstanciaRow[]> {
  return callProcedure<PagoRecurrenteInstanciaRow>("SP_PAGO_RECURRENTE_INSTANCIA_LISTAR", [idPagoRecurrente]);
}

// Corrige el monto (ej. cargar el monto real de un pago ES_VARIABLE, que
// se genera con MONTO=0 como placeholder) y/o la cuenta de pago de una
// instancia sin pagar ni financiar.
export async function actualizarInstancia(idInstancia: number, monto: number, idCuentaPago: number | null): Promise<void> {
  await callProcedure("SP_PAGO_RECURRENTE_INSTANCIA_ACTUALIZAR", [idInstancia, monto, idCuentaPago]);
}

export async function eliminarInstancia(idInstancia: number): Promise<void> {
  await callProcedure("SP_PAGO_RECURRENTE_INSTANCIA_ELIMINAR", [idInstancia]);
}

export async function marcarInstanciaPagada(idInstancia: number, idMovimiento: number, fechaPago: string): Promise<void> {
  await callProcedure("SP_PAGO_RECURRENTE_INSTANCIA_MARCAR_PAGADA", [idInstancia, idMovimiento, fechaPago]);
}

// Cross-pago-recurrente, para Cuentas por Pagar y las alertas de vencimiento.
export async function listarInstanciasPendientes(): Promise<InstanciaPendienteRow[]> {
  return callProcedure<InstanciaPendienteRow>("SP_PAGO_RECURRENTE_INSTANCIA_LISTAR_PENDIENTES", []);
}

// Cache de "ya se generaron las instancias pendientes de hoy" -- ver
// asegurarInstanciasGeneradasDelDia() en auto-generar.ts.
export async function obtenerGeneracionDia(fecha: string): Promise<PagoRecurrenteGeneracionDiaRow | null> {
  const rows = await callProcedure<PagoRecurrenteGeneracionDiaRow>("SP_PAGO_RECURRENTE_GENERACION_DIA_OBTENER", [fecha]);
  return rows[0] ?? null;
}

export async function guardarGeneracionDia(fecha: string): Promise<void> {
  await callProcedure("SP_PAGO_RECURRENTE_GENERACION_DIA_GUARDAR", [fecha]);
}
