"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import { requireSession } from "@/lib/auth/get-current-user";
import {
  listarContratosElegibles,
  listarHorasDelPeriodo,
  obtenerAcumuladoAnio,
  obtenerOCrearPlanillaMensual,
  obtenerPlanillaMensual,
  emitirPlanillaMensual as marcarPlanillaMensualEmitida,
  reabrirPlanillaMensual,
  agregarDetalle,
  vincularHoras,
  listarDetalle,
  obtenerDetalle,
  actualizarMontosDetalle,
  marcarPagadoDetalle,
  marcarPagadoMasivo,
  emitirDetalle,
  regenerarDocumentoDetalle,
  deshacerEmisionDetalle,
  eliminarDetalle,
  subirRxhFirmado,
  subirEvidenciaPago,
  confirmarRecepcionBoleta,
  aplazarDetalle,
  reiniciarPlanillaMensual,
} from "@/lib/db/repositories/rrhh-planilla.repository";
import {
  crearParametro,
  agregarTramoRenta5ta,
  agregarComisionAfpFondo,
} from "@/lib/db/repositories/rrhh-planilla-parametro.repository";
import { listarPeriodosPago, agregarPeriodoPago, actualizarPeriodoPago } from "@/lib/db/repositories/rrhh-periodo-pago.repository";
import { listarConceptosContrato } from "@/lib/db/repositories/contrato.repository";
import { obtenerParametrosVigentes } from "@/lib/rrhh/planilla/parametros";
import { calcularBoletaPlanilla, calcularRxH, type ParametrosPlanillaVigentes } from "@/lib/rrhh/planilla/calculo";
import { generarPeriodosPendientesDetallado, etiquetaPeriodoMensual, factorProrateoDelMes } from "@/lib/rrhh/periodos-pago";
import { generarBoletaPdf } from "@/lib/rrhh/planilla/generar-boleta-pdf";
import { generarReciboHonorariosPdf } from "@/lib/rrhh/planilla/generar-recibo-honorarios-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { cuotasADescontar, vincularCuotasADetalle, etiquetaCuotaPrestamo } from "@/lib/rrhh/planilla/prestamos-planilla";
import { listarCuotasDelDetalle } from "@/lib/db/repositories/rrhh-prestamo.repository";
import { guardarArchivo } from "@/lib/storage/local-storage";
import { listarAplicaciones } from "@/lib/db/repositories/aplicacion.repository";
import { crearNotificacion } from "@/lib/db/repositories/notificacion.repository";
import { listarMaestros } from "@/lib/db/repositories/maestro.repository";
import { actualizarSuspension4ta } from "@/lib/db/repositories/rrhh-empleado.repository";
import { listarArrastresPendientes, eliminarArrastre } from "@/lib/db/repositories/rrhh-contrato-arrastre.repository";
import type { PlanillaContratoElegibleRow, PlanillaDetalleRow } from "@/types/db";

const PLANILLA_APP_CODIGO = "RRHH_PLANILLA";

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function esVigenteEnMes(contrato: PlanillaContratoElegibleRow, inicioMes: string, finMes: string): boolean {
  if (contrato.FECHA_INICIO > finMes) return false;
  if (contrato.FECHA_FIN && contrato.FECHA_FIN < inicioMes) return false;
  return true;
}

// Asegura que exista el RRHH_CONTRATO_PERIODO_PAGO de este mes -- reusa
// generarPeriodosPendientesDetallado/agregarPeriodoPago (no reimplementa
// esa logica, ver src/lib/rrhh/periodos-pago.ts), con el mismo monto
// sugerido que ya usa generarPeriodosPendientesAction en rrhh.ts (suma
// de conceptos para planilla, TARIFA para locador de tarifa unica) --
// PRORRATEADO (30 dias fijos, ver factorProrateoDelMes) en el mes en que
// el contrato empieza y/o termina a mitad de mes. null si el contrato
// aun no genera periodo este mes (ej. recien arranca el mes que viene).
async function asegurarPeriodoDelMes(
  contrato: PlanillaContratoElegibleRow,
  periodo: string,
  idUsuario: number | null,
): Promise<{ idPeriodoPago: number; monto: number } | null> {
  const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const periodosActuales = await listarPeriodosPago(contrato.ID_CONTRATO);
  const buscado = periodo.trim().toUpperCase();
  const existente = periodosActuales.find((p) => p.PERIODO.trim().toUpperCase() === buscado);
  if (existente) return { idPeriodoPago: existente.ID_PERIODO_PAGO, monto: Number(existente.MONTO) };

  const pendientes = generarPeriodosPendientesDetallado(
    contrato.FECHA_INICIO,
    contrato.FECHA_FIN,
    periodosActuales.map((p) => p.PERIODO),
  );
  if (!pendientes.some((p) => p.etiqueta.trim().toUpperCase() === buscado)) return null;

  const conceptos = esPlanilla ? await listarConceptosContrato(contrato.ID_CONTRATO) : [];
  const montoSugerido = esPlanilla ? conceptos.reduce((suma, c) => suma + Number(c.MONTO), 0) : Number(contrato.TARIFA ?? 0);
  if (!montoSugerido) return null;

  // Arrastres pendientes (ver SP_RRHH_PLANILLA_DETALLE_APLAZAR): un monto
  // bruto de un mes anterior que se aplazo, a sumar en el periodo del mes
  // en que efectivamente cae -- se consumen (se borran) al aplicarlos aca.
  const arrastres = await listarArrastresPendientes(contrato.ID_CONTRATO);

  for (const pendiente of pendientes) {
    const factor = factorProrateoDelMes(pendiente.anio, pendiente.mes, contrato.FECHA_INICIO, contrato.FECHA_FIN);
    let monto = Math.round(montoSugerido * factor * 100) / 100;

    const arrastresDelPeriodo = arrastres.filter((a) => a.ANIO_DESTINO === pendiente.anio && a.MES_DESTINO === pendiente.mes);
    if (arrastresDelPeriodo.length > 0) {
      monto = Math.round((monto + arrastresDelPeriodo.reduce((suma, a) => suma + Number(a.MONTO), 0)) * 100) / 100;
    }

    await agregarPeriodoPago(contrato.ID_CONTRATO, pendiente.etiqueta, monto, idUsuario);

    for (const a of arrastresDelPeriodo) {
      await eliminarArrastre(a.ID_ARRASTRE);
    }
  }

  const periodosActualizados = await listarPeriodosPago(contrato.ID_CONTRATO);
  const nuevo = periodosActualizados.find((p) => p.PERIODO.trim().toUpperCase() === buscado);
  return nuevo ? { idPeriodoPago: nuevo.ID_PERIODO_PAGO, monto: Number(nuevo.MONTO) } : null;
}

async function procesarPeriodoRegular(
  idPlanillaMensual: number,
  contrato: PlanillaContratoElegibleRow,
  periodo: string,
  anio: number,
  mes: number,
  parametros: ParametrosPlanillaVigentes,
  idUsuario: number | null,
): Promise<void> {
  const periodoInfo = await asegurarPeriodoDelMes(contrato, periodo, idUsuario);
  if (!periodoInfo) return;

  const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";

  const prestamos = await cuotasADescontar(contrato.ID_USUARIO, anio, mes);

  if (esPlanilla) {
    const acumulado = await obtenerAcumuladoAnio(contrato.ID_CONTRATO, anio, mes);
    const resultado = calcularBoletaPlanilla({
      remuneracionBruta: periodoInfo.monto,
      sistemaPension: contrato.SISTEMA_PENSION_CODIGO,
      afpFondoCodigo: contrato.AFP_FONDO_CODIGO,
      mesesRestantesIncluyendoActual: 13 - mes,
      brutoAcumuladoMesesAnterioresDelAnio: Number(acumulado.BRUTO_ACUMULADO),
      retencionesAcumuladasAnioActual: Number(acumulado.RETENCION_ACUMULADA),
      descuentoPrestamo: prestamos.total,
      parametros,
    });

    const { id_planilla_detalle: idDetalleNuevo } = await agregarDetalle({
      idPlanillaMensual,
      idContrato: contrato.ID_CONTRATO,
      tipoReferencia: "RRHH_CONTRATO_PERIODO_PAGO",
      idReferencia: periodoInfo.idPeriodoPago,
      montoBruto: resultado.bruto,
      montoAportePension: resultado.aportePension,
      montoRetencionRenta: resultado.retencionRenta,
      montoEssalud: resultado.essalud,
      montoDescuentoPrestamo: resultado.descuentoPrestamo,
      montoNeto: resultado.neto,
      idSistemaPensionAplicado: contrato.ID_SISTEMA_PENSION,
      idAfpFondoAplicado: contrato.ID_AFP_FONDO,
      idParametroAplicado: parametros.idParametro,
      idUsuarioCreacion: idUsuario,
    });
    if (idDetalleNuevo) await vincularCuotasADetalle(prestamos.cuotas, idDetalleNuevo);
    return;
  }

  const tieneSuspension = Boolean(contrato.SUSPENSION_RETENCION_4TA_HASTA && contrato.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
  const resultado = calcularRxH({ montoRecibo: periodoInfo.monto, tieneSuspension, descuentoPrestamo: prestamos.total, parametros });

  const { id_planilla_detalle: idDetalleRxH } = await agregarDetalle({
    idPlanillaMensual,
    idContrato: contrato.ID_CONTRATO,
    tipoReferencia: "RRHH_CONTRATO_PERIODO_PAGO",
    idReferencia: periodoInfo.idPeriodoPago,
    montoBruto: resultado.bruto,
    montoAportePension: null,
    montoRetencionRenta: resultado.retencionRenta,
    montoEssalud: null,
    montoDescuentoPrestamo: resultado.descuentoPrestamo,
    montoNeto: resultado.neto,
    idSistemaPensionAplicado: null,
    idAfpFondoAplicado: null,
    idParametroAplicado: parametros.idParametro,
    idUsuarioCreacion: idUsuario,
  });
  if (idDetalleRxH) await vincularCuotasADetalle(prestamos.cuotas, idDetalleRxH);
}

// LOCADOR POR_HORA: junta las horas del mes que compartan moneda. Si hay
// mas de una moneda, se deja fuera (queda "requiere generacion manual"
// en la UI, ver RRHH_PLANILLA_DETALLE_HORAS en el plan).
async function procesarLocadorPorHora(
  idPlanillaMensual: number,
  contrato: PlanillaContratoElegibleRow,
  periodo: string,
  anio: number,
  mes: number,
  parametros: ParametrosPlanillaVigentes,
  idUsuario: number | null,
): Promise<void> {
  const horas = await listarHorasDelPeriodo(contrato.ID_CONTRATO, periodo);
  if (horas.length === 0) return;

  const monedas = new Set(horas.map((h) => h.MONEDA_CODIGO));
  if (monedas.size > 1) return;

  const bruto = horas.reduce((suma, h) => suma + Number(h.MONTO_CALCULADO), 0);
  if (!bruto) return;

  const tieneSuspension = Boolean(contrato.SUSPENSION_RETENCION_4TA_HASTA && contrato.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
  const prestamos = await cuotasADescontar(contrato.ID_USUARIO, anio, mes);
  const resultado = calcularRxH({ montoRecibo: bruto, tieneSuspension, descuentoPrestamo: prestamos.total, parametros });

  const { id_planilla_detalle: idPlanillaDetalle } = await agregarDetalle({
    idPlanillaMensual,
    idContrato: contrato.ID_CONTRATO,
    tipoReferencia: null,
    idReferencia: null,
    montoBruto: resultado.bruto,
    montoAportePension: null,
    montoRetencionRenta: resultado.retencionRenta,
    montoEssalud: null,
    montoDescuentoPrestamo: resultado.descuentoPrestamo,
    montoNeto: resultado.neto,
    idSistemaPensionAplicado: null,
    idAfpFondoAplicado: null,
    idParametroAplicado: parametros.idParametro,
    idUsuarioCreacion: idUsuario,
  });

  if (idPlanillaDetalle) {
    await vincularCuotasADetalle(prestamos.cuotas, idPlanillaDetalle);
    for (const h of horas) {
      await vincularHoras(idPlanillaDetalle, h.ID_CONTRATO_HORAS);
    }
  }
}

export interface ResultadoGenerarPlanillaMensual {
  idPlanillaMensual: number;
  totalAgregados: number;
  hayParametrosVigentes: boolean;
}

// Por cada contrato FIRMADO vigente ese mes que todavia no tenga fila en
// esta planilla, calcula su bruto/descuentos/neto y los persiste como
// PENDIENTE (ver SP_RRHH_PLANILLA_DETALLE_AGREGAR, no-op si ya existia --
// reintentar es seguro). Si todavia no hay ninguna version de parametros
// cargada, solo crea/asegura el header vacio -- el llamador (accion o
// cron) decide que avisar. idUsuario null cuando lo dispara un cron sin
// sesion (ver /api/cron/generar-planilla-mensual) -- las columnas de
// auditoria correspondientes son nullable.
export async function generarPlanillaMensual(anio: number, mes: number, idUsuario: number | null): Promise<ResultadoGenerarPlanillaMensual> {
  const periodo = etiquetaPeriodoMensual(anio, mes - 1);

  const { id_planilla_mensual: idPlanillaMensual } = await obtenerOCrearPlanillaMensual(anio, mes, periodo, idUsuario);

  const parametros = await obtenerParametrosVigentes();
  let totalAgregados = 0;

  if (parametros) {
    const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const finMes = new Date(anio, mes, 0).toISOString().slice(0, 10);

    const [contratos, detalleExistente] = await Promise.all([listarContratosElegibles(), listarDetalle(idPlanillaMensual)]);
    const yaProcesados = new Set(detalleExistente.map((d) => d.ID_CONTRATO));

    // Un colaborador no puede tener 2 registros de planilla el mismo mes
    // (duplicaria su pago) -- si tiene mas de un contrato vigente este
    // mes (ej. dos contratos solapados por error), no se genera NINGUNO
    // hasta que se resuelva cual es el correcto. Ver
    // diagnosticarGeneracionPlanilla, que explica el conflicto en la UI.
    const vigentesEsteMes = contratos.filter((c) => esVigenteEnMes(c, inicioMes, finMes));
    const contratosVigentesPorUsuario = new Map<number, number>();
    for (const c of vigentesEsteMes) {
      contratosVigentesPorUsuario.set(c.ID_USUARIO, (contratosVigentesPorUsuario.get(c.ID_USUARIO) ?? 0) + 1);
    }
    const usuariosConConflicto = new Set(
      [...contratosVigentesPorUsuario.entries()].filter(([, n]) => n > 1).map(([idUsuario]) => idUsuario),
    );

    for (const contrato of contratos) {
      if (yaProcesados.has(contrato.ID_CONTRATO)) continue;
      if (!esVigenteEnMes(contrato, inicioMes, finMes)) continue;
      if (usuariosConConflicto.has(contrato.ID_USUARIO)) continue;

      if (contrato.TIPO_CONTRATO_CODIGO === "LOCADOR" && contrato.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA") {
        await procesarLocadorPorHora(idPlanillaMensual, contrato, periodo, anio, mes, parametros, idUsuario);
      } else {
        await procesarPeriodoRegular(idPlanillaMensual, contrato, periodo, anio, mes, parametros, idUsuario);
      }
      totalAgregados++;
    }
  }

  return { idPlanillaMensual, totalAgregados, hayParametrosVigentes: Boolean(parametros) };
}

export async function generarPlanillaMensualAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const hoy = new Date();
  const anio = Number(formData.get("anio")) || hoy.getFullYear();
  const mes = Number(formData.get("mes")) || hoy.getMonth() + 1;

  const { idPlanillaMensual } = await generarPlanillaMensual(anio, mes, sesion.idUsuario);

  revalidatePath("/rrhh/planilla");
  redirect(`/rrhh/planilla/${idPlanillaMensual}`);
}

// Recalcula un detalle con el bruto que ya tiene (no lo vuelve a derivar
// del periodo/horas de origen) y las tasas/config de pension vigentes en
// este momento -- util despues de corregir la configuracion de pension
// de un colaborador o de cargar una version nueva de parametros.
export async function recalcularDetalleAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");
  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  if (!idPlanillaDetalle) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ESTADO_EMISION_CODIGO === "EMITIDA") return;

  const parametros = await obtenerParametrosVigentes();
  if (!parametros) return;

  const bruto = Number(detalle.MONTO_BRUTO);
  const esPlanilla = detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  // Las cuotas ya reservadas para este detalle -- recalcular no busca
  // cuotas nuevas, solo rehace las cuentas con las que ya tiene.
  const cuotasVinculadas = await listarCuotasDelDetalle(idPlanillaDetalle);
  const descuentoPrestamo = Math.round(cuotasVinculadas.reduce((suma, c) => suma + Number(c.MONTO_DESCONTADO_SOLES ?? 0), 0) * 100) / 100;

  if (esPlanilla) {
    const acumulado = await obtenerAcumuladoAnio(detalle.ID_CONTRATO, detalle.ANIO, detalle.MES);
    const resultado = calcularBoletaPlanilla({
      remuneracionBruta: bruto,
      sistemaPension: detalle.SISTEMA_PENSION_CODIGO,
      afpFondoCodigo: detalle.AFP_FONDO_CODIGO,
      mesesRestantesIncluyendoActual: 13 - detalle.MES,
      brutoAcumuladoMesesAnterioresDelAnio: Number(acumulado.BRUTO_ACUMULADO),
      retencionesAcumuladasAnioActual: Number(acumulado.RETENCION_ACUMULADA),
      descuentoPrestamo,
      parametros,
    });
    await actualizarMontosDetalle({
      idPlanillaDetalle,
      montoBruto: resultado.bruto,
      montoAportePension: resultado.aportePension,
      montoRetencionRenta: resultado.retencionRenta,
      montoEssalud: resultado.essalud,
      montoDescuentoPrestamo: resultado.descuentoPrestamo,
      montoNeto: resultado.neto,
      calculoAutomatico: true,
    });
  } else {
    const tieneSuspension = Boolean(detalle.SUSPENSION_RETENCION_4TA_HASTA && detalle.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
    const resultado = calcularRxH({ montoRecibo: bruto, tieneSuspension, descuentoPrestamo, parametros });
    await actualizarMontosDetalle({
      idPlanillaDetalle,
      montoBruto: resultado.bruto,
      montoAportePension: null,
      montoRetencionRenta: resultado.retencionRenta,
      montoEssalud: null,
      montoDescuentoPrestamo: resultado.descuentoPrestamo,
      montoNeto: resultado.neto,
      calculoAutomatico: true,
    });
  }

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  refresh();
}

// Edicion manual (el administrador escribe los montos a mano). Propaga
// el bruto al RRHH_CONTRATO_PERIODO_PAGO vinculado si lo tenia (no
// aplica a LOCADOR POR_HORA, que no tiene un unico periodo -- ver
// TIPO_REFERENCIA en RRHH_PLANILLA_DETALLE).
export async function actualizarMontosDetalleAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  const bruto = Number(formData.get("montoBruto") || 0);
  const aportePensionRaw = String(formData.get("montoAportePension") ?? "").trim();
  const retencionRentaRaw = String(formData.get("montoRetencionRenta") ?? "").trim();
  const essaludRaw = String(formData.get("montoEssalud") ?? "").trim();
  const descuentoPrestamo = Number(String(formData.get("montoDescuentoPrestamo") ?? "").trim() || 0);
  const aportePension = aportePensionRaw ? Number(aportePensionRaw) : null;
  const retencionRenta = retencionRentaRaw ? Number(retencionRentaRaw) : null;
  const essalud = essaludRaw ? Number(essaludRaw) : null;

  if (!idPlanillaDetalle || !bruto) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ESTADO_EMISION_CODIGO === "EMITIDA") return;

  const neto = bruto - (aportePension ?? 0) - (retencionRenta ?? 0) - descuentoPrestamo;

  await actualizarMontosDetalle({
    idPlanillaDetalle,
    montoBruto: bruto,
    montoAportePension: aportePension,
    montoRetencionRenta: retencionRenta,
    montoEssalud: essalud,
    montoDescuentoPrestamo: descuentoPrestamo,
    montoNeto: neto,
    calculoAutomatico: false,
  });

  if (detalle.TIPO_REFERENCIA === "RRHH_CONTRATO_PERIODO_PAGO" && detalle.ID_REFERENCIA) {
    await actualizarPeriodoPago(detalle.ID_REFERENCIA, detalle.PERIODO, bruto);
  }

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  refresh();
}

export async function marcarPagadoDetalleAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  const idPlanillaMensual = Number(formData.get("idPlanillaMensual"));
  const pagado = formData.get("pagado") === "1";
  if (!idPlanillaDetalle) return;

  await marcarPagadoDetalle(idPlanillaDetalle, pagado, sesion.idUsuario);

  if (idPlanillaMensual) revalidatePath(`/rrhh/planilla/${idPlanillaMensual}`);
  refresh();
}

export async function marcarPagadoMasivoAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaMensual = Number(formData.get("idPlanillaMensual"));
  const pagado = formData.get("pagado") === "1";
  if (!idPlanillaMensual) return;

  await marcarPagadoMasivo(idPlanillaMensual, pagado, sesion.idUsuario);

  revalidatePath(`/rrhh/planilla/${idPlanillaMensual}`);
  refresh();
}

// Genera el PDF de un detalle (boleta o RxH segun regimen) y lo guarda
// en su ruta fija -- comun a la primera emision y a una regeneracion
// posterior (ej. cambio de formato de boleta), que reusan el mismo
// archivo/ruta, solo cambia si ademas se marca como EMITIDA.
async function generarYGuardarDocumentoDetalle(detalle: PlanillaDetalleRow): Promise<string> {
  const esPlanilla = detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const logo = await cargarLogoEmpresa();
  const cuotasPrestamo = await listarCuotasDelDetalle(detalle.ID_PLANILLA_DETALLE);
  const descuentosPrestamo = cuotasPrestamo.map((c) => ({
    descripcion: etiquetaCuotaPrestamo(c, { anio: detalle.ANIO, mes: detalle.MES }),
    monto: Number(c.MONTO_DESCONTADO_SOLES ?? 0),
  }));
  const descuentoPrestamo = Number(detalle.MONTO_DESCUENTO_PRESTAMO ?? 0);

  let bytes: Uint8Array;
  let carpeta: string;

  if (esPlanilla) {
    const conceptos = await listarConceptosContrato(detalle.ID_CONTRATO);
    bytes = await generarBoletaPdf({
      idPlanillaDetalle: detalle.ID_PLANILLA_DETALLE,
      periodo: detalle.PERIODO,
      anio: detalle.ANIO,
      nombres: detalle.NOMBRES,
      apellidos: detalle.APELLIDOS,
      cargo: detalle.CARGO,
      tipoDocumentoDescripcion: detalle.TIPO_DOCUMENTO_DESCRIPCION,
      nroDocumento: detalle.NRO_DOCUMENTO,
      nroCuenta: detalle.NRO_CUENTA,
      cci: detalle.CCI,
      banco: detalle.BANCO,
      sistemaPensionDescripcion: detalle.SISTEMA_PENSION_DESCRIPCION,
      afpFondoDescripcion: detalle.AFP_FONDO_DESCRIPCION,
      conceptosIngreso: conceptos.map((c) => ({ descripcion: c.CONCEPTO_DESCRIPCION, monto: Number(c.MONTO) })),
      bruto: Number(detalle.MONTO_BRUTO),
      aportePension: Number(detalle.MONTO_APORTE_PENSION ?? 0),
      retencionRenta: Number(detalle.MONTO_RETENCION_RENTA ?? 0),
      essalud: Number(detalle.MONTO_ESSALUD ?? 0),
      descuentoPrestamo,
      descuentosPrestamo,
      neto: Number(detalle.MONTO_NETO),
      logoBytes: logo.logoBytes,
      logoFormato: logo.logoFormato,
    });
    carpeta = "boletas";
  } else {
    const tieneSuspension = Boolean(detalle.SUSPENSION_RETENCION_4TA_HASTA && detalle.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
    bytes = await generarReciboHonorariosPdf({
      idPlanillaDetalle: detalle.ID_PLANILLA_DETALLE,
      periodo: detalle.PERIODO,
      anio: detalle.ANIO,
      nombres: detalle.NOMBRES,
      apellidos: detalle.APELLIDOS,
      cargo: detalle.CARGO,
      tipoDocumentoDescripcion: detalle.TIPO_DOCUMENTO_DESCRIPCION,
      nroDocumento: detalle.NRO_DOCUMENTO,
      nroCuenta: detalle.NRO_CUENTA,
      cci: detalle.CCI,
      banco: detalle.BANCO,
      tieneSuspension,
      suspensionHasta: detalle.SUSPENSION_RETENCION_4TA_HASTA,
      bruto: Number(detalle.MONTO_BRUTO),
      retencionRenta: Number(detalle.MONTO_RETENCION_RENTA ?? 0),
      descuentoPrestamo,
      descuentosPrestamo,
      neto: Number(detalle.MONTO_NETO),
      logoBytes: logo.logoBytes,
      logoFormato: logo.logoFormato,
    });
    carpeta = "recibos-honorarios";
  }

  const documentoPath = `rrhh/planilla/${carpeta}/${detalle.ID_PLANILLA_DETALLE}.pdf`;
  await guardarArchivo(documentoPath, bytes);
  return documentoPath;
}

// Avisa al colaborador que ya puede ver y descargar su boleta/RxH, con
// link directo a su propio detalle (accede aunque no tenga permiso sobre
// RRHH_PLANILLA, ver la pagina). No-op silencioso ante cualquier error --
// una notificacion que falla no debe tumbar la emision, que ya quedo guardada.
async function notificarDocumentoEmitido(detalle: PlanillaDetalleRow): Promise<void> {
  try {
    const esPlanilla = detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR";
    const [aplicaciones, categorias] = await Promise.all([listarAplicaciones(), listarMaestros("CATEGORIA_NOTIFICACION")]);
    const idAplicacionOrigen = aplicaciones.find((a) => a.CODIGO === "RRHH_PLANILLA")?.ID_APLICACION ?? null;
    const idCategoria = categorias.find((c) => c.CODIGO === "MODULO")?.ID_MAESTRO;
    if (!idCategoria) return;

    await crearNotificacion({
      idCategoria,
      titulo: esPlanilla ? "Ya está tu boleta de pago" : "Ya está tu orden de servicio",
      mensaje: esPlanilla
        ? `Se emitió tu boleta de pago de ${detalle.PERIODO}. Descárgala y confirma que la recibiste.`
        : `Se emitió tu orden de servicio de ${detalle.PERIODO}. Descárgala, emite tu Recibo por Honorarios (RxH) ante SUNAT por ese monto, y sube aquí el RxH firmado junto con la evidencia de pago.`,
      idAplicacionOrigen,
      urlDestino: `/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${detalle.ID_PLANILLA_DETALLE}`,
      idUsuarioEmisor: null,
      destinatarios: { usuarios: [detalle.ID_USUARIO] },
    });
  } catch {
    // Silencioso -- ver comentario de la funcion.
  }
}

// Genera el PDF (boleta o RxH segun regimen), lo guarda, y recien
// entonces marca el detalle como EMITIDA -- mismo orden que la firma de
// contratos (primero el archivo, despues persistir la ruta).
async function emitirDetalleInterno(detalle: PlanillaDetalleRow, idUsuario: number): Promise<void> {
  if (detalle.ESTADO_EMISION_CODIGO === "EMITIDA") return;

  const documentoPath = await generarYGuardarDocumentoDetalle(detalle);
  await emitirDetalle(detalle.ID_PLANILLA_DETALLE, documentoPath, idUsuario);
  await notificarDocumentoEmitido(detalle);
}

// Re-genera el PDF de un detalle YA EMITIDA sobre la misma ruta (ej.
// cambio el formato de boleta y hay que refrescar las ya emitidas) --
// no-op si todavia no se emitio (para eso esta "Emitir").
export async function regenerarDocumentoDetalleAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  if (!idPlanillaDetalle) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ESTADO_EMISION_CODIGO !== "EMITIDA") return;

  const documentoPath = await generarYGuardarDocumentoDetalle(detalle);
  await regenerarDocumentoDetalle(idPlanillaDetalle, documentoPath);

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  refresh();
}

export async function emitirDetalleAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  if (!idPlanillaDetalle) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle) return;

  await emitirDetalleInterno(detalle, sesion.idUsuario);

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  refresh();
}

// Estado devuelto por deshacerEmisionDetalleAction -- mismo patron
// {ok,error,codigo} que reabrirPlanillaMensualAction/reiniciarPlanillaMensualAction.
export interface DeshacerEmisionState {
  ok: boolean;
  error?: string;
  codigo?: string;
}

// Deshace una emision por un click accidental, volviendo el detalle a
// PENDIENTE (vuelve a ser editable, "Emitir" vuelve a estar disponible).
// Bloqueado si ya avanzo algun paso posterior que asumio la emision como
// definitiva -- ver SP_RRHH_PLANILLA_DETALLE_DESHACER_EMISION.
export async function deshacerEmisionDetalleAction(
  _prevState: DeshacerEmisionState,
  formData: FormData,
): Promise<DeshacerEmisionState> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  if (!idPlanillaDetalle) return { ok: false, error: "Detalle inválido.", codigo: "PLAN-DESHACER-01" };

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle) return { ok: false, error: "No se encontró el detalle.", codigo: "PLAN-DESHACER-02" };

  const { deshecho } = await deshacerEmisionDetalle(idPlanillaDetalle);
  if (!deshecho) {
    return {
      ok: false,
      error:
        "No se puede deshacer -- ya hay un paso posterior completado (aportes pagados, RxH firmado, evidencia de pago, o confirmación del colaborador).",
      codigo: "PLAN-DESHACER-03",
    };
  }

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  refresh();

  return { ok: true };
}

// Emite todos los detalles PENDIENTE de la planilla y recien entonces
// cierra el header (SP_RRHH_PLANILLA_MENSUAL_EMITIR es no-op si queda
// alguno sin emitir, pero para entonces ya deberian estar todos listos).
export async function emitirPlanillaMensualAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaMensual = Number(formData.get("idPlanillaMensual"));
  if (!idPlanillaMensual) return;

  const filas = await listarDetalle(idPlanillaMensual);
  const pendientes = filas.filter((f) => f.ESTADO_EMISION_CODIGO !== "EMITIDA");

  for (const fila of pendientes) {
    const detalle = await obtenerDetalle(fila.ID_PLANILLA_DETALLE);
    if (detalle) await emitirDetalleInterno(detalle, sesion.idUsuario);
  }

  await marcarPlanillaMensualEmitida(idPlanillaMensual, sesion.idUsuario);

  revalidatePath(`/rrhh/planilla/${idPlanillaMensual}`);
  revalidatePath("/rrhh/planilla");
  refresh();
}

// Estado devuelto por reabrirPlanillaMensualAction -- mismo patron de
// {ok,error,codigo} que las acciones de prestamos (ver rrhh-prestamos.ts):
// un codigo corto identifica el motivo del rechazo sin tener que
// describirlo largo, util para un pantallazo de soporte.
export interface ReabrirPlanillaState {
  ok: boolean;
  error?: string;
  codigo?: string;
}

// Deshace una planilla EMITIDA por error (ej. el bug de emitir con la
// planilla vacia, ya corregido en SP_RRHH_PLANILLA_MENSUAL_EMITIR) y la
// vuelve a BORRADOR. Bloqueado si ya hay algun colaborador con sus
// aportes AFP/EsSalud marcados pagados -- ahi ya hubo un pago real, y
// reabrir todo el mes lo dejaria inconsistente.
export async function reabrirPlanillaMensualAction(
  _prevState: ReabrirPlanillaState,
  formData: FormData,
): Promise<ReabrirPlanillaState> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaMensual = Number(formData.get("idPlanillaMensual"));
  if (!idPlanillaMensual) return { ok: false, error: "Planilla inválida.", codigo: "PLAN-REABRIR-01" };

  const planilla = await obtenerPlanillaMensual(idPlanillaMensual);
  if (!planilla) return { ok: false, error: "No se encontró la planilla.", codigo: "PLAN-REABRIR-02" };
  if (planilla.ESTADO_PLANILLA_CODIGO !== "EMITIDA") {
    return { ok: false, error: "Esta planilla no está emitida -- no hay nada que reabrir.", codigo: "PLAN-REABRIR-03" };
  }

  const filas = await listarDetalle(idPlanillaMensual);
  if (filas.some((f) => f.AFP_ESSALUD_PAGADO)) {
    return {
      ok: false,
      error:
        "Ya hay colaboradores con sus aportes marcados como pagados -- no se puede reabrir todo el mes. Corrige el detalle puntual si hace falta.",
      codigo: "PLAN-REABRIR-04",
    };
  }

  await reabrirPlanillaMensual(idPlanillaMensual);

  revalidatePath(`/rrhh/planilla/${idPlanillaMensual}`);
  revalidatePath("/rrhh/planilla");
  refresh();

  return { ok: true };
}

// Estado devuelto por reiniciarPlanillaMensualAction -- mismo patron
// {ok,error,codigo} que reabrirPlanillaMensualAction.
export interface ReiniciarPlanillaState {
  ok: boolean;
  error?: string;
  codigo?: string;
}

// Borra TODOS los detalles del mes de una sola vez para empezar de cero
// (ej. quedaron duplicados por el bug de 2 contratos solapados, ya
// corregido en generarPlanillaMensual) -- bloqueado si cualquiera ya
// esta EMITIDA. Los periodos de pago no se tocan, "Generar planilla del
// mes" los vuelve a usar tal cual al regenerar.
export async function reiniciarPlanillaMensualAction(
  _prevState: ReiniciarPlanillaState,
  formData: FormData,
): Promise<ReiniciarPlanillaState> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaMensual = Number(formData.get("idPlanillaMensual"));
  if (!idPlanillaMensual) return { ok: false, error: "Planilla inválida.", codigo: "PLAN-REINICIAR-01" };

  const planilla = await obtenerPlanillaMensual(idPlanillaMensual);
  if (!planilla) return { ok: false, error: "No se encontró la planilla.", codigo: "PLAN-REINICIAR-02" };

  const { reiniciado } = await reiniciarPlanillaMensual(idPlanillaMensual);
  if (!reiniciado) {
    return {
      ok: false,
      error: "Ya hay al menos un colaborador emitido este mes -- no se puede reiniciar todo. Corrige el detalle puntual si hace falta.",
      codigo: "PLAN-REINICIAR-03",
    };
  }

  revalidatePath(`/rrhh/planilla/${idPlanillaMensual}`);
  revalidatePath("/rrhh/planilla");
  refresh();

  return { ok: true };
}

export async function eliminarDetalleAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  const idPlanillaMensual = Number(formData.get("idPlanillaMensual"));
  if (!idPlanillaDetalle) return;

  await eliminarDetalle(idPlanillaDetalle);

  if (idPlanillaMensual) revalidatePath(`/rrhh/planilla/${idPlanillaMensual}`);
  refresh();
}

// Los parametros legales son un ledger de solo insertar (nunca se edita
// una version existente) -- crear una version nueva es la unica forma de
// "corregir" una tasa. Tramos/fondos llegan como listas paralelas
// (multiples inputs con el mismo name, formData.getAll) desde el
// formulario de /rrhh/planilla/parametros.
export async function crearVersionParametrosAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const anio = Number(formData.get("anio"));
  const fechaVigenciaDesde = String(formData.get("fechaVigenciaDesde") ?? "").trim();
  const uit = Number(formData.get("uit"));
  const porcentajeOnp = Number(formData.get("porcentajeOnp"));
  const porcentajeEssalud = Number(formData.get("porcentajeEssalud"));
  const aporteObligatorioAfpPorcentaje = Number(formData.get("aporteObligatorioAfpPorcentaje"));
  const primaSeguroAfpPorcentaje = Number(formData.get("primaSeguroAfpPorcentaje"));
  const topeAsegurableAfp = Number(formData.get("topeAsegurableAfp"));
  const porcentajeRenta4ta = Number(formData.get("porcentajeRenta4ta"));
  const umbralRenta4ta = Number(formData.get("umbralRenta4ta"));
  const uitDeduccionRenta5ta = Number(formData.get("uitDeduccionRenta5ta"));

  if (!anio || !fechaVigenciaDesde || !uit) return;

  const { id_parametro: idParametro } = await crearParametro({
    anio,
    fechaVigenciaDesde,
    uit,
    porcentajeOnp,
    porcentajeEssalud,
    aporteObligatorioAfpPorcentaje,
    primaSeguroAfpPorcentaje,
    topeAsegurableAfp,
    porcentajeRenta4ta,
    umbralRenta4ta,
    uitDeduccionRenta5ta,
    idUsuarioCreacion: sesion.idUsuario,
  });

  const tramoDesde = formData.getAll("tramoDesdeUit").map(String);
  const tramoHasta = formData.getAll("tramoHastaUit").map(String);
  const tramoTasa = formData.getAll("tramoTasa").map(String);
  for (let i = 0; i < tramoDesde.length; i++) {
    const tasa = Number(tramoTasa[i]);
    if (!tasa) continue;
    await agregarTramoRenta5ta(idParametro, Number(tramoDesde[i]), tramoHasta[i] ? Number(tramoHasta[i]) : null, tasa, i + 1);
  }

  const afpFondoId = formData.getAll("afpFondoId").map(String);
  const afpFondoComision = formData.getAll("afpFondoComision").map(String);
  for (let i = 0; i < afpFondoId.length; i++) {
    const idAfpFondo = Number(afpFondoId[i]);
    const comision = Number(afpFondoComision[i]);
    if (!idAfpFondo || !comision) continue;
    await agregarComisionAfpFondo(idParametro, idAfpFondo, comision);
  }

  revalidatePath("/rrhh/planilla/parametros");
  refresh();
}

const TAMANO_MAX_ADJUNTO_BYTES = 15 * 1024 * 1024;
const TIPOS_ADJUNTO_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

// RxH firmado por el colaborador (Locador) -- RRHH lo sube desde el
// detalle, mismo patron de archivo que subirCompromisoFirmadoAction
// (prestamos). Solo tiene sentido para Locador -- no-op silencioso en
// Planilla.
export async function subirRxhFirmadoAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  const archivo = formData.get("archivo");
  if (!idPlanillaDetalle || !(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_ADJUNTO_BYTES) return;

  const extension = TIPOS_ADJUNTO_PERMITIDOS[archivo.type];
  if (!extension) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR") return;

  const rutaRelativa = `rrhh/planilla/rxh-firmado/${idPlanillaDetalle}.${extension}`;
  await guardarArchivo(rutaRelativa, new Uint8Array(await archivo.arrayBuffer()));
  await subirRxhFirmado(idPlanillaDetalle, rutaRelativa);

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  refresh();
}

// Evidencia de la transferencia/pago real al colaborador (Locador) --
// independiente de "marcar pagados los aportes" (eso es AFP/EsSalud a
// SUNAT). Mismo criterio que el RxH: solo aplica a Locador.
export async function subirEvidenciaPagoAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  const archivo = formData.get("archivo");
  if (!idPlanillaDetalle || !(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_ADJUNTO_BYTES) return;

  const extension = TIPOS_ADJUNTO_PERMITIDOS[archivo.type];
  if (!extension) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR") return;

  const rutaRelativa = `rrhh/planilla/evidencia-pago/${idPlanillaDetalle}.${extension}`;
  await guardarArchivo(rutaRelativa, new Uint8Array(await archivo.arrayBuffer()));
  await subirEvidenciaPago(idPlanillaDetalle, rutaRelativa);

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  refresh();
}

// El propio colaborador (Planilla) confirma que recibio su boleta --
// requireSession en vez de requirePermiso: no necesita acceso a
// RRHH_PLANILLA, solo ser el dueño del detalle (chequeado tambien en el
// SP). No-op silencioso si no es el suyo, si no esta EMITIDA, o si ya
// habia confirmado.
export async function confirmarRecepcionBoletaAction(formData: FormData): Promise<void> {
  const sesion = await requireSession();

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  if (!idPlanillaDetalle) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ID_USUARIO !== sesion.idUsuario) return;

  await confirmarRecepcionBoleta(idPlanillaDetalle, sesion.idUsuario);

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  refresh();
}

// Registra/renueva la suspension de Renta 4ta de un locador -- fecha y
// constancia (PDF/imagen de SUNAT) siempre juntos, ver SP_RRHH_EMPLEADO_
// SUSPENSION_4TA_ACTUALIZAR. Se llama desde el "lugar" central
// (/rrhh/planilla/suspension-4ta) y tambien, atajo directo, desde el
// detalle de un RxH puntual -- "origen" (opcional) es a que ruta volver
// despues de guardar, para que funcione desde ambos lugares.
export async function subirSuspension4taAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idUsuario = Number(formData.get("idUsuario"));
  const suspensionHasta = String(formData.get("suspensionHasta") ?? "").trim();
  const archivo = formData.get("archivo");
  const origen = String(formData.get("origen") ?? "").trim() || "/rrhh/planilla/suspension-4ta";

  if (!idUsuario || !suspensionHasta) return;
  if (!(archivo instanceof File) || archivo.size === 0) return;
  if (archivo.size > TAMANO_MAX_ADJUNTO_BYTES) return;

  const extension = TIPOS_ADJUNTO_PERMITIDOS[archivo.type];
  if (!extension) return;

  const sesion = await requireSession();
  const rutaRelativa = `rrhh/empleados/suspension-4ta/${idUsuario}.${extension}`;
  await guardarArchivo(rutaRelativa, new Uint8Array(await archivo.arrayBuffer()));
  await actualizarSuspension4ta(idUsuario, suspensionHasta, rutaRelativa, sesion.idUsuario);

  revalidatePath("/rrhh/planilla/suspension-4ta");
  revalidatePath(origen);
  refresh();
}

// "Pagar en la siguiente planilla": para un detalle que se quedo sin
// emitir (ej. un mes que ya se cerro para todos los demas) -- en vez de
// reabrir ese mes puntual, se borra este detalle y su monto bruto se
// suma automaticamente al periodo del mes siguiente del mismo contrato
// cuando ese mes se genere (ver asegurarPeriodoDelMes). Solo para
// contratos con periodo de pago (PLANILLA/LOCADOR con tarifa) -- no
// aplica a LOCADOR POR_HORA, ver guard en el SP.
export async function aplazarAlMesSiguienteAction(formData: FormData): Promise<void> {
  await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const idPlanillaDetalle = Number(formData.get("idPlanillaDetalle"));
  if (!idPlanillaDetalle) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle) return;

  const sesion = await requireSession();
  const mesSiguiente = detalle.MES === 12 ? 1 : detalle.MES + 1;
  const anioSiguiente = detalle.MES === 12 ? detalle.ANIO + 1 : detalle.ANIO;

  await aplazarDetalle(idPlanillaDetalle, anioSiguiente, mesSiguiente, sesion.idUsuario);

  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
  revalidatePath(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}/${idPlanillaDetalle}`);
  redirect(`/rrhh/planilla/${detalle.ID_PLANILLA_MENSUAL}`);
}
