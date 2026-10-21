"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  crearDeclaracion,
  actualizarDeclaracion,
  obtenerDeclaracion,
  subirDocumentoDeclaracion,
  presentarDeclaracion,
  marcarDeclaracionPagada,
  anularDeclaracion,
  eliminarDeclaracion,
} from "@/lib/db/repositories/declaracion-tributaria.repository";
import {
  registrarMovimientoCuenta,
  obtenerIdTipoMovimientoEgreso,
  obtenerIdTipoMovimientoIngreso,
  obtenerCuentaPorTipo,
} from "@/lib/db/repositories/cuenta.repository";
import { guardarArchivo } from "@/lib/storage/local-storage";

const IMPUESTOS_APP_CODIGO = "IMPUESTOS_EMPRESA";

const TAMANO_MAX_ADJUNTO_BYTES = 15 * 1024 * 1024;
const TIPOS_ADJUNTO_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

function rutaDeclaracion(idDeclaracion: number): string {
  return `/facturacion/impuestos/${idDeclaracion}`;
}

function numeroOpcional(formData: FormData, campo: string): number | null {
  const raw = String(formData.get(campo) ?? "").trim();
  return raw ? Number(raw) : null;
}

// Idempotente por periodo (ver guard del SP) -- si ya existe, igual
// redirige a la declaracion existente en vez de fallar.
export async function crearDeclaracionAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idTipoDeclaracion = Number(formData.get("idTipoDeclaracion"));
  const anio = Number(formData.get("anio"));
  const mesRaw = String(formData.get("mes") ?? "").trim();
  const mes = mesRaw ? Number(mesRaw) : 0;
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "").trim();

  if (!idTipoDeclaracion || !anio || !fechaVencimiento) return;

  const resultado = await crearDeclaracion(idTipoDeclaracion, anio, mes, fechaVencimiento, sesion.idUsuario);
  if (!resultado.id_declaracion) return;

  revalidatePath("/facturacion/impuestos");
  redirect(rutaDeclaracion(resultado.id_declaracion));
}

export interface ActualizarDeclaracionState {
  ok: boolean;
  error?: string;
}

// Mismo patron {ok,error} que el resto del repo (ver EmitirConformidadState)
// -- el no-op del SP (ya no esta BORRADOR) o una validacion de monto
// invalida ahora se avisan en pantalla.
export async function actualizarDeclaracionAction(
  _prevState: ActualizarDeclaracionState,
  formData: FormData,
): Promise<ActualizarDeclaracionState> {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idDeclaracion = Number(formData.get("idDeclaracion"));
  const fechaVencimiento = String(formData.get("fechaVencimiento") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim() || null;

  if (!idDeclaracion || !fechaVencimiento) {
    return { ok: false, error: "Falta la fecha de vencimiento." };
  }

  const declaracion = await obtenerDeclaracion(idDeclaracion);
  if (!declaracion || declaracion.ESTADO_DECLARACION_CODIGO !== "BORRADOR") {
    return { ok: false, error: "Esta declaracion ya no esta en borrador." };
  }

  const ventasGravadas = numeroOpcional(formData, "ventasGravadas");
  const comprasGravadas = numeroOpcional(formData, "comprasGravadas");
  const igvVentas = numeroOpcional(formData, "igvVentas");
  const igvCompras = numeroOpcional(formData, "igvCompras");
  const igvResultante = numeroOpcional(formData, "igvResultante");
  const pagoACuentaRenta = numeroOpcional(formData, "pagoACuentaRenta");
  const impuestoCalculadoRenta = numeroOpcional(formData, "impuestoCalculadoRenta");
  const pagosACuentaAcumulados = numeroOpcional(formData, "pagosACuentaAcumulados");
  const saldoRenta = numeroOpcional(formData, "saldoRenta");
  const montoTotalAPagar = numeroOpcional(formData, "montoTotalAPagar") ?? 0;

  await actualizarDeclaracion({
    idDeclaracion,
    fechaVencimiento,
    ventasGravadas,
    comprasGravadas,
    igvVentas,
    igvCompras,
    igvResultante,
    pagoACuentaRenta,
    impuestoCalculadoRenta,
    pagosACuentaAcumulados,
    saldoRenta,
    montoTotalAPagar,
    notas,
    idUsuarioModificacion: sesion.idUsuario,
  });

  revalidatePath(rutaDeclaracion(idDeclaracion));
  refresh();
  return { ok: true };
}

export async function subirDocumentoDeclaracionAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idDeclaracion = Number(formData.get("idDeclaracion"));
  const archivo = formData.get("archivo");
  if (!idDeclaracion || !(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_ADJUNTO_BYTES) return;

  const extension = TIPOS_ADJUNTO_PERMITIDOS[archivo.type];
  if (!extension) return;

  const ruta = `impuestos/declaraciones/${idDeclaracion}/constancia.${extension}`;
  await guardarArchivo(ruta, new Uint8Array(await archivo.arrayBuffer()));
  await subirDocumentoDeclaracion(idDeclaracion, ruta, sesion.idUsuario);

  revalidatePath(rutaDeclaracion(idDeclaracion));
  refresh();
}

export interface PresentarDeclaracionState {
  ok: boolean;
  error?: string;
}

// Si el periodo genero saldo a favor (IGV_RESULTANTE < 0 en la mensual,
// SALDO_RENTA < 0 en la DJ anual), registra el INGRESO correspondiente en
// la cuenta IGV_FAVOR/RENTA_FAVOR (ver obtenerCuentaPorTipo) ANTES de
// pasar la declaracion a PRESENTADA -- mismo patron de dos pasos sin
// transaccion anidada que ya usa pagarCuotaAction (Pasivos). Si esa
// cuenta todavia no existe (nunca se creo desde Cuentas), la declaracion
// igual se puede presentar, simplemente sin acreditar nada -- se avisa
// en pantalla para que RRHH/Facturacion cree la cuenta si corresponde.
export async function presentarDeclaracionAction(
  _prevState: PresentarDeclaracionState,
  formData: FormData,
): Promise<PresentarDeclaracionState> {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idDeclaracion = Number(formData.get("idDeclaracion"));
  if (!idDeclaracion) return { ok: false, error: "Declaracion invalida." };

  const declaracion = await obtenerDeclaracion(idDeclaracion);
  if (!declaracion || declaracion.ESTADO_DECLARACION_CODIGO !== "BORRADOR") {
    return { ok: false, error: "Esta declaracion ya no esta en borrador." };
  }

  const esMensual = declaracion.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL";
  const resultadoPeriodo = esMensual
    ? declaracion.IGV_RESULTANTE !== null
      ? Number(declaracion.IGV_RESULTANTE)
      : null
    : declaracion.SALDO_RENTA !== null
      ? Number(declaracion.SALDO_RENTA)
      : null;

  let idMovimientoCredito: number | null = null;
  let avisoSinCuenta: string | undefined;

  if (resultadoPeriodo !== null && resultadoPeriodo < 0) {
    const codigoCuenta = esMensual ? "IGV_FAVOR" : "RENTA_FAVOR";
    const cuenta = await obtenerCuentaPorTipo(codigoCuenta);
    if (cuenta) {
      const idTipoIngreso = await obtenerIdTipoMovimientoIngreso();
      const periodoTexto = esMensual ? `${declaracion.MES}/${declaracion.ANIO}` : `${declaracion.ANIO}`;
      const movimiento = await registrarMovimientoCuenta({
        idCuenta: cuenta.ID_CUENTA,
        idTipoMovimiento: idTipoIngreso,
        fechaMovimiento: new Date().toISOString().slice(0, 10),
        monto: Math.abs(resultadoPeriodo),
        concepto: `Saldo a favor -- declaracion ${periodoTexto}`,
        tipoReferencia: "DECLARACION_TRIBUTARIA",
        idReferencia: idDeclaracion,
        idUsuarioCreacion: sesion.idUsuario,
      });
      idMovimientoCredito = movimiento.id_movimiento;
    } else {
      avisoSinCuenta = `Se presento, pero no se acredito el saldo a favor: no existe una cuenta de tipo "${codigoCuenta === "IGV_FAVOR" ? "IGV a favor" : "Renta a favor"}" en Cuentas. Crea esa cuenta y ajusta el saldo a mano si corresponde.`;
    }
  }

  await presentarDeclaracion(idDeclaracion, idMovimientoCredito);

  revalidatePath(rutaDeclaracion(idDeclaracion));
  revalidatePath("/facturacion/cuentas");
  refresh();
  return avisoSinCuenta ? { ok: true, error: avisoSinCuenta } : { ok: true };
}

export interface PagarDeclaracionState {
  ok: boolean;
  error?: string;
}

export async function pagarDeclaracionAction(
  _prevState: PagarDeclaracionState,
  formData: FormData,
): Promise<PagarDeclaracionState> {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idDeclaracion = Number(formData.get("idDeclaracion"));
  const idCuenta = Number(formData.get("idCuenta"));
  const fechaPago = String(formData.get("fechaPago") ?? "").trim();

  if (!idDeclaracion || !idCuenta || !fechaPago) {
    return { ok: false, error: "Elige la cuenta de pago y la fecha." };
  }

  const declaracion = await obtenerDeclaracion(idDeclaracion);
  if (!declaracion || declaracion.ESTADO_DECLARACION_CODIGO !== "PRESENTADA") {
    return { ok: false, error: "Esta declaracion no esta presentada todavia, o ya fue pagada." };
  }
  const monto = Number(declaracion.MONTO_TOTAL_A_PAGAR);
  if (!(monto > 0)) {
    return { ok: false, error: "Esta declaracion no tiene ningun monto pendiente de pago." };
  }

  const idTipoEgreso = await obtenerIdTipoMovimientoEgreso();
  const periodoTexto = declaracion.TIPO_DECLARACION_CODIGO === "IGV_RENTA_MENSUAL" ? `${declaracion.MES}/${declaracion.ANIO}` : `${declaracion.ANIO}`;

  const movimiento = await registrarMovimientoCuenta({
    idCuenta,
    idTipoMovimiento: idTipoEgreso,
    fechaMovimiento: fechaPago,
    monto,
    concepto: `Pago declaracion ${declaracion.TIPO_DECLARACION_DESCRIPCION} -- ${periodoTexto}`,
    tipoReferencia: "DECLARACION_TRIBUTARIA",
    idReferencia: idDeclaracion,
    idUsuarioCreacion: sesion.idUsuario,
  });

  await marcarDeclaracionPagada(idDeclaracion, movimiento.id_movimiento, idCuenta, `${fechaPago} 00:00:00`);

  revalidatePath(rutaDeclaracion(idDeclaracion));
  revalidatePath(`/facturacion/cuentas/${idCuenta}`);
  refresh();
  return { ok: true };
}

export async function anularDeclaracionAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idDeclaracion = Number(formData.get("idDeclaracion"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!idDeclaracion || !motivo) return;

  await anularDeclaracion(idDeclaracion, motivo, sesion.idUsuario);

  revalidatePath(rutaDeclaracion(idDeclaracion));
  revalidatePath("/facturacion/impuestos");
  refresh();
}

export async function eliminarDeclaracionAction(formData: FormData): Promise<void> {
  await requirePermiso(IMPUESTOS_APP_CODIGO, "ESCRITURA");

  const idDeclaracion = Number(formData.get("idDeclaracion"));
  if (!idDeclaracion) return;

  await eliminarDeclaracion(idDeclaracion);
  revalidatePath("/facturacion/impuestos");
  redirect("/facturacion/impuestos");
}
