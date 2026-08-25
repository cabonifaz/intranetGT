"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso, requireCierreProyecto } from "@/lib/auth/require-permiso";
import {
  crearProyecto,
  actualizarProyecto,
  cambiarEstadoProyecto,
  resetIngresosProyecto,
  resetComprasProyecto,
  resetCostosLaboralesProyecto,
  agregarIngresoProyecto,
  eliminarIngresoProyecto,
  agregarCostoManoObra,
  eliminarCostoManoObra,
  marcarCostoManoObraPagado,
  agregarHitoProyecto,
  marcarHitoFacturado,
  marcarHitoCobrado,
  deshacerCobroHito,
  anularHitoProyecto,
  eliminarHitoProyecto,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
} from "@/lib/db/repositories/proyecto.repository";
import { registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";

const PROYECTOS_APP_CODIGO = "PROYECTOS_EMPRESA";

export async function crearProyectoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idTipoProyecto = Number(formData.get("idTipoProyecto"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const esInterno = formData.get("esInterno") === "1";
  const idCliente = Number(formData.get("idCliente") || 0) || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const fechaInicio = String(formData.get("fechaInicio") ?? "").trim();
  const fechaFinEstimada = String(formData.get("fechaFinEstimada") ?? "").trim() || null;
  const costoPresupuestadoRaw = String(formData.get("costoPresupuestado") ?? "").trim();
  const costoPresupuestado = costoPresupuestadoRaw ? Number(costoPresupuestadoRaw) : 0;
  const ingresoEsperadoRaw = String(formData.get("ingresoEsperado") ?? "").trim();
  const ingresoEsperado = ingresoEsperadoRaw ? Number(ingresoEsperadoRaw) : 0;
  const idMoneda = Number(formData.get("idMoneda"));

  if (!idTipoProyecto || !nombre || !fechaInicio || !idMoneda) return;
  if (!esInterno && !idCliente) return;

  const resultado = await crearProyecto({
    idTipoProyecto,
    nombre,
    idCliente,
    esInterno,
    descripcion,
    fechaInicio,
    fechaFinEstimada,
    costoPresupuestado,
    ingresoEsperado,
    idMoneda,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/facturacion/proyectos");
  redirect(`/facturacion/proyectos/${resultado.id_proyecto}`);
}

export async function actualizarProyectoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const esInterno = formData.get("esInterno") === "1";
  const idCliente = Number(formData.get("idCliente") || 0) || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const fechaFinEstimada = String(formData.get("fechaFinEstimada") ?? "").trim() || null;
  const costoPresupuestadoRaw = String(formData.get("costoPresupuestado") ?? "").trim();
  const costoPresupuestado = costoPresupuestadoRaw ? Number(costoPresupuestadoRaw) : 0;
  const ingresoEsperadoRaw = String(formData.get("ingresoEsperado") ?? "").trim();
  const ingresoEsperado = ingresoEsperadoRaw ? Number(ingresoEsperadoRaw) : 0;

  if (!idProyecto || !nombre) return;
  if (!esInterno && !idCliente) return;

  await actualizarProyecto({
    idProyecto,
    nombre,
    idCliente,
    esInterno,
    descripcion,
    fechaFinEstimada,
    costoPresupuestado,
    ingresoEsperado,
    idUsuarioModificacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

// Cerrar/anular es mas delicado que operar dia a dia, por eso pide ADMIN
// igual que cambiarEstadoCuentaAction/anularPasivoAction.
// Cerrar (CERRADO) es la unica transicion reservada a SUPER_ADMIN/
// GERENCIA_GENERAL -- el resto (ej. ANULADO) sigue bastando con ADMIN
// sobre PROYECTOS_EMPRESA, ver requireCierreProyecto.
export async function cambiarEstadoProyectoAction(formData: FormData): Promise<void> {
  const idProyecto = Number(formData.get("idProyecto"));
  const codigoEstado = String(formData.get("codigoEstado") ?? "").trim();
  if (!idProyecto || !codigoEstado) return;

  const sesion = codigoEstado === "CERRADO" ? await requireCierreProyecto() : await requirePermiso(PROYECTOS_APP_CODIGO, "ADMIN");

  await cambiarEstadoProyecto(idProyecto, codigoEstado, sesion.idUsuario);
  revalidatePath("/facturacion/proyectos");
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

// Botones "Reset" del detalle del proyecto -- borran/desvinculan de
// golpe una fuente completa de costeo, incluyendo lo ya pagado o
// financiado (ver comentario en sp_proyecto.sql). Piden ADMIN + el
// formulario los confirma con ConfirmSubmitButton, mismo criterio que
// cambiarEstadoProyectoAction -- son botones de correccion masiva, no de
// operacion diaria.
export async function resetIngresosProyectoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ADMIN");

  const idProyecto = Number(formData.get("idProyecto"));
  if (!idProyecto) return;

  await resetIngresosProyecto(idProyecto);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function resetComprasProyectoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ADMIN");

  const idProyecto = Number(formData.get("idProyecto"));
  if (!idProyecto) return;

  await resetComprasProyecto(idProyecto);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  revalidatePath("/facturacion/compras");
  refresh();
}

export async function resetCostosLaboralesProyectoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ADMIN");

  const idProyecto = Number(formData.get("idProyecto"));
  if (!idProyecto) return;

  await resetCostosLaboralesProyecto(idProyecto);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function agregarIngresoProyectoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const fecha = String(formData.get("fecha") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const idMoneda = Number(formData.get("idMoneda") || 0) || null;
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;
  const concepto = String(formData.get("concepto") ?? "").trim();

  if (!idProyecto || !fecha || !monto || !concepto) return;

  await agregarIngresoProyecto({ idProyecto, fecha, monto, idMoneda, tipoCambio, concepto, idUsuarioCreacion: sesion.idUsuario });
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function eliminarIngresoProyectoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idIngreso = Number(formData.get("idIngreso"));
  if (!idIngreso) return;

  await eliminarIngresoProyecto(idIngreso);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function agregarCostoManoObraAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idContrato = Number(formData.get("idContrato") || 0) || null;
  const idProveedor = Number(formData.get("idProveedor") || 0) || null;
  const periodo = String(formData.get("periodo") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const idMoneda = Number(formData.get("idMoneda") || 0) || null;
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;
  const concepto = String(formData.get("concepto") ?? "").trim() || null;

  // La persona es exactamente una de las dos fuentes -- nunca las dos, nunca ninguna.
  if (!idProyecto || !periodo || !monto || !idMoneda) return;
  if ((!idContrato && !idProveedor) || (idContrato && idProveedor)) return;

  await agregarCostoManoObra({
    idProyecto,
    idContrato,
    idProveedor,
    periodo,
    monto,
    idMoneda,
    tipoCambio,
    concepto,
    idUsuarioCreacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function eliminarCostoManoObraAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idAsignacion = Number(formData.get("idAsignacion"));
  if (!idAsignacion) return;

  await eliminarCostoManoObra(idAsignacion);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

// Mismo flujo de dos pasos que registrarPagoCompraAction: primero el
// movimiento de cuenta (tipoReferencia='PROYECTO_COSTO_MANO_OBRA'), luego
// se marca la asignacion como pagada con el ID_MOVIMIENTO resultante.
export async function pagarCostoManoObraAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idAsignacion = Number(formData.get("idAsignacion"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();

  if (!idAsignacion || !idCuenta || !fechaPago || !monto || !concepto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento: fechaPago,
    monto,
    concepto,
    tipoReferencia: "PROYECTO_COSTO_MANO_OBRA",
    idReferencia: idAsignacion,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await marcarCostoManoObraPagado(idAsignacion, movimiento.id_movimiento, fechaPago);

  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

// porcentaje y montoFijo son mutuamente excluyentes: si viene porcentaje,
// la SP calcula el monto contra el ingreso esperado del proyecto.
export async function agregarHitoProyectoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idTipoHito = Number(formData.get("idTipoHito"));
  const nombre = String(formData.get("nombre") ?? "").trim();
  const porcentajeRaw = String(formData.get("porcentaje") ?? "").trim();
  const porcentaje = porcentajeRaw ? Number(porcentajeRaw) : null;
  const montoFijoRaw = String(formData.get("montoFijo") ?? "").trim();
  const montoFijo = montoFijoRaw ? Number(montoFijoRaw) : null;
  const fechaEstimada = String(formData.get("fechaEstimada") ?? "").trim() || null;
  const ordenRaw = String(formData.get("orden") ?? "").trim();
  const orden = ordenRaw ? Number(ordenRaw) : 0;

  if (!idProyecto || !idTipoHito || !nombre || (!porcentaje && !montoFijo)) return;
  if (porcentaje !== null && (porcentaje <= 0 || porcentaje > 100)) {
    throw new Error("El porcentaje debe ser mayor a 0 y no puede superar 100.");
  }

  await agregarHitoProyecto({
    idProyecto,
    idTipoHito,
    nombre,
    porcentaje,
    montoFijo,
    fechaEstimada,
    orden,
    idUsuarioCreacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function marcarHitoFacturadoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idHito = Number(formData.get("idHito"));
  const nroFactura = String(formData.get("nroFactura") ?? "").trim() || null;
  const fechaFacturado = String(formData.get("fechaFacturado") ?? "").trim();
  if (!idHito || !fechaFacturado) return;

  await marcarHitoFacturado(idHito, nroFactura, fechaFacturado);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

// Cobrar un hito es un flujo de dos pasos, igual que pagar una cuota de
// Pasivos: primero se crea el ingreso real, luego se enlaza el hito a
// ese ingreso.
export async function cobrarHitoProyectoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idHito = Number(formData.get("idHito"));
  const fecha = String(formData.get("fecha") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();

  if (!idProyecto || !idHito || !fecha || !monto || !concepto) return;

  // Un hito siempre se cobra en la moneda del proyecto -- sin selector de
  // moneda aqui, SP_PROYECTO_INGRESO_AGREGAR usa la del proyecto cuando
  // idMoneda llega NULL.
  const ingreso = await agregarIngresoProyecto({
    idProyecto,
    fecha,
    monto,
    idMoneda: null,
    tipoCambio: null,
    concepto,
    idUsuarioCreacion: sesion.idUsuario,
  });
  if (!ingreso.id_ingreso) return;
  await marcarHitoCobrado(idHito, ingreso.id_ingreso);

  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

// Reverso de cobrarHitoProyectoAction, mismo flujo de dos pasos al reves:
// primero se suelta el enlace hito->ingreso (SP_PROYECTO_HITO_DESHACER_COBRO,
// vuelve el hito a FACTURADO o PLANEADO segun si ya tenia numero de
// factura), y recien con el ingreso ya desenlazado se lo borra de verdad
// (SP_PROYECTO_INGRESO_ELIMINAR rechaza borrar un ingreso todavia
// enlazado a un hito, por eso el orden no se puede invertir).
export async function deshacerCobroHitoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idHito = Number(formData.get("idHito"));
  if (!idHito) return;

  const { id_ingreso: idIngreso } = await deshacerCobroHito(idHito);
  if (idIngreso) await eliminarIngresoProyecto(idIngreso);

  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function anularHitoProyectoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idHito = Number(formData.get("idHito"));
  if (!idHito) return;

  await anularHitoProyecto(idHito);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function eliminarHitoProyectoAction(formData: FormData): Promise<void> {
  await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idProyecto = Number(formData.get("idProyecto"));
  const idHito = Number(formData.get("idHito"));
  if (!idHito) return;

  await eliminarHitoProyecto(idHito);
  revalidatePath(`/facturacion/proyectos/${idProyecto}`);
  refresh();
}

export async function crearClienteAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const ruc = String(formData.get("ruc") ?? "").trim() || null;
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  const nombreContacto = String(formData.get("nombreContacto") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const correo = String(formData.get("correo") ?? "").trim() || null;

  if (!razonSocial) return;

  const resultado = await crearCliente({
    ruc,
    razonSocial,
    nombreContacto,
    telefono,
    correo,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/facturacion/proyectos/clientes");
  redirect(`/facturacion/proyectos/clientes/${resultado.id_cliente}`);
}

export async function actualizarClienteAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ESCRITURA");

  const idCliente = Number(formData.get("idCliente"));
  const ruc = String(formData.get("ruc") ?? "").trim() || null;
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  const nombreContacto = String(formData.get("nombreContacto") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const correo = String(formData.get("correo") ?? "").trim() || null;

  if (!idCliente || !razonSocial) return;

  await actualizarCliente({
    idCliente,
    ruc,
    razonSocial,
    nombreContacto,
    telefono,
    correo,
    idUsuarioModificacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/proyectos/clientes/${idCliente}`);
  refresh();
}

export async function cambiarEstadoClienteAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PROYECTOS_APP_CODIGO, "ADMIN");

  const idCliente = Number(formData.get("idCliente"));
  const activo = formData.get("activo") === "1";
  if (!idCliente) return;

  await cambiarEstadoCliente(idCliente, activo, sesion.idUsuario);
  revalidatePath("/facturacion/proyectos/clientes");
  revalidatePath(`/facturacion/proyectos/clientes/${idCliente}`);
  refresh();
}

// Los contactos externos (Cliente/Proveedor/Socio comercial) se
// generalizaron -- ver src/lib/actions/directorio-contacto.ts.
