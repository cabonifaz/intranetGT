"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  crearProveedor,
  actualizarProveedor,
  cambiarEstadoProveedor,
  crearCompra,
  registrarPagoCompra,
} from "@/lib/db/repositories/compra.repository";
import { registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";

const COMPRAS_APP_CODIGO = "COMPRAS_EMPRESA";

export async function crearProveedorAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(COMPRAS_APP_CODIGO, "ESCRITURA");

  const ruc = String(formData.get("ruc") ?? "").trim() || null;
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  const esPersonaNatural = formData.get("esPersonaNatural") === "1";
  const nombreContacto = String(formData.get("nombreContacto") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const correo = String(formData.get("correo") ?? "").trim() || null;

  if (!razonSocial) return;

  const resultado = await crearProveedor({
    ruc,
    razonSocial,
    esPersonaNatural,
    nombreContacto,
    telefono,
    correo,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/facturacion/compras/proveedores");
  redirect(`/facturacion/compras/proveedores/${resultado.id_proveedor}`);
}

export async function actualizarProveedorAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(COMPRAS_APP_CODIGO, "ESCRITURA");

  const idProveedor = Number(formData.get("idProveedor"));
  const ruc = String(formData.get("ruc") ?? "").trim() || null;
  const razonSocial = String(formData.get("razonSocial") ?? "").trim();
  const esPersonaNatural = formData.get("esPersonaNatural") === "1";
  const nombreContacto = String(formData.get("nombreContacto") ?? "").trim() || null;
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const correo = String(formData.get("correo") ?? "").trim() || null;

  if (!idProveedor || !razonSocial) return;

  await actualizarProveedor({
    idProveedor,
    ruc,
    razonSocial,
    esPersonaNatural,
    nombreContacto,
    telefono,
    correo,
    idUsuarioModificacion: sesion.idUsuario,
  });
  revalidatePath(`/facturacion/compras/proveedores/${idProveedor}`);
  refresh();
}

export async function cambiarEstadoProveedorAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(COMPRAS_APP_CODIGO, "ADMIN");

  const idProveedor = Number(formData.get("idProveedor"));
  const activo = formData.get("activo") === "1";
  if (!idProveedor) return;

  await cambiarEstadoProveedor(idProveedor, activo, sesion.idUsuario);
  revalidatePath("/facturacion/compras/proveedores");
  revalidatePath(`/facturacion/compras/proveedores/${idProveedor}`);
  refresh();
}

export async function crearCompraAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(COMPRAS_APP_CODIGO, "ESCRITURA");

  const idProveedor = Number(formData.get("idProveedor"));
  const idProyecto = Number(formData.get("idProyecto") || 0) || null;
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const nroDocumento = String(formData.get("nroDocumento") ?? "").trim() || null;
  const fechaCompra = String(formData.get("fechaCompra") ?? "").trim();
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "").trim() || null;
  const montoTotalRaw = String(formData.get("montoTotal") ?? "").trim();
  const montoTotal = montoTotalRaw ? Number(montoTotalRaw) : 0;
  const idMoneda = Number(formData.get("idMoneda"));
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = tipoCambioRaw ? Number(tipoCambioRaw) : null;

  if (!idProveedor || !descripcion || !fechaCompra || !montoTotal || !idMoneda) return;

  const resultado = await crearCompra({
    idProveedor,
    idProyecto,
    descripcion,
    nroDocumento,
    fechaCompra,
    fechaVencimiento,
    montoTotal,
    idMoneda,
    tipoCambio,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath("/facturacion/compras");
  redirect(`/facturacion/compras/${resultado.id_compra}`);
}

export async function registrarPagoCompraAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(COMPRAS_APP_CODIGO, "ESCRITURA");

  const idCompra = Number(formData.get("idCompra"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = montoRaw ? Number(montoRaw) : 0;
  const concepto = String(formData.get("concepto") ?? "").trim();

  if (!idCompra || !idCuenta || !fechaPago || !monto || !concepto) return;

  const idTipoMovimiento = await obtenerIdTipoMovimientoEgreso();

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento,
    fechaMovimiento: fechaPago,
    monto,
    concepto,
    tipoReferencia: "COMPRA",
    idReferencia: idCompra,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await registrarPagoCompra({
    idCompra,
    idCuenta,
    idMovimiento: movimiento.id_movimiento,
    monto,
    fechaPago,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidatePath(`/facturacion/compras/${idCompra}`);
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
}

