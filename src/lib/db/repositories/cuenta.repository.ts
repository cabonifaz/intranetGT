import { callProcedure, callProcedureWithOut } from "../callProcedure";
import { listarMaestros } from "./maestro.repository";
import type { CuentaDetalleRow, CuentaListadoRow, MovimientoCuentaRow } from "@/types/db";

export async function listarMovimientosPorReferencia(tipoReferencia: string, idReferencia: number): Promise<MovimientoCuentaRow[]> {
  return callProcedure<MovimientoCuentaRow>("SP_CUENTA_MOVIMIENTO_LISTAR_POR_REFERENCIA", [tipoReferencia, idReferencia]);
}

// Compartido por toda accion que registra un pago (Compras, Pasivos,
// Mano de obra) -- todas necesitan el ID_MAESTRO de EGRESO para armar el
// movimiento de cuenta.
export async function obtenerIdTipoMovimientoEgreso(): Promise<number> {
  const tipos = await listarMaestros("TIPO_MOVIMIENTO_CUENTA");
  const egreso = tipos.find((t) => t.CODIGO === "EGRESO");
  if (!egreso) throw new Error("No se encontro el catalogo TIPO_MOVIMIENTO_CUENTA=EGRESO");
  return egreso.ID_MAESTRO;
}

interface CrearCuentaParams {
  idTipoCuenta: number;
  idBanco: number | null;
  idMoneda: number | null;
  nombre: string;
  nroCuenta: string | null;
  cci: string | null;
  saldoInicial: number;
  idUsuarioCreacion: number;
}

export async function crearCuenta(params: CrearCuentaParams): Promise<{ id_cuenta: number }> {
  return callProcedureWithOut<{ id_cuenta: number }>(
    "SP_CUENTA_CREAR",
    [
      params.idTipoCuenta,
      params.idBanco,
      params.idMoneda,
      params.nombre,
      params.nroCuenta,
      params.cci,
      params.saldoInicial,
      params.idUsuarioCreacion,
    ],
    ["id_cuenta"],
  );
}

export async function listarCuentas(idTipoCuenta: number | null = null, soloActivas = true): Promise<CuentaListadoRow[]> {
  return callProcedure<CuentaListadoRow>("SP_CUENTA_LISTAR", [idTipoCuenta, soloActivas ? 1 : 0]);
}

export async function obtenerCuenta(idCuenta: number): Promise<CuentaDetalleRow | null> {
  const rows = await callProcedure<CuentaDetalleRow>("SP_CUENTA_OBTENER", [idCuenta]);
  return rows[0] ?? null;
}

interface ActualizarCuentaParams {
  idCuenta: number;
  nombre: string;
  nroCuenta: string | null;
  cci: string | null;
  idUsuarioModificacion: number;
}

export async function actualizarCuenta(params: ActualizarCuentaParams): Promise<void> {
  await callProcedure("SP_CUENTA_ACTUALIZAR", [
    params.idCuenta,
    params.nombre,
    params.nroCuenta,
    params.cci,
    params.idUsuarioModificacion,
  ]);
}

export async function cambiarEstadoCuenta(idCuenta: number, activo: boolean, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_CUENTA_CAMBIAR_ESTADO", [idCuenta, activo ? 1 : 0, idUsuarioModificacion]);
}

interface RegistrarMovimientoParams {
  idCuenta: number;
  idTipoMovimiento: number;
  fechaMovimiento: string;
  monto: number;
  concepto: string;
  tipoReferencia: string | null;
  idReferencia: number | null;
  idUsuarioCreacion: number;
}

export async function registrarMovimientoCuenta(
  params: RegistrarMovimientoParams,
): Promise<{ id_movimiento: number; saldo_resultante: string }> {
  return callProcedureWithOut<{ id_movimiento: number; saldo_resultante: string }>(
    "SP_CUENTA_MOVIMIENTO_REGISTRAR",
    [
      params.idCuenta,
      params.idTipoMovimiento,
      params.fechaMovimiento,
      params.monto,
      params.concepto,
      params.tipoReferencia,
      params.idReferencia,
      params.idUsuarioCreacion,
    ],
    ["id_movimiento", "saldo_resultante"],
  );
}

export async function listarMovimientosCuenta(idCuenta: number): Promise<MovimientoCuentaRow[]> {
  return callProcedure<MovimientoCuentaRow>("SP_CUENTA_MOVIMIENTO_LISTAR", [idCuenta]);
}

export async function eliminarMovimientoCuenta(idMovimiento: number): Promise<void> {
  await callProcedure("SP_CUENTA_MOVIMIENTO_ELIMINAR", [idMovimiento]);
}
