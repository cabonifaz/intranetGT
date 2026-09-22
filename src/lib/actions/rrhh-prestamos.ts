"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/get-current-user";
import { requireGestionarPrestamos, puedeGestionarPrestamos } from "@/lib/auth/require-permiso";
import {
  crearPrestamo,
  obtenerPrestamo,
  asignarMovimientoDesembolso,
  registrarFirmaPrestamo,
  anularPrestamo,
  agregarCuotaPrestamo,
  listarCuotasPrestamo,
  actualizarCuotaPrestamo,
  eliminarCuotaPrestamo,
  solicitarPrestamo,
  otorgarPrestamo,
  marcarCuotaPagadaManual,
} from "@/lib/db/repositories/rrhh-prestamo.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarCuentas, registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";
import { obtenerContactoExterno } from "@/lib/db/repositories/directorio-contacto.repository";
import { generarCuotasIguales } from "@/lib/rrhh/planilla/cronograma-prestamo";
import { guardarArchivo } from "@/lib/storage/local-storage";

// La lectura (listados/detalle) vive bajo RRHH_PLANILLA; gestionar
// (crear, otorgar, editar cronograma, anular, solicitar en nombre de
// otro) es un alcance mas chico -- ver requireGestionarPrestamos.

const TAMANO_MAX_COMPROMISO_BYTES = 15 * 1024 * 1024;
const TIPOS_COMPROMISO_FIRMADO: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Crea el prestamo o adelanto de sueldo (nace PENDIENTE_FIRMA) con su cronograma de N cuotas
// iguales, una por mes desde el periodo inicial -- despues se pueden
// editar, agregar o quitar cuotas desde el detalle. Si se elige una
// cuenta de desembolso se registra el EGRESO por el monto total; la
// cuenta debe estar en la misma moneda del prestamo. El beneficiario es
// un trabajador (idUsuario) o un contacto del directorio (idContacto),
// exactamente uno de los dos -- ver SelectorBeneficiarioPrestamo.
export async function crearPrestamoAction(formData: FormData): Promise<void> {
  const sesion = await requireGestionarPrestamos();

  const idUsuario = Number(formData.get("idUsuario") || 0) || null;
  const idContacto = Number(formData.get("idContacto") || 0) || null;
  const idTipoPrestamo = Number(formData.get("idTipoPrestamo"));
  const montoTotal = Number(formData.get("montoTotal"));
  const idMoneda = Number(formData.get("idMoneda"));
  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const fechaOrigen = String(formData.get("fechaOrigen") ?? "").trim() || hoyIso();
  const nroCuotas = Math.trunc(Number(formData.get("nroCuotas")));
  const anioInicio = Math.trunc(Number(formData.get("anioInicio")));
  const mesInicio = Math.trunc(Number(formData.get("mesInicio")));
  const idCuentaRaw = Number(formData.get("idCuentaDesembolso") || 0);
  const idCuentaDesembolso = idCuentaRaw || null;

  if ((idUsuario === null) === (idContacto === null)) return;
  if (!idTipoPrestamo || !(montoTotal > 0) || !idMoneda) return;
  if (!(nroCuotas >= 1 && nroCuotas <= 120)) return;
  if (!(mesInicio >= 1 && mesInicio <= 12) || anioInicio < 2000) return;

  if (idContacto && !(await obtenerContactoExterno(idContacto))) return;

  const tipos = await listarMaestros("TIPO_PRESTAMO");
  if (!tipos.some((t) => t.ID_MAESTRO === idTipoPrestamo)) return;

  const monedas = await listarMaestros("MONEDA");
  const monedaSel = monedas.find((m) => m.ID_MAESTRO === idMoneda);
  if (!monedaSel) return;

  // Si no es soles, el TC pactado es obligatorio: la planilla descuenta en
  // soles y ese TC queda escrito en el compromiso firmado.
  const tipoCambio = monedaSel.CODIGO === "PEN" ? null : Number(tipoCambioRaw);
  if (monedaSel.CODIGO !== "PEN" && !(tipoCambio && tipoCambio > 0)) return;

  if (idCuentaDesembolso) {
    const cuentas = await listarCuentas();
    const cuenta = cuentas.find((c) => c.ID_CUENTA === idCuentaDesembolso);
    if (!cuenta || cuenta.ID_MONEDA !== idMoneda) return;
  }

  const { id_prestamo: idPrestamo } = await crearPrestamo({
    idUsuario,
    idContacto,
    idTipoPrestamo,
    montoTotal,
    idMoneda,
    tipoCambio,
    descripcion,
    fechaOrigen,
    idCuentaDesembolso,
    idUsuarioCreacion: sesion.idUsuario,
  });

  for (const cuota of generarCuotasIguales(montoTotal, nroCuotas, anioInicio, mesInicio)) {
    await agregarCuotaPrestamo({
      idPrestamo,
      nroCuota: cuota.nroCuota,
      anio: cuota.anio,
      mes: cuota.mes,
      monto: cuota.monto,
      calculoAutomatico: true,
      idUsuarioCreacion: sesion.idUsuario,
    });
  }

  if (idCuentaDesembolso) {
    const prestamo = await obtenerPrestamo(idPrestamo);
    const movimiento = await registrarMovimientoCuenta({
      idCuenta: idCuentaDesembolso,
      idTipoMovimiento: await obtenerIdTipoMovimientoEgreso(),
      fechaMovimiento: fechaOrigen,
      monto: montoTotal,
      concepto: `${prestamo?.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO" ? "Adelanto de sueldo" : "Prestamo"} a ${prestamo ? `${prestamo.NOMBRES} ${prestamo.APELLIDOS}` : "colaborador"} (#${idPrestamo})`,
      tipoReferencia: "RRHH_PRESTAMO",
      idReferencia: idPrestamo,
      idUsuarioCreacion: sesion.idUsuario,
    });
    if (movimiento.id_movimiento) await asignarMovimientoDesembolso(idPrestamo, movimiento.id_movimiento);
  }

  revalidatePath("/rrhh/planilla/prestamos");
  redirect(`/rrhh/planilla/prestamos/${idPrestamo}`);
}

// Autoservicio por defecto: cualquier colaborador solicita un
// prestamo/adelanto para si mismo. Quien puede gestionar prestamos
// (SUPER_ADMIN, GERENCIA_GENERAL, RRHH_JEFATURA, ADMINISTRACION_JEFATURA)
// puede ademas solicitar en nombre de un trabajador o de un contacto del
// directorio -- para cualquier otro, idUsuario/idContacto del formulario
// se ignoran y se fuerza la propia sesion, para que nadie solicite a
// nombre de otro sin permiso. Nace SOLICITADO, sin cronograma ni cuenta
// de desembolso -- eso lo define RRHH al otorgarlo (otorgarPrestamoAction).
export async function solicitarPrestamoAction(formData: FormData): Promise<void> {
  const sesion = await requireSession();
  const puedeGestionar = await puedeGestionarPrestamos(sesion.idUsuario);

  const idTipoPrestamo = Number(formData.get("idTipoPrestamo"));
  const montoTotal = Number(formData.get("montoTotal"));
  const idMoneda = Number(formData.get("idMoneda"));
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;

  let idUsuario: number | null = sesion.idUsuario;
  let idContacto: number | null = null;
  if (puedeGestionar) {
    idUsuario = Number(formData.get("idUsuario") || 0) || null;
    idContacto = Number(formData.get("idContacto") || 0) || null;
    if ((idUsuario === null) === (idContacto === null)) return;
    if (idContacto && !(await obtenerContactoExterno(idContacto))) return;
  }

  if (!idTipoPrestamo || !(montoTotal > 0) || !idMoneda) return;

  const tipos = await listarMaestros("TIPO_PRESTAMO");
  if (!tipos.some((t) => t.ID_MAESTRO === idTipoPrestamo)) return;
  const monedas = await listarMaestros("MONEDA");
  if (!monedas.some((m) => m.ID_MAESTRO === idMoneda)) return;

  await solicitarPrestamo({ idUsuario, idContacto, idTipoPrestamo, montoTotal, idMoneda, descripcion, idUsuarioCreacion: sesion.idUsuario });

  const destino = idContacto ? "/rrhh/planilla/prestamos" : `/rrhh/directorio/${idUsuario}`;
  revalidatePath(destino);
  redirect(destino);
}

// RRHH revisa una solicitud y la otorga: define fecha real de
// desembolso, TC (si no es soles), cuenta de desembolso (opcional) y el
// cronograma de cuotas -- desde aca sigue identico a un prestamo creado
// directo (compromiso de pago, firma, descuento en planilla).
export async function otorgarPrestamoAction(formData: FormData): Promise<void> {
  const sesion = await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const fechaOrigen = String(formData.get("fechaOrigen") ?? "").trim() || hoyIso();
  const nroCuotas = Math.trunc(Number(formData.get("nroCuotas")));
  const anioInicio = Math.trunc(Number(formData.get("anioInicio")));
  const mesInicio = Math.trunc(Number(formData.get("mesInicio")));
  const idCuentaRaw = Number(formData.get("idCuentaDesembolso") || 0);
  const idCuentaDesembolso = idCuentaRaw || null;

  if (!idPrestamo) return;
  if (!(nroCuotas >= 1 && nroCuotas <= 120)) return;
  if (!(mesInicio >= 1 && mesInicio <= 12) || anioInicio < 2000) return;

  const prestamo = await obtenerPrestamo(idPrestamo);
  if (!prestamo || prestamo.ESTADO_PRESTAMO_CODIGO !== "SOLICITADO") return;

  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = prestamo.MONEDA_CODIGO === "PEN" ? null : Number(tipoCambioRaw);
  if (prestamo.MONEDA_CODIGO !== "PEN" && !(tipoCambio && tipoCambio > 0)) return;

  if (idCuentaDesembolso) {
    const cuentas = await listarCuentas();
    const cuenta = cuentas.find((c) => c.ID_CUENTA === idCuentaDesembolso);
    if (!cuenta || cuenta.ID_MONEDA !== prestamo.ID_MONEDA) return;
  }

  await otorgarPrestamo(idPrestamo, fechaOrigen, tipoCambio, idCuentaDesembolso);

  for (const cuota of generarCuotasIguales(Number(prestamo.MONTO_TOTAL), nroCuotas, anioInicio, mesInicio)) {
    await agregarCuotaPrestamo({
      idPrestamo,
      nroCuota: cuota.nroCuota,
      anio: cuota.anio,
      mes: cuota.mes,
      monto: cuota.monto,
      calculoAutomatico: true,
      idUsuarioCreacion: sesion.idUsuario,
    });
  }

  if (idCuentaDesembolso) {
    const movimiento = await registrarMovimientoCuenta({
      idCuenta: idCuentaDesembolso,
      idTipoMovimiento: await obtenerIdTipoMovimientoEgreso(),
      fechaMovimiento: fechaOrigen,
      monto: Number(prestamo.MONTO_TOTAL),
      concepto: `${prestamo.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO" ? "Adelanto de sueldo" : "Prestamo"} a ${prestamo.NOMBRES} ${prestamo.APELLIDOS} (#${idPrestamo})`,
      tipoReferencia: "RRHH_PRESTAMO",
      idReferencia: idPrestamo,
      idUsuarioCreacion: sesion.idUsuario,
    });
    if (movimiento.id_movimiento) await asignarMovimientoDesembolso(idPrestamo, movimiento.id_movimiento);
  }

  revalidatePath(`/rrhh/planilla/prestamos/${idPrestamo}`);
  revalidatePath("/rrhh/planilla/prestamos");
  redirect(`/rrhh/planilla/prestamos/${idPrestamo}`);
}

function revalidarPrestamo(idPrestamo: number): void {
  revalidatePath(`/rrhh/planilla/prestamos/${idPrestamo}`);
  revalidatePath("/rrhh/planilla/prestamos");
  refresh();
}

// Cuota extra a mano en cualquier periodo -- el caso tipico es descontar
// una cuota mayor con la gratificacion de julio o diciembre. No renumera
// las demas: toma el siguiente correlativo.
export async function agregarCuotaPrestamoAction(formData: FormData): Promise<void> {
  const sesion = await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const anio = Math.trunc(Number(formData.get("anio")));
  const mes = Math.trunc(Number(formData.get("mes")));
  const monto = Number(formData.get("monto"));
  if (!idPrestamo || !(monto > 0) || !(mes >= 1 && mes <= 12) || anio < 2000) return;

  const cuotas = await listarCuotasPrestamo(idPrestamo);
  const siguiente = cuotas.length > 0 ? Math.max(...cuotas.map((c) => c.NRO_CUOTA)) + 1 : 1;

  await agregarCuotaPrestamo({
    idPrestamo,
    nroCuota: siguiente,
    anio,
    mes,
    monto,
    calculoAutomatico: false,
    idUsuarioCreacion: sesion.idUsuario,
  });

  revalidarPrestamo(idPrestamo);
}

export async function actualizarCuotaPrestamoAction(formData: FormData): Promise<void> {
  await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const idCuota = Number(formData.get("idCuota"));
  const anio = Math.trunc(Number(formData.get("anio")));
  const mes = Math.trunc(Number(formData.get("mes")));
  const monto = Number(formData.get("monto"));
  if (!idPrestamo || !idCuota || !(monto > 0) || !(mes >= 1 && mes <= 12) || anio < 2000) return;

  await actualizarCuotaPrestamo(idCuota, anio, mes, monto);
  revalidarPrestamo(idPrestamo);
}

export async function eliminarCuotaPrestamoAction(formData: FormData): Promise<void> {
  await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const idCuota = Number(formData.get("idCuota"));
  if (!idPrestamo || !idCuota) return;

  await eliminarCuotaPrestamo(idCuota);
  revalidarPrestamo(idPrestamo);
}

export async function anularPrestamoAction(formData: FormData): Promise<void> {
  const sesion = await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!idPrestamo || !motivo) return;

  await anularPrestamo(idPrestamo, motivo, sesion.idUsuario);
  revalidarPrestamo(idPrestamo);
}

// Sube el compromiso firmado (PDF o foto/escaneo). Al registrarlo el
// prestamo pasa a ACTIVO y sus cuotas empiezan a descontarse en planilla;
// volver a subir reemplaza el archivo.
export async function subirCompromisoFirmadoAction(formData: FormData): Promise<void> {
  const sesion = await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const archivo = formData.get("archivo");
  if (!idPrestamo || !(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_COMPROMISO_BYTES) return;

  const extension = TIPOS_COMPROMISO_FIRMADO[archivo.type];
  if (!extension) return;

  const prestamo = await obtenerPrestamo(idPrestamo);
  if (!prestamo || prestamo.ESTADO_PRESTAMO_CODIGO === "ANULADO") return;

  const rutaRelativa = `rrhh/prestamos/${idPrestamo}/compromiso-firmado.${extension}`;
  await guardarArchivo(rutaRelativa, new Uint8Array(await archivo.arrayBuffer()));
  await registrarFirmaPrestamo(idPrestamo, rutaRelativa, sesion.idUsuario);

  revalidarPrestamo(idPrestamo);
}

// Para un prestamo con beneficiario CONTACTO (sin planilla de donde
// descontar): marca a mano una cuota pendiente como pagada -- el SP
// mismo restringe esto a prestamos de contacto, ver
// SP_RRHH_PRESTAMO_CUOTA_MARCAR_PAGADA_MANUAL.
export async function marcarCuotaPagadaManualAction(formData: FormData): Promise<void> {
  await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const idCuota = Number(formData.get("idCuota"));
  if (!idPrestamo || !idCuota) return;

  await marcarCuotaPagadaManual(idCuota);
  revalidarPrestamo(idPrestamo);
}
