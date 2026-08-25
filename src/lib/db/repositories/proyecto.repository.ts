import { callProcedure, callProcedureWithOut } from "../callProcedure";
import type {
  ProyectoListadoRow,
  ProyectoDetalleRow,
  ProyectoIngresoRow,
  ProyectoCostoManoObraRow,
  ProyectoManoObraHorasRow,
  ProyectoHitoRow,
  ProyectoHitoPendienteRow,
  ProyectoHitoIgvPendienteRow,
  ClienteListadoRow,
  ClienteDetalleRow,
  ProyectoMovimientoRow,
  ManoObraPendienteRow,
} from "@/types/db";

interface CrearProyectoParams {
  idTipoProyecto: number;
  nombre: string;
  idCliente: number | null;
  esInterno: boolean;
  descripcion: string | null;
  fechaInicio: string;
  fechaFinEstimada: string | null;
  costoPresupuestado: number;
  ingresoEsperado: number;
  idMoneda: number;
  idUsuarioCreacion: number;
}

export async function crearProyecto(params: CrearProyectoParams): Promise<{ id_proyecto: number }> {
  return callProcedureWithOut<{ id_proyecto: number }>(
    "SP_PROYECTO_CREAR",
    [
      params.idTipoProyecto,
      params.nombre,
      params.idCliente,
      params.esInterno ? 1 : 0,
      params.descripcion,
      params.fechaInicio,
      params.fechaFinEstimada,
      params.costoPresupuestado,
      params.ingresoEsperado,
      params.idMoneda,
      params.idUsuarioCreacion,
    ],
    ["id_proyecto"],
  );
}

export async function listarProyectos(idEstadoProyecto: number | null = null, soloActivos = true): Promise<ProyectoListadoRow[]> {
  return callProcedure<ProyectoListadoRow>("SP_PROYECTO_LISTAR", [idEstadoProyecto, soloActivos ? 1 : 0]);
}

export async function obtenerProyecto(idProyecto: number): Promise<ProyectoDetalleRow | null> {
  const rows = await callProcedure<ProyectoDetalleRow>("SP_PROYECTO_OBTENER", [idProyecto]);
  return rows[0] ?? null;
}

interface ActualizarProyectoParams {
  idProyecto: number;
  nombre: string;
  idCliente: number | null;
  esInterno: boolean;
  descripcion: string | null;
  fechaFinEstimada: string | null;
  costoPresupuestado: number;
  ingresoEsperado: number;
  idUsuarioModificacion: number;
}

export async function actualizarProyecto(params: ActualizarProyectoParams): Promise<void> {
  await callProcedure("SP_PROYECTO_ACTUALIZAR", [
    params.idProyecto,
    params.nombre,
    params.idCliente,
    params.esInterno ? 1 : 0,
    params.descripcion,
    params.fechaFinEstimada,
    params.costoPresupuestado,
    params.ingresoEsperado,
    params.idUsuarioModificacion,
  ]);
}

export async function cambiarEstadoProyecto(idProyecto: number, codigoEstado: string, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_PROYECTO_CAMBIAR_ESTADO", [idProyecto, codigoEstado, idUsuarioModificacion]);
}

interface AgregarIngresoParams {
  idProyecto: number;
  fecha: string;
  monto: number;
  idMoneda: number | null;
  tipoCambio: number | null;
  concepto: string;
  idUsuarioCreacion: number;
}

export async function agregarIngresoProyecto(params: AgregarIngresoParams): Promise<{ id_ingreso: number | null }> {
  return callProcedureWithOut<{ id_ingreso: number | null }>(
    "SP_PROYECTO_INGRESO_AGREGAR",
    [
      params.idProyecto,
      params.fecha,
      params.monto,
      params.idMoneda,
      params.tipoCambio,
      params.concepto,
      params.idUsuarioCreacion,
    ],
    ["id_ingreso"],
  );
}

export async function listarIngresosProyecto(idProyecto: number): Promise<ProyectoIngresoRow[]> {
  return callProcedure<ProyectoIngresoRow>("SP_PROYECTO_INGRESO_LISTAR", [idProyecto]);
}

export async function eliminarIngresoProyecto(idIngreso: number): Promise<void> {
  await callProcedure("SP_PROYECTO_INGRESO_ELIMINAR", [idIngreso]);
}

interface AgregarCostoManoObraParams {
  idProyecto: number;
  idContrato: number | null;
  idProveedor: number | null;
  periodo: string;
  monto: number;
  idMoneda: number;
  tipoCambio: number | null;
  concepto: string | null;
  idUsuarioCreacion: number;
}

export async function agregarCostoManoObra(params: AgregarCostoManoObraParams): Promise<{ id_asignacion: number | null }> {
  return callProcedureWithOut<{ id_asignacion: number | null }>(
    "SP_PROYECTO_COSTO_MANO_OBRA_AGREGAR",
    [
      params.idProyecto,
      params.idContrato,
      params.idProveedor,
      params.periodo,
      params.monto,
      params.idMoneda,
      params.tipoCambio,
      params.concepto,
      params.idUsuarioCreacion,
    ],
    ["id_asignacion"],
  );
}

export async function listarCostosManoObra(idProyecto: number): Promise<ProyectoCostoManoObraRow[]> {
  return callProcedure<ProyectoCostoManoObraRow>("SP_PROYECTO_COSTO_MANO_OBRA_LISTAR", [idProyecto]);
}

export async function eliminarCostoManoObra(idAsignacion: number): Promise<void> {
  await callProcedure("SP_PROYECTO_COSTO_MANO_OBRA_ELIMINAR", [idAsignacion]);
}

export async function marcarCostoManoObraPagado(idAsignacion: number, idMovimiento: number, fechaPago: string): Promise<void> {
  await callProcedure("SP_PROYECTO_COSTO_MANO_OBRA_MARCAR_PAGADA", [idAsignacion, idMovimiento, fechaPago]);
}

export async function listarCostoManoObraPendientes(): Promise<ManoObraPendienteRow[]> {
  return callProcedure<ManoObraPendienteRow>("SP_PROYECTO_COSTO_MANO_OBRA_LISTAR_PENDIENTES", []);
}

// Desglose por persona del costo de mano de obra por horas -- ver
// SP_PROYECTO_MANO_OBRA_HORAS_LISTAR.
export async function listarManoObraHorasProyecto(idProyecto: number): Promise<ProyectoManoObraHorasRow[]> {
  return callProcedure<ProyectoManoObraHorasRow>("SP_PROYECTO_MANO_OBRA_HORAS_LISTAR", [idProyecto]);
}

interface AgregarHitoParams {
  idProyecto: number;
  idTipoHito: number;
  nombre: string;
  porcentaje: number | null;
  montoFijo: number | null;
  fechaEstimada: string | null;
  orden: number;
  idUsuarioCreacion: number;
}

export async function agregarHitoProyecto(params: AgregarHitoParams): Promise<{ id_hito: number }> {
  return callProcedureWithOut<{ id_hito: number }>(
    "SP_PROYECTO_HITO_AGREGAR",
    [
      params.idProyecto,
      params.idTipoHito,
      params.nombre,
      params.porcentaje,
      params.montoFijo,
      params.fechaEstimada,
      params.orden,
      params.idUsuarioCreacion,
    ],
    ["id_hito"],
  );
}

export async function listarHitosProyecto(idProyecto: number): Promise<ProyectoHitoRow[]> {
  return callProcedure<ProyectoHitoRow>("SP_PROYECTO_HITO_LISTAR", [idProyecto]);
}

export async function listarHitosPendientes(): Promise<ProyectoHitoPendienteRow[]> {
  return callProcedure<ProyectoHitoPendienteRow>("SP_PROYECTO_HITO_LISTAR_PENDIENTES", []);
}

// Para la seccion "IGV pendiente de declarar" de la cuenta IGV_FAVOR.
export async function listarHitosIgvPendiente(): Promise<ProyectoHitoIgvPendienteRow[]> {
  return callProcedure<ProyectoHitoIgvPendienteRow>("SP_PROYECTO_HITO_LISTAR_IGV_PENDIENTE", []);
}

export async function marcarHitoFacturado(idHito: number, nroFactura: string | null, fechaFacturado: string): Promise<void> {
  await callProcedure("SP_PROYECTO_HITO_MARCAR_FACTURADO", [idHito, nroFactura, fechaFacturado]);
}

export async function marcarHitoCobrado(idHito: number, idIngreso: number): Promise<void> {
  await callProcedure("SP_PROYECTO_HITO_MARCAR_COBRADO", [idHito, idIngreso]);
}

// Devuelve el ID_INGRESO que quedo desenlazado (null si el hito no
// estaba COBRADO) -- el llamador todavia tiene que borrar ese ingreso
// aparte con eliminarIngresoProyecto, ver deshacerCobroHitoAction.
export async function deshacerCobroHito(idHito: number): Promise<{ id_ingreso: number | null }> {
  return callProcedureWithOut<{ id_ingreso: number | null }>("SP_PROYECTO_HITO_DESHACER_COBRO", [idHito], ["id_ingreso"]);
}

export async function anularHitoProyecto(idHito: number): Promise<void> {
  await callProcedure("SP_PROYECTO_HITO_ANULAR", [idHito]);
}

export async function eliminarHitoProyecto(idHito: number): Promise<void> {
  await callProcedure("SP_PROYECTO_HITO_ELIMINAR", [idHito]);
}

// --- Catalogo de clientes (calco de PROVEEDOR en compra.repository.ts) ---

interface CrearClienteParams {
  ruc: string | null;
  razonSocial: string;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
  idUsuarioCreacion: number;
}

export async function crearCliente(params: CrearClienteParams): Promise<{ id_cliente: number }> {
  return callProcedureWithOut<{ id_cliente: number }>(
    "SP_CLIENTE_CREAR",
    [params.ruc, params.razonSocial, params.nombreContacto, params.telefono, params.correo, params.idUsuarioCreacion],
    ["id_cliente"],
  );
}

export async function listarClientes(soloActivos = true): Promise<ClienteListadoRow[]> {
  return callProcedure<ClienteListadoRow>("SP_CLIENTE_LISTAR", [soloActivos ? 1 : 0]);
}

export async function obtenerCliente(idCliente: number): Promise<ClienteDetalleRow | null> {
  const rows = await callProcedure<ClienteDetalleRow>("SP_CLIENTE_OBTENER", [idCliente]);
  return rows[0] ?? null;
}

interface ActualizarClienteParams {
  idCliente: number;
  ruc: string | null;
  razonSocial: string;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
  idUsuarioModificacion: number;
}

export async function actualizarCliente(params: ActualizarClienteParams): Promise<void> {
  await callProcedure("SP_CLIENTE_ACTUALIZAR", [
    params.idCliente,
    params.ruc,
    params.razonSocial,
    params.nombreContacto,
    params.telefono,
    params.correo,
    params.idUsuarioModificacion,
  ]);
}

export async function cambiarEstadoCliente(idCliente: number, activo: boolean, idUsuarioModificacion: number): Promise<void> {
  await callProcedure("SP_CLIENTE_CAMBIAR_ESTADO", [idCliente, activo ? 1 : 0, idUsuarioModificacion]);
}

// Ledger combinado de ingresos y salidas (compras pagadas + mano de obra
// manual + horas) del proyecto, para la seccion de "Movimientos" del
// dashboard -- ver SP_PROYECTO_MOVIMIENTO_LISTAR para el detalle de cada fuente.
export async function listarMovimientosProyecto(idProyecto: number): Promise<ProyectoMovimientoRow[]> {
  return callProcedure<ProyectoMovimientoRow>("SP_PROYECTO_MOVIMIENTO_LISTAR", [idProyecto]);
}

// Botones "Reset" del detalle del proyecto -- ver comentario en
// sp_proyecto.sql sobre por que incluyen deliberadamente lo ya pagado/
// financiado, y por que Compras solo se desvincula (nunca se borra).
export async function resetIngresosProyecto(idProyecto: number): Promise<void> {
  await callProcedure("SP_PROYECTO_RESET_INGRESOS", [idProyecto]);
}

export async function resetComprasProyecto(idProyecto: number): Promise<void> {
  await callProcedure("SP_PROYECTO_RESET_COMPRAS", [idProyecto]);
}

export async function resetCostosLaboralesProyecto(idProyecto: number): Promise<void> {
  await callProcedure("SP_PROYECTO_RESET_COSTOS_LABORALES", [idProyecto]);
}

// Los contactos externos (Cliente/Proveedor/Socio comercial) se
// generalizaron a DIRECTORIO_CONTACTO_EXTERNO -- ver
// src/lib/db/repositories/directorio-contacto.repository.ts.
