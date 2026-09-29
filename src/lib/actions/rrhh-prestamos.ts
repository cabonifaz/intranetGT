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
  eliminarPrestamo,
} from "@/lib/db/repositories/rrhh-prestamo.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { listarCuentas, registrarMovimientoCuenta, obtenerIdTipoMovimientoEgreso } from "@/lib/db/repositories/cuenta.repository";
import { obtenerContactoExterno } from "@/lib/db/repositories/directorio-contacto.repository";
import { obtenerSueldoFijoVigente } from "@/lib/db/repositories/contrato.repository";
import { listarAplicaciones } from "@/lib/db/repositories/aplicacion.repository";
import { crearNotificacion } from "@/lib/db/repositories/notificacion.repository";
import { generarCuotasIguales } from "@/lib/rrhh/planilla/cronograma-prestamo";
import { montoMaximoAdelanto, obtenerPorcentajeMaximoAdelanto } from "@/lib/rrhh/planilla/adelanto-sueldo";
import { guardarArchivo } from "@/lib/storage/local-storage";
import type { PrestamoRow } from "@/types/db";

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

// Estado devuelto por las acciones de "guardar" (Nuevo prestamo,
// Solicitar, Otorgar) para que el formulario pueda mostrar un mensaje
// concreto en vez de que el intento simplemente no haga nada -- silencioso
// para la base de datos (no-op), pero nunca silencioso para quien lo
// esta llenando: necesita saber que fallo y que corregir, o poder
// reportarlo si el mensaje no le alcanza. `codigo` identifica el punto
// exacto del codigo que devolvio el error (PRES-<ACCION>-NN) -- con solo
// un pantallazo del mensaje se ubica la causa exacta sin tener que pedir
// que describan el problema con mas detalle.
export interface GuardarPrestamoState {
  ok: boolean;
  error?: string;
  codigo?: string;
}

// Un adelanto es a cuenta de un sueldo -- nunca para un contacto, siempre
// en la misma moneda del sueldo (no tiene sentido adelantar en una
// moneda distinta a la que se paga), y nunca por mas del tope (ver
// montoMaximoAdelanto) del sueldo fijo vigente del beneficiario (planilla
// o locador con tarifa fija, no por hora). Chequeo previo en la app para
// responder con un no-op limpio antes de llegar al guard equivalente en
// SP_RRHH_PRESTAMO_CREAR/SOLICITAR (que es el que de verdad protege la
// integridad si esto se saltara).
async function excedeTopeAdelanto(idUsuario: number | null, idMoneda: number, montoTotal: number): Promise<boolean> {
  if (!idUsuario) return true;
  const [sueldo, porcentajeMaximo] = await Promise.all([obtenerSueldoFijoVigente(idUsuario), obtenerPorcentajeMaximoAdelanto()]);
  if (!sueldo || sueldo.ID_MONEDA !== idMoneda) return true;
  return montoTotal > montoMaximoAdelanto(Number(sueldo.SUELDO_FIJO), porcentajeMaximo);
}

// Number(algo) puede dar NaN (campo ausente, valor no numerico) -- las
// comparaciones directas con NaN son siempre false, asi que un chequeo
// como "anioInicio < 2000" NO detecta un NaN (deja pasar el valor
// invalido en vez de rechazarlo). Number.isInteger(NaN) es false, asi que
// este chequeo si lo atrapa -- evita que un NaN llegue como parametro a
// un SP (mysql2 lo manda como el token sin comillas "NaN", que MySQL
// interpreta como columna inexistente y tira un error de SQL sin
// capturar, no un no-op silencioso).
function cronogramaValido(nroCuotas: number, anioInicio: number, mesInicio: number): boolean {
  return (
    Number.isInteger(nroCuotas) &&
    nroCuotas >= 1 &&
    nroCuotas <= 120 &&
    Number.isInteger(mesInicio) &&
    mesInicio >= 1 &&
    mesInicio <= 12 &&
    Number.isInteger(anioInicio) &&
    anioInicio >= 2000
  );
}

// Crea el prestamo o adelanto de sueldo (nace PENDIENTE_FIRMA) con su cronograma de N cuotas
// iguales, una por mes desde el periodo inicial -- despues se pueden
// editar, agregar o quitar cuotas desde el detalle. Si se elige una
// cuenta de desembolso se registra el EGRESO por el monto total; la
// cuenta debe estar en la misma moneda del prestamo. El beneficiario es
// un trabajador (idUsuario) o un contacto del directorio (idContacto),
// exactamente uno de los dos -- ver SelectorBeneficiarioPrestamo.
// Devuelve {ok,error} en vez de solo no hacer nada -- toda validacion
// fallida (y cualquier rechazo del guard en SQL) le dice a quien lo
// llena que paso, para que lo corrija o lo reporte si no le queda claro.
export async function crearPrestamoAction(_prevState: GuardarPrestamoState, formData: FormData): Promise<GuardarPrestamoState> {
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

  if ((idUsuario === null) === (idContacto === null)) {
    return { ok: false, codigo: "PRES-CREAR-01", error: "Elige exactamente un beneficiario: un trabajador o un contacto del directorio." };
  }
  if (!idTipoPrestamo || !(montoTotal > 0) || !idMoneda) {
    return { ok: false, codigo: "PRES-CREAR-02", error: "Completa el tipo, el monto y la moneda." };
  }
  if (!cronogramaValido(nroCuotas, anioInicio, mesInicio)) {
    return { ok: false, codigo: "PRES-CREAR-03", error: "El cronograma no es válido: revisa el número de cuotas, el mes y el año de inicio." };
  }

  if (idContacto && !(await obtenerContactoExterno(idContacto))) {
    return { ok: false, codigo: "PRES-CREAR-04", error: "El contacto seleccionado ya no existe. Vuelve a elegirlo." };
  }

  const tipos = await listarMaestros("TIPO_PRESTAMO");
  const tipoSel = tipos.find((t) => t.ID_MAESTRO === idTipoPrestamo);
  if (!tipoSel) return { ok: false, codigo: "PRES-CREAR-05", error: "El tipo de préstamo elegido no es válido." };

  // Un adelanto es a cuenta de un sueldo: nunca para un contacto, y nunca
  // por mas del tope de su sueldo fijo vigente.
  if (tipoSel.CODIGO === "ADELANTO_SUELDO") {
    if (idContacto) {
      return { ok: false, codigo: "PRES-CREAR-06", error: "Un adelanto de sueldo no puede ser para un contacto del directorio." };
    }
    if (await excedeTopeAdelanto(idUsuario, idMoneda, montoTotal)) {
      return {
        ok: false,
        codigo: "PRES-CREAR-07",
        error: "El monto supera el tope de adelanto permitido, la moneda no coincide con el sueldo del beneficiario, o no tiene un sueldo fijo vigente.",
      };
    }
  }

  const monedas = await listarMaestros("MONEDA");
  const monedaSel = monedas.find((m) => m.ID_MAESTRO === idMoneda);
  if (!monedaSel) return { ok: false, codigo: "PRES-CREAR-08", error: "La moneda elegida no es válida." };

  // Si no es soles, el TC pactado es obligatorio: la planilla descuenta en
  // soles y ese TC queda escrito en el compromiso firmado.
  const tipoCambio = monedaSel.CODIGO === "PEN" ? null : Number(tipoCambioRaw);
  if (monedaSel.CODIGO !== "PEN" && !(tipoCambio && tipoCambio > 0)) {
    return { ok: false, codigo: "PRES-CREAR-09", error: "Falta el tipo de cambio pactado (obligatorio si el préstamo no es en soles)." };
  }

  if (idCuentaDesembolso) {
    const cuentas = await listarCuentas();
    const cuenta = cuentas.find((c) => c.ID_CUENTA === idCuentaDesembolso);
    if (!cuenta || cuenta.ID_MONEDA !== idMoneda) {
      return { ok: false, codigo: "PRES-CREAR-10", error: "La cuenta de desembolso elegida no existe o no coincide con la moneda del préstamo." };
    }
  }

  // Un no-op silencioso del guard en SQL (SP_RRHH_PRESTAMO_CREAR) hace que
  // crearPrestamo() lance -- por ejemplo, si algun chequeo de la app y el
  // del SP quedaran desalineados. No debe tumbar la pagina con un error
  // generico: se avisa igual que cualquier otra validacion fallida de
  // este formulario, para que la persona lo reporte si no encuentra el motivo.
  let idPrestamo: number;
  try {
    ({ id_prestamo: idPrestamo } = await crearPrestamo({
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
    }));
  } catch {
    return { ok: false, codigo: "PRES-CREAR-99", error: "No se pudo crear el préstamo. Vuelve a intentar; si persiste, repórtalo." };
  }

  // El prestamo ya quedo creado (arriba) -- de aca en adelante son pasos
  // extra (cuotas, movimiento de caja) sin una transaccion en comun que
  // los una (MySQL no anida transacciones de verdad entre estos SPs, ver
  // nota de sp_pasivo.sql). Si algo de esto falla no debe tumbar la
  // pagina -- se avisa y se manda al detalle ya creado, donde se puede
  // revisar/completar el cronograma a mano.
  try {
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
  } catch {
    revalidatePath("/rrhh/planilla/prestamos");
    return {
      ok: false,
      codigo: "PRES-CREAR-98",
      error: `El préstamo #${idPrestamo} se creó, pero falló al generar el cronograma o el movimiento de caja. Revísalo desde el detalle y complétalo a mano; repórtalo si vuelve a pasar.`,
    };
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
// nombre de otro sin permiso. Nace SOLICITADO, sin cuenta de desembolso
// ni TC -- eso lo completa RRHH al otorgarlo (otorgarPrestamoAction). Un
// PRESTAMO si debe traer de una vez el cronograma que propone (N de
// cuotas + mes/anio de inicio) -- RRHH parte de eso al otorgar, pudiendo
// ajustarlo. Un ADELANTO_SUELDO no pide cronograma (una sola cuota) y en
// cambio esta limitado a un % del sueldo fijo del beneficiario. Devuelve
// {ok,error} -- ver comentario de crearPrestamoAction.
export async function solicitarPrestamoAction(_prevState: GuardarPrestamoState, formData: FormData): Promise<GuardarPrestamoState> {
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
    if ((idUsuario === null) === (idContacto === null)) {
      return { ok: false, codigo: "PRES-SOL-01", error: "Elige exactamente un beneficiario: un trabajador o un contacto del directorio." };
    }
    if (idContacto && !(await obtenerContactoExterno(idContacto))) {
      return { ok: false, codigo: "PRES-SOL-02", error: "El contacto seleccionado ya no existe. Vuelve a elegirlo." };
    }
  }

  if (!idTipoPrestamo || !(montoTotal > 0) || !idMoneda) {
    return { ok: false, codigo: "PRES-SOL-03", error: "Completa el tipo, el monto y la moneda." };
  }

  const tipos = await listarMaestros("TIPO_PRESTAMO");
  const tipoSel = tipos.find((t) => t.ID_MAESTRO === idTipoPrestamo);
  if (!tipoSel) return { ok: false, codigo: "PRES-SOL-04", error: "El tipo de préstamo elegido no es válido." };
  const monedas = await listarMaestros("MONEDA");
  if (!monedas.some((m) => m.ID_MAESTRO === idMoneda)) {
    return { ok: false, codigo: "PRES-SOL-05", error: "La moneda elegida no es válida." };
  }

  const esAdelanto = tipoSel.CODIGO === "ADELANTO_SUELDO";

  let nroCuotas: number | null = null;
  let anioInicio: number | null = null;
  let mesInicio: number | null = null;
  if (esAdelanto) {
    if (idContacto) {
      return { ok: false, codigo: "PRES-SOL-06", error: "Un adelanto de sueldo no puede ser para un contacto del directorio." };
    }
    if (await excedeTopeAdelanto(idUsuario, idMoneda, montoTotal)) {
      return {
        ok: false,
        codigo: "PRES-SOL-07",
        error: "El monto supera el tope de adelanto permitido, la moneda no coincide con tu sueldo, o no tienes un sueldo fijo vigente.",
      };
    }
  } else {
    nroCuotas = Math.trunc(Number(formData.get("nroCuotas")));
    anioInicio = Math.trunc(Number(formData.get("anioInicio")));
    mesInicio = Math.trunc(Number(formData.get("mesInicio")));
    if (!cronogramaValido(nroCuotas, anioInicio, mesInicio)) {
      return { ok: false, codigo: "PRES-SOL-08", error: "El cronograma no es válido: revisa el número de cuotas, el mes y el año de inicio." };
    }
  }

  // Mismo criterio que crearPrestamoAction: si el guard en SQL rechaza en
  // silencio (SP_RRHH_PRESTAMO_SOLICITAR) y solicitarPrestamo() lanza, se
  // avisa en vez de tumbar la pagina.
  try {
    await solicitarPrestamo({
      idUsuario,
      idContacto,
      idTipoPrestamo,
      montoTotal,
      idMoneda,
      descripcion,
      nroCuotas,
      anioInicio,
      mesInicio,
      idUsuarioCreacion: sesion.idUsuario,
    });
  } catch {
    return { ok: false, codigo: "PRES-SOL-99", error: "No se pudo registrar la solicitud. Vuelve a intentar; si persiste, repórtalo." };
  }

  const destino = idContacto ? "/rrhh/planilla/prestamos" : `/rrhh/directorio/${idUsuario}`;
  revalidatePath(destino);
  redirect(destino);
}

// RRHH revisa una solicitud y la otorga: define fecha real de
// desembolso, TC (si no es soles), cuenta de desembolso (opcional) y el
// cronograma de cuotas -- desde aca sigue identico a un prestamo creado
// directo (compromiso de pago, firma, descuento en planilla). Devuelve
// {ok,error} -- ver comentario de crearPrestamoAction.
export async function otorgarPrestamoAction(_prevState: GuardarPrestamoState, formData: FormData): Promise<GuardarPrestamoState> {
  const sesion = await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  const fechaOrigen = String(formData.get("fechaOrigen") ?? "").trim() || hoyIso();
  const nroCuotas = Math.trunc(Number(formData.get("nroCuotas")));
  const anioInicio = Math.trunc(Number(formData.get("anioInicio")));
  const mesInicio = Math.trunc(Number(formData.get("mesInicio")));
  const idCuentaRaw = Number(formData.get("idCuentaDesembolso") || 0);
  const idCuentaDesembolso = idCuentaRaw || null;

  if (!idPrestamo) return { ok: false, codigo: "PRES-OTOR-01", error: "No se encontró la solicitud." };
  if (!cronogramaValido(nroCuotas, anioInicio, mesInicio)) {
    return { ok: false, codigo: "PRES-OTOR-02", error: "El cronograma no es válido: revisa el número de cuotas, el mes y el año de inicio." };
  }

  const prestamo = await obtenerPrestamo(idPrestamo);
  if (!prestamo || prestamo.ESTADO_PRESTAMO_CODIGO !== "SOLICITADO") {
    return { ok: false, codigo: "PRES-OTOR-03", error: "Esta solicitud ya no está pendiente de otorgar (puede que alguien ya la haya procesado)." };
  }

  const tipoCambioRaw = String(formData.get("tipoCambio") ?? "").trim();
  const tipoCambio = prestamo.MONEDA_CODIGO === "PEN" ? null : Number(tipoCambioRaw);
  if (prestamo.MONEDA_CODIGO !== "PEN" && !(tipoCambio && tipoCambio > 0)) {
    return { ok: false, codigo: "PRES-OTOR-04", error: "Falta el tipo de cambio pactado (obligatorio si el préstamo no es en soles)." };
  }

  if (idCuentaDesembolso) {
    const cuentas = await listarCuentas();
    const cuenta = cuentas.find((c) => c.ID_CUENTA === idCuentaDesembolso);
    if (!cuenta || cuenta.ID_MONEDA !== prestamo.ID_MONEDA) {
      return { ok: false, codigo: "PRES-OTOR-05", error: "La cuenta de desembolso elegida no existe o no coincide con la moneda del préstamo." };
    }
  }

  try {
    await otorgarPrestamo(idPrestamo, fechaOrigen, tipoCambio, idCuentaDesembolso);
  } catch {
    return { ok: false, codigo: "PRES-OTOR-99", error: "No se pudo otorgar la solicitud. Vuelve a intentar; si persiste, repórtalo." };
  }

  // Mismo criterio que crearPrestamoAction: la solicitud ya quedo
  // otorgada (arriba) -- de aca en adelante (cuotas, movimiento) no debe
  // tumbar la pagina si algo falla.
  try {
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
  } catch {
    revalidatePath(`/rrhh/planilla/prestamos/${idPrestamo}`);
    revalidatePath("/rrhh/planilla/prestamos");
    return {
      ok: false,
      codigo: "PRES-OTOR-98",
      error: `La solicitud #${idPrestamo} se otorgó, pero falló al generar el cronograma o el movimiento de caja. Revísala desde el detalle y complétala a mano; repórtalo si vuelve a pasar.`,
    };
  }

  await notificarSolicitudOtorgada(prestamo);

  revalidatePath(`/rrhh/planilla/prestamos/${idPrestamo}`);
  revalidatePath("/rrhh/planilla/prestamos");
  redirect(`/rrhh/planilla/prestamos/${idPrestamo}`);
}

// Avisa al beneficiario (si es un trabajador -- un contacto no tiene
// cuenta que notificar) que su solicitud ya fue otorgada y esta lista
// para firmar. No-op silencioso ante cualquier error: una notificacion
// que falla no debe tumbar el otorgamiento, que ya quedo guardado.
async function notificarSolicitudOtorgada(prestamo: PrestamoRow): Promise<void> {
  if (!prestamo.ID_USUARIO) return;
  try {
    const [aplicaciones, categorias] = await Promise.all([listarAplicaciones(), listarMaestros("CATEGORIA_NOTIFICACION")]);
    const idAplicacionOrigen = aplicaciones.find((a) => a.CODIGO === "RRHH_PLANILLA")?.ID_APLICACION ?? null;
    const idCategoria = categorias.find((c) => c.CODIGO === "MODULO")?.ID_MAESTRO;
    if (!idCategoria) return;

    const nombreTipo = prestamo.TIPO_PRESTAMO_CODIGO === "ADELANTO_SUELDO" ? "adelanto de sueldo" : "préstamo";
    const monto = `${prestamo.MONEDA_CODIGO === "USD" ? "US$" : "S/"} ${Number(prestamo.MONTO_TOTAL).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;

    await crearNotificacion({
      idCategoria,
      titulo: `Tu ${nombreTipo} fue otorgado`,
      mensaje: `Se otorgó tu solicitud de ${nombreTipo} por ${monto}. Descarga el compromiso de pago, fírmalo y súbelo firmado para activarlo.`,
      idAplicacionOrigen,
      urlDestino: `/rrhh/planilla/prestamos/${prestamo.ID_PRESTAMO}`,
      idUsuarioEmisor: null,
      destinatarios: { usuarios: [prestamo.ID_USUARIO] },
    });
  } catch {
    // Silencioso -- ver comentario de la funcion.
  }
}

function revalidarPrestamo(idPrestamo: number): void {
  revalidatePath(`/rrhh/planilla/prestamos/${idPrestamo}`);
  revalidatePath("/rrhh/planilla/prestamos");
  refresh();
}

// Mismo motivo que cronogramaValido: "anio < 2000" no atrapa un NaN.
function anioMesValidos(anio: number, mes: number): boolean {
  return Number.isInteger(anio) && anio >= 2000 && Number.isInteger(mes) && mes >= 1 && mes <= 12;
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
  if (!idPrestamo || !(monto > 0) || !anioMesValidos(anio, mes)) return;

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
  if (!idPrestamo || !idCuota || !(monto > 0) || !anioMesValidos(anio, mes)) return;

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

// Borra definitivamente una solicitud/prestamo que nunca llego a
// firmarse (SOLICITADO o PENDIENTE_FIRMA) -- pensado para limpiar
// duplicados de un reintento o una solicitud creada por error. Uno ya
// ACTIVO (firmado) no se borra, se anula (anularPrestamoAction), porque
// ya puede tener cuotas descontadas en planilla -- el guard en SQL
// (SP_RRHH_PRESTAMO_ELIMINAR) tambien lo protege por si esto se saltara.
export async function eliminarPrestamoAction(formData: FormData): Promise<void> {
  await requireGestionarPrestamos();

  const idPrestamo = Number(formData.get("idPrestamo"));
  if (!idPrestamo) return;

  const prestamo = await obtenerPrestamo(idPrestamo);
  if (!prestamo || prestamo.ESTADO_PRESTAMO_CODIGO === "ACTIVO") return;

  await eliminarPrestamo(idPrestamo);

  revalidatePath("/rrhh/planilla/prestamos");
  redirect("/rrhh/planilla/prestamos");
}
