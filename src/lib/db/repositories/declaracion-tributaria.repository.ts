import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  DeclaracionTributariaDetalleRow,
  DeclaracionTributariaListadoRow,
  DeclaracionTributariaPendienteRow,
  DeclaracionTributariaIgvAnteriorRow,
  DeclaracionTributariaRentaAnteriorRow,
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

// Null si no hay ninguna mensual anterior presentada/pagada (primera vez,
// o la anterior esta en borrador/anulada) -- ver presentar-declaracion.ts.
export async function obtenerIgvResultanteAnterior(anio: number, mes: number): Promise<number | null> {
  const rows = await callProcedure<DeclaracionTributariaIgvAnteriorRow>("SP_DECLARACION_TRIBUTARIA_IGV_RESULTANTE_ANTERIOR", [anio, mes]);
  const valor = rows[0]?.IGV_RESULTANTE;
  return valor !== undefined && valor !== null ? Number(valor) : null;
}

// Mensual anterior (ya presentada/pagada) si existe, si no la DJ Anual
// mas reciente -- ver presentar-declaracion.ts.
export async function obtenerRentaAnterior(anio: number, mes: number): Promise<number | null> {
  const rows = await callProcedure<DeclaracionTributariaRentaAnteriorRow>("SP_DECLARACION_TRIBUTARIA_RENTA_ANTERIOR", [anio, mes]);
  const valor = rows[0]?.RESULTADO_ANTERIOR;
  return valor !== undefined && valor !== null ? Number(valor) : null;
}
