"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermiso } from "@/lib/auth/require-permiso";
import {
  listarContratosElegibles,
  listarHorasDelPeriodo,
  obtenerAcumuladoAnio,
  obtenerOCrearPlanillaMensual,
  emitirPlanillaMensual as marcarPlanillaMensualEmitida,
  agregarDetalle,
  vincularHoras,
  listarDetalle,
  obtenerDetalle,
  actualizarMontosDetalle,
  marcarPagadoDetalle,
  marcarPagadoMasivo,
  emitirDetalle,
  eliminarDetalle,
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
import { generarPeriodosPendientes, etiquetaPeriodoMensual } from "@/lib/rrhh/periodos-pago";
import { generarBoletaPdf } from "@/lib/rrhh/planilla/generar-boleta-pdf";
import { generarReciboHonorariosPdf } from "@/lib/rrhh/planilla/generar-recibo-honorarios-pdf";
import { cargarLogoEmpresa } from "@/lib/rrhh/resolver-plantilla";
import { guardarArchivo } from "@/lib/storage/local-storage";
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
// generarPeriodosPendientes/agregarPeriodoPago (no reimplementa esa
// logica, ver src/lib/rrhh/periodos-pago.ts), con el mismo monto
// sugerido que ya usa generarPeriodosPendientesAction en rrhh.ts (suma
// de conceptos para planilla, TARIFA para locador de tarifa unica).
// null si el contrato aun no genera periodo este mes (ej. recien
// arranca el mes que viene).
async function asegurarPeriodoDelMes(
  contrato: PlanillaContratoElegibleRow,
  periodo: string,
  idUsuario: number,
): Promise<{ idPeriodoPago: number; monto: number } | null> {
  const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const periodosActuales = await listarPeriodosPago(contrato.ID_CONTRATO);
  const buscado = periodo.trim().toUpperCase();
  const existente = periodosActuales.find((p) => p.PERIODO.trim().toUpperCase() === buscado);
  if (existente) return { idPeriodoPago: existente.ID_PERIODO_PAGO, monto: Number(existente.MONTO) };

  const pendientes = generarPeriodosPendientes(
    contrato.FECHA_INICIO,
    contrato.FECHA_FIN,
    periodosActuales.map((p) => p.PERIODO),
  );
  if (!pendientes.some((p) => p.trim().toUpperCase() === buscado)) return null;

  const conceptos = esPlanilla ? await listarConceptosContrato(contrato.ID_CONTRATO) : [];
  const montoSugerido = esPlanilla ? conceptos.reduce((suma, c) => suma + Number(c.MONTO), 0) : Number(contrato.TARIFA ?? 0);
  if (!montoSugerido) return null;

  for (const etiqueta of pendientes) {
    await agregarPeriodoPago(contrato.ID_CONTRATO, etiqueta, montoSugerido, idUsuario);
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
  idUsuario: number,
): Promise<void> {
  const periodoInfo = await asegurarPeriodoDelMes(contrato, periodo, idUsuario);
  if (!periodoInfo) return;

  const esPlanilla = contrato.TIPO_CONTRATO_CODIGO !== "LOCADOR";

  if (esPlanilla) {
    const acumulado = await obtenerAcumuladoAnio(contrato.ID_CONTRATO, anio, mes);
    const resultado = calcularBoletaPlanilla({
      remuneracionBruta: periodoInfo.monto,
      sistemaPension: contrato.SISTEMA_PENSION_CODIGO,
      afpFondoCodigo: contrato.AFP_FONDO_CODIGO,
      mesesRestantesIncluyendoActual: 13 - mes,
      brutoAcumuladoMesesAnterioresDelAnio: Number(acumulado.BRUTO_ACUMULADO),
      retencionesAcumuladasAnioActual: Number(acumulado.RETENCION_ACUMULADA),
      parametros,
    });

    await agregarDetalle({
      idPlanillaMensual,
      idContrato: contrato.ID_CONTRATO,
      tipoReferencia: "RRHH_CONTRATO_PERIODO_PAGO",
      idReferencia: periodoInfo.idPeriodoPago,
      montoBruto: resultado.bruto,
      montoAportePension: resultado.aportePension,
      montoRetencionRenta: resultado.retencionRenta,
      montoEssalud: resultado.essalud,
      montoNeto: resultado.neto,
      idSistemaPensionAplicado: contrato.ID_SISTEMA_PENSION,
      idAfpFondoAplicado: contrato.ID_AFP_FONDO,
      idParametroAplicado: parametros.idParametro,
      idUsuarioCreacion: idUsuario,
    });
    return;
  }

  const tieneSuspension = Boolean(contrato.SUSPENSION_RETENCION_4TA_HASTA && contrato.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
  const resultado = calcularRxH({ montoRecibo: periodoInfo.monto, tieneSuspension, parametros });

  await agregarDetalle({
    idPlanillaMensual,
    idContrato: contrato.ID_CONTRATO,
    tipoReferencia: "RRHH_CONTRATO_PERIODO_PAGO",
    idReferencia: periodoInfo.idPeriodoPago,
    montoBruto: resultado.bruto,
    montoAportePension: null,
    montoRetencionRenta: resultado.retencionRenta,
    montoEssalud: null,
    montoNeto: resultado.neto,
    idSistemaPensionAplicado: null,
    idAfpFondoAplicado: null,
    idParametroAplicado: parametros.idParametro,
    idUsuarioCreacion: idUsuario,
  });
}

// LOCADOR POR_HORA: junta las horas del mes que compartan moneda. Si hay
// mas de una moneda, se deja fuera (queda "requiere generacion manual"
// en la UI, ver RRHH_PLANILLA_DETALLE_HORAS en el plan).
async function procesarLocadorPorHora(
  idPlanillaMensual: number,
  contrato: PlanillaContratoElegibleRow,
  periodo: string,
  parametros: ParametrosPlanillaVigentes,
  idUsuario: number,
): Promise<void> {
  const horas = await listarHorasDelPeriodo(contrato.ID_CONTRATO, periodo);
  if (horas.length === 0) return;

  const monedas = new Set(horas.map((h) => h.MONEDA_CODIGO));
  if (monedas.size > 1) return;

  const bruto = horas.reduce((suma, h) => suma + Number(h.MONTO_CALCULADO), 0);
  if (!bruto) return;

  const tieneSuspension = Boolean(contrato.SUSPENSION_RETENCION_4TA_HASTA && contrato.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
  const resultado = calcularRxH({ montoRecibo: bruto, tieneSuspension, parametros });

  const { id_planilla_detalle: idPlanillaDetalle } = await agregarDetalle({
    idPlanillaMensual,
    idContrato: contrato.ID_CONTRATO,
    tipoReferencia: null,
    idReferencia: null,
    montoBruto: resultado.bruto,
    montoAportePension: null,
    montoRetencionRenta: resultado.retencionRenta,
    montoEssalud: null,
    montoNeto: resultado.neto,
    idSistemaPensionAplicado: null,
    idAfpFondoAplicado: null,
    idParametroAplicado: parametros.idParametro,
    idUsuarioCreacion: idUsuario,
  });

  if (idPlanillaDetalle) {
    for (const h of horas) {
      await vincularHoras(idPlanillaDetalle, h.ID_CONTRATO_HORAS);
    }
  }
}

// Un solo click genera toda la planilla del mes: por cada contrato
// FIRMADO vigente ese mes que todavia no tenga fila en esta planilla,
// calcula su bruto/descuentos/neto y los persiste como PENDIENTE (ver
// SP_RRHH_PLANILLA_DETALLE_AGREGAR, no-op si ya existia -- reintentar es
// seguro). Si todavia no hay ninguna version de parametros cargada
// (base de datos sin el seed 036), solo crea el header vacio -- la
// pantalla debe avisar que falta configurar /rrhh/planilla/parametros.
export async function generarPlanillaMensualAction(formData: FormData): Promise<void> {
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ESCRITURA");

  const hoy = new Date();
  const anio = Number(formData.get("anio")) || hoy.getFullYear();
  const mes = Number(formData.get("mes")) || hoy.getMonth() + 1;
  const periodo = etiquetaPeriodoMensual(anio, mes - 1);

  const { id_planilla_mensual: idPlanillaMensual } = await obtenerOCrearPlanillaMensual(anio, mes, periodo, sesion.idUsuario);

  const parametros = await obtenerParametrosVigentes();
  if (parametros) {
    const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const finMes = new Date(anio, mes, 0).toISOString().slice(0, 10);

    const [contratos, detalleExistente] = await Promise.all([listarContratosElegibles(), listarDetalle(idPlanillaMensual)]);
    const yaProcesados = new Set(detalleExistente.map((d) => d.ID_CONTRATO));

    for (const contrato of contratos) {
      if (yaProcesados.has(contrato.ID_CONTRATO)) continue;
      if (!esVigenteEnMes(contrato, inicioMes, finMes)) continue;

      if (contrato.TIPO_CONTRATO_CODIGO === "LOCADOR" && contrato.TIPO_PAGO_LOCADOR_CODIGO === "POR_HORA") {
        await procesarLocadorPorHora(idPlanillaMensual, contrato, periodo, parametros, sesion.idUsuario);
      } else {
        await procesarPeriodoRegular(idPlanillaMensual, contrato, periodo, anio, mes, parametros, sesion.idUsuario);
      }
    }
  }

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

  if (esPlanilla) {
    const acumulado = await obtenerAcumuladoAnio(detalle.ID_CONTRATO, detalle.ANIO, detalle.MES);
    const resultado = calcularBoletaPlanilla({
      remuneracionBruta: bruto,
      sistemaPension: detalle.SISTEMA_PENSION_CODIGO,
      afpFondoCodigo: detalle.AFP_FONDO_CODIGO,
      mesesRestantesIncluyendoActual: 13 - detalle.MES,
      brutoAcumuladoMesesAnterioresDelAnio: Number(acumulado.BRUTO_ACUMULADO),
      retencionesAcumuladasAnioActual: Number(acumulado.RETENCION_ACUMULADA),
      parametros,
    });
    await actualizarMontosDetalle({
      idPlanillaDetalle,
      montoBruto: resultado.bruto,
      montoAportePension: resultado.aportePension,
      montoRetencionRenta: resultado.retencionRenta,
      montoEssalud: resultado.essalud,
      montoNeto: resultado.neto,
      calculoAutomatico: true,
    });
  } else {
    const tieneSuspension = Boolean(detalle.SUSPENSION_RETENCION_4TA_HASTA && detalle.SUSPENSION_RETENCION_4TA_HASTA >= hoyIso());
    const resultado = calcularRxH({ montoRecibo: bruto, tieneSuspension, parametros });
    await actualizarMontosDetalle({
      idPlanillaDetalle,
      montoBruto: resultado.bruto,
      montoAportePension: null,
      montoRetencionRenta: resultado.retencionRenta,
      montoEssalud: null,
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
  const aportePension = aportePensionRaw ? Number(aportePensionRaw) : null;
  const retencionRenta = retencionRentaRaw ? Number(retencionRentaRaw) : null;
  const essalud = essaludRaw ? Number(essaludRaw) : null;

  if (!idPlanillaDetalle || !bruto) return;

  const detalle = await obtenerDetalle(idPlanillaDetalle);
  if (!detalle || detalle.ESTADO_EMISION_CODIGO === "EMITIDA") return;

  const neto = bruto - (aportePension ?? 0) - (retencionRenta ?? 0);

  await actualizarMontosDetalle({
    idPlanillaDetalle,
    montoBruto: bruto,
    montoAportePension: aportePension,
    montoRetencionRenta: retencionRenta,
    montoEssalud: essalud,
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

// Genera el PDF (boleta o RxH segun regimen), lo guarda, y recien
// entonces marca el detalle como EMITIDA -- mismo orden que la firma de
// contratos (primero el archivo, despues persistir la ruta).
async function emitirDetalleInterno(detalle: PlanillaDetalleRow, idUsuario: number): Promise<void> {
  if (detalle.ESTADO_EMISION_CODIGO === "EMITIDA") return;

  const esPlanilla = detalle.TIPO_CONTRATO_CODIGO !== "LOCADOR";
  const logo = await cargarLogoEmpresa();

  let bytes: Uint8Array;
  let carpeta: string;

  if (esPlanilla) {
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
      bruto: Number(detalle.MONTO_BRUTO),
      aportePension: Number(detalle.MONTO_APORTE_PENSION ?? 0),
      retencionRenta: Number(detalle.MONTO_RETENCION_RENTA ?? 0),
      essalud: Number(detalle.MONTO_ESSALUD ?? 0),
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
      neto: Number(detalle.MONTO_NETO),
      logoBytes: logo.logoBytes,
      logoFormato: logo.logoFormato,
    });
    carpeta = "recibos-honorarios";
  }

  const documentoPath = `rrhh/planilla/${carpeta}/${detalle.ID_PLANILLA_DETALLE}.pdf`;
  await guardarArchivo(documentoPath, bytes);
  await emitirDetalle(detalle.ID_PLANILLA_DETALLE, documentoPath, idUsuario);
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
  const sesion = await requirePermiso(PLANILLA_APP_CODIGO, "ADMIN");

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
