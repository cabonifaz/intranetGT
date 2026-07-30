import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { TipoCambioCategoriaRow, TipoCambioHistoricoRow, TipoCambioSunatDiaRow } from "@/types/db";

export async function listarCategoriasTipoCambio(): Promise<TipoCambioCategoriaRow[]> {
  return callProcedure<TipoCambioCategoriaRow>("SP_TIPO_CAMBIO_LISTAR_CATEGORIAS", []);
}

// Atajo para los formularios que solo necesitan el valor vigente de una
// categoria (LABORAL/PRESTAMO/COMPRA/VENTA) como sugerencia -- lo demas
// del formulario sigue permitiendo corregirlo a mano.
export async function obtenerTipoCambioVigente(codigo: string): Promise<string | null> {
  const categorias = await listarCategoriasTipoCambio();
  return categorias.find((c) => c.CODIGO === codigo)?.VALOR ?? null;
}

export async function fijarTipoCambio(
  idCategoriaTc: number,
  valor: number,
  idUsuarioCreacion: number | null,
): Promise<{ id_tipo_cambio: number }> {
  return callProcedureWithOut<{ id_tipo_cambio: number }>(
    "SP_TIPO_CAMBIO_FIJAR",
    [idCategoriaTc, valor, idUsuarioCreacion],
    ["id_tipo_cambio"],
  );
}

export async function listarHistoricoTipoCambio(idCategoriaTc: number): Promise<TipoCambioHistoricoRow[]> {
  return callProcedure<TipoCambioHistoricoRow>("SP_TIPO_CAMBIO_HISTORICO_LISTAR", [idCategoriaTc]);
}

export async function obtenerTipoCambioSunatDia(fecha: string): Promise<TipoCambioSunatDiaRow | null> {
  const rows = await callProcedure<TipoCambioSunatDiaRow>("SP_TIPO_CAMBIO_SUNAT_OBTENER_DIA", [fecha]);
  return rows[0] ?? null;
}

export async function guardarTipoCambioSunatDia(fecha: string, tcCompra: number, tcVenta: number): Promise<void> {
  await callProcedure("SP_TIPO_CAMBIO_SUNAT_GUARDAR_DIA", [fecha, tcCompra, tcVenta]);
}

// A diferencia de guardarTipoCambioSunatDia (no-op si la fecha ya
// existe), esta SI sobreescribe -- la usa el boton "Actualizar TC ahora"
// para forzar una relectura aunque el sync automatico del dia ya haya
// corrido.
export async function actualizarTipoCambioSunatDia(fecha: string, tcCompra: number, tcVenta: number): Promise<void> {
  await callProcedure("SP_TIPO_CAMBIO_SUNAT_ACTUALIZAR_DIA", [fecha, tcCompra, tcVenta]);
}
