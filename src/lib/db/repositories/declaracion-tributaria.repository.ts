import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  DeclaracionTributariaDetalleRow,
  DeclaracionTributariaListadoRow,
  DeclaracionTributariaPendienteRow,
} from "@/types/db";

interface ActualizarDeclaracionParams {
  idDeclaracion: number;
  fechaVencimiento: string;
  ventasGravadas: number | null;
  comprasGravadas: number | null;
  igvVentas: number | null;
  igvCompras: number | null;
  igvResultante: number | null;
  pagoACuentaRenta: number | null;
  impuestoCalculadoRenta: number | null;
  pagosACuentaAcumulados: number | null;
  saldoRenta: number | null;
  montoTotalAPagar: number;
  notas: string | null;
  idUsuarioModificacion: number;
}

export async function crearDeclaracion(
  idTipoDeclaracion: number,
  anio: number,
  mes: number,
  fechaVencimiento: string,
  idUsuarioCreacion: number,
): Promise<{ id_declaracion: number | null }> {
  return callProcedureWithOut<{ id_declaracion: number | null }>(
    "SP_DECLARACION_TRIBUTARIA_CREAR",
    [idTipoDeclaracion, anio, mes, fechaVencimiento, idUsuarioCreacion],
    ["id_declaracion"],
  );
}

export async function actualizarDeclaracion(params: ActualizarDeclaracionParams): Promise<void> {
  await callProcedure("SP_DECLARACION_TRIBUTARIA_ACTUALIZAR", [
    params.idDeclaracion,
    params.fechaVencimiento,
    params.ventasGravadas,
    params.comprasGravadas,
    params.igvVentas,
    params.igvCompras,
    params.igvResultante,
    params.pagoACuentaRenta,
    params.impuestoCalculadoRenta,
    params.pagosACuentaAcumulados,
    params.saldoRenta,
    params.montoTotalAPagar,
    params.notas,
    params.idUsuarioModificacion,
  ]);
}

export async function obtenerDeclaracion(idDeclaracion: number): Promise<DeclaracionTributariaDetalleRow | null> {
  const rows = await callProcedure<DeclaracionTributariaDetalleRow>("SP_DECLARACION_TRIBUTARIA_OBTENER", [idDeclaracion]);
  return rows[0] ?? null;
}

export async function listarDeclaraciones(idTipoDeclaracion: number | null, anio: number | null): Promise<DeclaracionTributariaListadoRow[]> {
  return callProcedure<DeclaracionTributariaListadoRow>("SP_DECLARACION_TRIBUTARIA_LISTAR", [idTipoDeclaracion, anio]);
}

export async function listarDeclaracionesPendientesVencimiento(diasAlerta: number): Promise<DeclaracionTributariaPendienteRow[]> {
  return callProcedure<DeclaracionTributariaPendienteRow>("SP_DECLARACION_TRIBUTARIA_LISTAR_PENDIENTES_VENCIMIENTO", [diasAlerta]);
}

export async function subirDocumentoDeclaracion(idDeclaracion: number, documentoPath: string, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_DECLARACION_TRIBUTARIA_SUBIR_DOCUMENTO", [idDeclaracion, documentoPath, idUsuarioModificacion]);
}

export async function presentarDeclaracion(idDeclaracion: number, idMovimientoCredito: number | null): Promise<void> {
  await callProcedure("SP_DECLARACION_TRIBUTARIA_PRESENTAR", [idDeclaracion, idMovimientoCredito]);
}

export async function marcarDeclaracionPagada(
  idDeclaracion: number,
  idMovimientoPago: number,
  idCuentaPago: number,
  fechaPago: string,
): Promise<void> {
  await callProcedure("SP_DECLARACION_TRIBUTARIA_MARCAR_PAGADA", [idDeclaracion, idMovimientoPago, idCuentaPago, fechaPago]);
}

export async function anularDeclaracion(idDeclaracion: number, motivo: string, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_DECLARACION_TRIBUTARIA_ANULAR", [idDeclaracion, motivo, idUsuarioModificacion]);
}

export async function eliminarDeclaracion(idDeclaracion: number): Promise<void> {
  await callProcedure("SP_DECLARACION_TRIBUTARIA_ELIMINAR", [idDeclaracion]);
}
