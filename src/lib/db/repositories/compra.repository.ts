import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type { ProveedorListadoRow, ProveedorDetalleRow, CompraListadoRow, CompraDetalleRow, CompraPagoRow, CompraPendienteRow } from "@/types/db";

interface CrearProveedorParams {
  ruc: string | null;
  razonSocial: string;
  esPersonaNatural: boolean;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
  idUsuarioCreacion: number;
}

export async function crearProveedor(params: CrearProveedorParams): Promise<{ id_proveedor: number }> {
  return callProcedureWithOut<{ id_proveedor: number }>(
    "SP_PROVEEDOR_CREAR",
    [
      params.ruc,
      params.razonSocial,
      params.esPersonaNatural ? 1 : 0,
      params.nombreContacto,
      params.telefono,
      params.correo,
      params.idUsuarioCreacion,
    ],
    ["id_proveedor"],
  );
}

export async function listarProveedores(soloActivos = true): Promise<ProveedorListadoRow[]> {
  return callProcedure<ProveedorListadoRow>("SP_PROVEEDOR_LISTAR", [soloActivos ? 1 : 0]);
}

// Bolsa de "persona" para mano de obra manual en Proyectos -- solo
// proveedores activos marcados como persona natural.
export async function listarProveedoresPersonaNatural(): Promise<ProveedorListadoRow[]> {
  return callProcedure<ProveedorListadoRow>("SP_PROVEEDOR_LISTAR_PERSONA_NATURAL", []);
}

export async function obtenerProveedor(idProveedor: number): Promise<ProveedorDetalleRow | null> {
  const rows = await callProcedure<ProveedorDetalleRow>("SP_PROVEEDOR_OBTENER", [idProveedor]);
  return rows[0] ?? null;
}

interface ActualizarProveedorParams {
  idProveedor: number;
  ruc: string | null;
  razonSocial: string;
  esPersonaNatural: boolean;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
  idUsuarioModificacion: number;
}

export async function actualizarProveedor(params: ActualizarProveedorParams): Promise<void> {
  await callProcedure("SP_PROVEEDOR_ACTUALIZAR", [
    params.idProveedor,
    params.ruc,
    params.razonSocial,
    params.esPersonaNatural ? 1 : 0,
    params.nombreContacto,
    params.telefono,
    params.correo,
    params.idUsuarioModificacion,
  ]);
}

export async function cambiarEstadoProveedor(idProveedor: number, activo: boolean, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_PROVEEDOR_CAMBIAR_ESTADO", [idProveedor, activo ? 1 : 0, idUsuarioModificacion]);
}

interface CrearCompraParams {
  idProveedor: number;
  idProyecto: number | null;
  descripcion: string;
  nroDocumento: string | null;
  fechaCompra: string;
  fechaVencimiento: string | null;
  montoTotal: number;
  idMoneda: number;
  tipoCambio: number | null;
  idUsuarioCreacion: number;
}

export async function crearCompra(params: CrearCompraParams): Promise<{ id_compra: number }> {
  return callProcedureWithOut<{ id_compra: number }>(
    "SP_COMPRA_CREAR",
    [
      params.idProveedor,
      params.idProyecto,
      params.descripcion,
      params.nroDocumento,
      params.fechaCompra,
      params.fechaVencimiento,
      params.montoTotal,
      params.idMoneda,
      params.tipoCambio,
      params.idUsuarioCreacion,
    ],
    ["id_compra"],
  );
}

export async function listarCompras(
  idEstadoCompra: number | null = null,
  idProveedor: number | null = null,
  idProyecto: number | null = null,
): Promise<CompraListadoRow[]> {
  return callProcedure<CompraListadoRow>("SP_COMPRA_LISTAR", [idEstadoCompra, idProveedor, idProyecto]);
}

export async function obtenerCompra(idCompra: number): Promise<CompraDetalleRow | null> {
  const rows = await callProcedure<CompraDetalleRow>("SP_COMPRA_OBTENER", [idCompra]);
  return rows[0] ?? null;
}

interface RegistrarPagoCompraParams {
  idCompra: number;
  idCuenta: number;
  idMovimiento: number;
  monto: number;
  fechaPago: string;
  idUsuarioCreacion: number;
}

export async function registrarPagoCompra(params: RegistrarPagoCompraParams): Promise<{ id_pago: number }> {
  return callProcedureWithOut<{ id_pago: number }>(
    "SP_COMPRA_PAGO_REGISTRAR",
    [params.idCompra, params.idCuenta, params.idMovimiento, params.monto, params.fechaPago, params.idUsuarioCreacion],
    ["id_pago"],
  );
}

export async function listarPagosCompra(idCompra: number): Promise<CompraPagoRow[]> {
  return callProcedure<CompraPagoRow>("SP_COMPRA_PAGO_LISTAR", [idCompra]);
}

export async function listarComprasPendientes(): Promise<CompraPendienteRow[]> {
  return callProcedure<CompraPendienteRow>("SP_COMPRA_LISTAR_PENDIENTES", []);
}
